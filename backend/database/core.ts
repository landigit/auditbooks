import { getDbError, NotFoundError, ValueError } from 'fyo/utils/errors';
import Database from 'libsql';
import {
  drizzle,
  type BetterSQLite3Database,
} from 'drizzle-orm/better-sqlite3';

export class LibsqlClient {
  db: InstanceType<typeof Database>;

  constructor(dbPath: string) {
    const rawDb = new Database(dbPath);
    const originalPrepare = rawDb.prepare;
    rawDb.prepare = function (this: any, sql: string): any {
      const stmt = (originalPrepare as any).call(this, sql);
      const originalRun = stmt.run;
      const originalGet = stmt.get;
      const originalAll = stmt.all;
      const originalIterate = stmt.iterate;

      const cleanParams = (params: any[]) => {
        return params.map((p) => {
          if (typeof p === 'boolean') {
            return p ? 1 : 0;
          }
          if (p && typeof p === 'object' && !Array.isArray(p)) {
            const cleaned: any = {};
            for (const [k, v] of Object.entries(p)) {
              cleaned[k] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
            }
            return cleaned;
          }
          return p;
        });
      };

      stmt.run = function (...params: any[]) {
        return originalRun.apply(this, cleanParams(params));
      };
      stmt.get = function (...params: any[]) {
        return originalGet.apply(this, cleanParams(params));
      };
      stmt.all = function (...params: any[]) {
        return originalAll.apply(this, cleanParams(params));
      };
      stmt.iterate = function (...params: any[]) {
        return originalIterate.apply(this, cleanParams(params));
      };

      return stmt;
    } as any;
    this.db = rawDb;
  }

  async execute(
    stmt: string | { sql: string; args?: any[] }
  ): Promise<{ rows: any[]; rowsAffected: number }> {
    let sql: string;
    let args: any[] = [];
    if (typeof stmt === 'string') {
      sql = stmt;
    } else {
      sql = stmt.sql;
      args = stmt.args ?? [];
    }

    const query = this.db.prepare(sql);
    try {
      const trimmed = sql.trim().toLowerCase();
      const isSelectOrPragma =
        trimmed.startsWith('select') ||
        trimmed.startsWith('pragma') ||
        trimmed.startsWith('show') ||
        trimmed.startsWith('explain');
      if (isSelectOrPragma) {
        const rows = query.all(...args);
        return { rows, rowsAffected: 0 };
      } else {
        const res = query.run(...args);
        return { rows: [], rowsAffected: res.changes };
      }
    } finally {
      if (typeof (query as any).finalize === 'function') {
        (query as any).finalize();
      }
    }
  }

  close() {
    this.db.close();
  }
}
import * as schemaExports from '../../drizzle/db/schema';
import * as relationsExports from '../../drizzle/db/relations';
import {
  Field,
  FieldTypeEnum,
  RawValue,
  Schema,
  SchemaMap,
  TargetField,
} from '../../schemas/types';
import {
  getIsNullOrUndef,
  getRandomString,
  getValueMapFromList,
} from '../../utils';
import { DatabaseBase, GetAllOptions, QueryFilter } from '../../utils/db/types';
import { getDefaultMetaFieldValueMap, sqliteTypeMap, SYSTEM } from '../helpers';
import {
  AlterConfig,
  ColumnDiff,
  FieldValueMap,
  MigrationConfig,
  NonExtantConfig,
  SingleValue,
  UpdateSinglesConfig,
} from './types';

/**
 * # DatabaseCore
 * This is the Drizzle-based ORM. The DatabaseCore interface (function signatures) is
 * replicated by the frontend demuxes and all the backend muxes.
 *
 * ## Db Core Call Sequence
 *
 * 1. Init core: `const db = new DatabaseCore(dbPath)`.
 * 2. Connect db: `db.connect()`. This will allow for raw queries to be executed.
 * 3. Set schemas: `db.setSchemaMap(schemaMap)`. This will allow for ORM functions to be executed.
 * 4. Migrate: `await db.migrate()`. This will create absent tables and update the tables' shape.
 * 5. ORM function execution: `db.get(...)`, `db.insert(...)`, etc.
 * 6. Close connection: `await db.close()`.
 */

export default class DatabaseCore extends DatabaseBase {
  client?: LibsqlClient;
  drizzleDb?: BetterSQLite3Database<any>;
  typeMap = sqliteTypeMap;
  dbPath: string;
  schemaMap: SchemaMap = {};

  constructor(dbPath?: string) {
    super();
    this.dbPath = dbPath ?? ':memory:';
  }

  static async getCountryCode(dbPath: string): Promise<string> {
    let countryCode = 'in';
    const db = new DatabaseCore(dbPath);
    await db.connect();

    let query: { value: string }[] = [];
    try {
      const res = await db.client!.execute({
        sql: `SELECT value FROM "SingleValue" WHERE fieldname = 'countryCode' AND parent = 'SystemSettings' LIMIT 1`,
        args: [],
      });
      query = res.rows;
    } catch {
      // Database not initialized and no countryCode passed
    }

    if (query.length > 0) {
      countryCode = query[0].value;
    }

    // Commented out db.close() to prevent closing connection globally for this file path
    // await db.close();
    return countryCode;
  }

  setSchemaMap(schemaMap: SchemaMap) {
    this.schemaMap = schemaMap;
  }

  async connect() {
    this.client = new LibsqlClient(this.dbPath);
    this.drizzleDb = drizzle(this.client.db, {
      schema: { ...schemaExports, ...relationsExports },
    });
    await this.client.execute('PRAGMA foreign_keys=ON');
    if (this.dbPath !== ':memory:') {
      try {
        await this.client.execute('PRAGMA journal_mode=WAL');
        await this.client.execute('PRAGMA synchronous=NORMAL');
      } catch (err) {
        console.error('Failed to configure SQLite optimization pragmas:', err);
      }
    }
  }

  async close() {
    if (this.client) {
      this.client.close();
    }
  }

  async migrate(config: MigrationConfig = {}) {
    const { create, alter } = await this.#getCreateAlterList();
    const hasSingleValueTable = !create.includes('SingleValue');
    let singlesConfig: UpdateSinglesConfig = {
      update: [],
      updateNonExtant: [],
    };

    if (hasSingleValueTable) {
      singlesConfig = await this.#getSinglesUpdateList();
    }

    const shouldMigrate = !!(
      create.length ||
      alter.length ||
      singlesConfig.update.length ||
      singlesConfig.updateNonExtant.length
    );

    if (!shouldMigrate) {
      return;
    }

    await config.pre?.();
    for (const schemaName of create) {
      await this.#createTable(schemaName);
    }

    for (const config of alter) {
      await this.#alterTable(config);
    }

    if (!hasSingleValueTable) {
      singlesConfig = await this.#getSinglesUpdateList();
    }

    await this.#initializeSingles(singlesConfig);
    await config.post?.();
  }

  async #getCreateAlterList() {
    const create: string[] = [];
    const alter: AlterConfig[] = [];

    for (const [schemaName, schema] of Object.entries(this.schemaMap)) {
      if (!schema || schema.isSingle) {
        continue;
      }

      const exists = await this.#tableExists(schemaName);
      if (!exists) {
        create.push(schemaName);
        continue;
      }

      const diff: ColumnDiff = await this.#getColumnDiff(schemaName);
      const newForeignKeys: Field[] = await this.#getNewForeignKeys(schemaName);
      if (diff.added.length || diff.removed.length || newForeignKeys.length) {
        alter.push({
          schemaName,
          diff,
          newForeignKeys,
        });
      }
    }

    return { create, alter };
  }

  async exists(schemaName: string, name?: string): Promise<boolean> {
    const schema = Reflect.get(this.schemaMap, schemaName) as Schema;
    if (schema.isSingle) {
      return this.#singleExists(schemaName);
    }

    let rows: any[] = [];
    try {
      let sql = `SELECT name FROM "${schemaName}"`;
      const args: any[] = [];
      if (name !== undefined) {
        sql += ` WHERE "name" = ?`;
        args.push(name);
      }
      sql += ` LIMIT 1`;
      const res = await this.client!.execute({ sql, args });
      rows = res.rows;
    } catch (err) {
      if (getDbError(err as Error) !== NotFoundError) {
        throw err;
      }
    }
    return rows.length > 0;
  }

  async insert(
    schemaName: string,
    fieldValueMap: FieldValueMap
  ): Promise<FieldValueMap> {
    // insert parent
    if (Reflect.get(this.schemaMap, schemaName)!.isSingle) {
      await this.#updateSingleValues(schemaName, fieldValueMap);
    } else {
      await this.#insertOne(schemaName, fieldValueMap);
    }

    // insert children
    await this.#insertOrUpdateChildren(schemaName, fieldValueMap, false);
    return fieldValueMap;
  }

  async get(
    schemaName: string,
    name = '',
    fields?: string | string[]
  ): Promise<FieldValueMap> {
    const schema = Reflect.get(this.schemaMap, schemaName) as Schema;
    if (!schema.isSingle && !name) {
      throw new ValueError('name is mandatory');
    }

    let fieldValueMap: FieldValueMap = {};
    if (schema.isSingle) {
      return await this.#getSingle(schemaName);
    }

    if (typeof fields === 'string') {
      fields = [fields];
    }

    if (fields === undefined || fields === null) {
      fields = schema.fields.filter((f) => !f.computed).map((f) => f.fieldname);
    }

    const allTableFields: TargetField[] = this.#getTableFields(schemaName);
    const allTableFieldNames: string[] = allTableFields.map((f) => f.fieldname);
    const tableFields: TargetField[] = allTableFields.filter((f) =>
      fields.includes(f.fieldname)
    );
    const nonTableFieldNames: string[] = fields.filter(
      (f) => !allTableFieldNames.includes(f)
    );

    if (nonTableFieldNames.length) {
      fieldValueMap =
        (await this.#getOne(schemaName, name, nonTableFieldNames)) ?? {};
    }

    if (tableFields.length) {
      await this.#loadChildren(name, fieldValueMap, tableFields);
    }
    return fieldValueMap;
  }

  async getAll(
    schemaName: string,
    options: GetAllOptions = {}
  ): Promise<FieldValueMap[]> {
    const schema = Reflect.get(this.schemaMap, schemaName) as Schema;
    if (schema === undefined) {
      throw new NotFoundError(`schema ${schemaName} not found`);
    }

    const hasCreated = !!schema.fields.find((f) => f.fieldname === 'created');

    const {
      fields = ['name'],
      filters,
      offset,
      limit,
      groupBy,
      orderBy = hasCreated ? 'created' : undefined,
      order = 'desc',
    } = options;

    const selectCols = typeof fields === 'string' ? [fields] : fields;
    const selectStr =
      selectCols.length === 0
        ? '*'
        : selectCols.includes('*')
          ? '*'
          : selectCols.map((c) => `"${c}"`).join(', ');

    let sqlStr = `SELECT ${selectStr} FROM "${schemaName}"`;
    const args: any[] = [];

    if (filters && Object.keys(filters).length > 0) {
      const filtersArray = this.#getFiltersArray(filters);
      const conditions: string[] = [];

      for (const [field, operator, val] of filtersArray) {
        if (operator === 'in' || operator === 'not in') {
          const valArray = Array.isArray(val) ? val : [val];
          const hasNull = valArray.includes(null);
          const nonNulls = valArray.filter((v) => v !== null);
          const sqlOp = operator.toUpperCase(); // "IN" or "NOT IN"

          if (nonNulls.length > 0) {
            const placeholders = nonNulls.map(() => '?').join(', ');
            if (hasNull) {
              if (sqlOp === 'IN') {
                conditions.push(
                  `("${field}" IN (${placeholders}) OR "${field}" IS NULL)`
                );
              } else {
                conditions.push(
                  `("${field}" NOT IN (${placeholders}) AND "${field}" IS NOT NULL)`
                );
              }
            } else {
              conditions.push(`"${field}" ${sqlOp} (${placeholders})`);
            }
            args.push(...nonNulls);
          } else if (hasNull) {
            if (sqlOp === 'IN') {
              conditions.push(`"${field}" IS NULL`);
            } else {
              conditions.push(`"${field}" IS NOT NULL`);
            }
          }
        } else if (val === null && (operator === '=' || operator === 'is')) {
          conditions.push(`"${field}" IS NULL`);
        } else if (
          val === null &&
          (operator === '!=' || operator === 'is not')
        ) {
          conditions.push(`"${field}" IS NOT NULL`);
        } else {
          conditions.push(`"${field}" ${operator} ?`);
          args.push(val);
        }
      }

      if (conditions.length > 0) {
        sqlStr += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    if (groupBy) {
      const groupByCols = Array.isArray(groupBy) ? groupBy : [groupBy];
      sqlStr += ` GROUP BY ${groupByCols.map((c) => `"${c}"`).join(', ')}`;
    }

    if (orderBy) {
      const orderByCols = Array.isArray(orderBy) ? orderBy : [orderBy];
      sqlStr += ` ORDER BY ${orderByCols.map((c) => `"${c}"`).join(', ')} ${order.toUpperCase()}`;
    }

    if (limit !== undefined) {
      sqlStr += ` LIMIT ?`;
      args.push(limit);
    }
    if (offset !== undefined) {
      sqlStr += ` OFFSET ?`;
      args.push(offset);
    }

    const res = await this.client!.execute({ sql: sqlStr, args });
    return res.rows as FieldValueMap[];
  }

  async deleteAll(schemaName: string, filters: QueryFilter): Promise<number> {
    let sqlStr = `DELETE FROM "${schemaName}"`;
    const args: any[] = [];

    if (filters && Object.keys(filters).length > 0) {
      const filtersArray = this.#getFiltersArray(filters);
      const conditions: string[] = [];

      for (const [field, operator, val] of filtersArray) {
        if (operator === 'in' || operator === 'not in') {
          const valArray = Array.isArray(val) ? val : [val];
          const hasNull = valArray.includes(null);
          const nonNulls = valArray.filter((v) => v !== null);
          const sqlOp = operator.toUpperCase(); // "IN" or "NOT IN"

          if (nonNulls.length > 0) {
            const placeholders = nonNulls.map(() => '?').join(', ');
            if (hasNull) {
              if (sqlOp === 'IN') {
                conditions.push(
                  `("${field}" IN (${placeholders}) OR "${field}" IS NULL)`
                );
              } else {
                conditions.push(
                  `("${field}" NOT IN (${placeholders}) AND "${field}" IS NOT NULL)`
                );
              }
            } else {
              conditions.push(`"${field}" ${sqlOp} (${placeholders})`);
            }
            args.push(...nonNulls);
          } else if (hasNull) {
            if (sqlOp === 'IN') {
              conditions.push(`"${field}" IS NULL`);
            } else {
              conditions.push(`"${field}" IS NOT NULL`);
            }
          }
        } else if (val === null && (operator === '=' || operator === 'is')) {
          conditions.push(`"${field}" IS NULL`);
        } else if (
          val === null &&
          (operator === '!=' || operator === 'is not')
        ) {
          conditions.push(`"${field}" IS NOT NULL`);
        } else {
          conditions.push(`"${field}" ${operator} ?`);
          args.push(val);
        }
      }

      if (conditions.length > 0) {
        sqlStr += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const res = await this.client!.execute({ sql: sqlStr, args });
    return res.rowsAffected;
  }

  async getSingleValues(
    ...fieldnames: ({ fieldname: string; parent?: string } | string)[]
  ): Promise<SingleValue<RawValue>> {
    const fieldnameList = fieldnames.map((fieldname) => {
      if (typeof fieldname === 'string') {
        return { fieldname };
      }
      return fieldname;
    });

    let sqlStr = `SELECT fieldname, value, parent FROM "SingleValue" WHERE `;
    const conditions: string[] = [];
    const args: any[] = [];

    fieldnameList.forEach(({ fieldname, parent }) => {
      if (typeof parent === 'undefined') {
        conditions.push(`"fieldname" = ?`);
        args.push(fieldname);
      } else {
        conditions.push(`("fieldname" = ? AND "parent" = ?)`);
        args.push(fieldname, parent);
      }
    });

    sqlStr += conditions.join(' OR ');

    try {
      const res = await this.client!.execute({ sql: sqlStr, args });
      return res.rows;
    } catch (err) {
      return [];
    }
  }

  async rename(schemaName: string, oldName: string, newName: string) {
    await this.client!.execute({
      sql: `UPDATE "${schemaName}" SET "name" = ? WHERE "name" = ?`,
      args: [newName, oldName],
    });
  }

  async update(schemaName: string, fieldValueMap: FieldValueMap) {
    // update parent
    if (Reflect.get(this.schemaMap, schemaName)!.isSingle) {
      await this.#updateSingleValues(schemaName, fieldValueMap);
    } else {
      await this.#updateOne(schemaName, fieldValueMap);
    }

    // insert or update children
    await this.#insertOrUpdateChildren(schemaName, fieldValueMap, true);
  }

  async delete(schemaName: string, name: string) {
    const schema = Reflect.get(this.schemaMap, schemaName) as Schema;
    if (schema.isSingle) {
      await this.#deleteSingle(schemaName, name);
      return;
    }

    await this.#deleteOne(schemaName, name);

    // delete children
    const tableFields = this.#getTableFields(schemaName);

    for (const field of tableFields) {
      await this.#deleteChildren(field.target, name);
    }
  }

  async #tableExists(schemaName: string): Promise<boolean> {
    const res = await this.client!.execute({
      sql: "select count(*) as count from sqlite_master where type='table' and name=?",
      args: [schemaName],
    });
    return Number(res.rows[0]?.count) > 0;
  }

  async #singleExists(singleSchemaName: string): Promise<boolean> {
    const res = await this.client!.execute({
      sql: `SELECT count("parent") as "count" FROM "SingleValue" WHERE "parent" = ? LIMIT 1`,
      args: [singleSchemaName],
    });
    const count = Number(res.rows[0]?.count);
    return count > 0;
  }

  async #dropColumns(schemaName: string, targetColumns: string[]) {
    for (const col of targetColumns) {
      await this.client!.execute(
        `ALTER TABLE "${schemaName}" DROP COLUMN "${col}"`
      );
    }
  }

  async prestigeTheTable(schemaName: string, tableRows: FieldValueMap[]) {
    const tempName = `__${schemaName}`;

    await this.client!.execute(`DROP TABLE IF EXISTS "${tempName}"`);
    await this.client!.execute('PRAGMA foreign_keys=OFF');
    await this.#createTable(schemaName, tempName);

    if (tableRows.length > 0) {
      for (const row of tableRows) {
        const columns = Object.keys(row)
          .map((c) => `"${c}"`)
          .join(', ');
        const placeholders = Object.keys(row)
          .map(() => '?')
          .join(', ');
        const args = Object.values(row);

        await this.client!.execute({
          sql: `INSERT INTO "${tempName}" (${columns}) VALUES (${placeholders})`,
          args: args as any[],
        });
      }
    }

    await this.client!.execute(`DROP TABLE "${schemaName}"`);
    await this.client!.execute(
      `ALTER TABLE "${tempName}" RENAME TO "${schemaName}"`
    );
    await this.client!.execute('PRAGMA foreign_keys=ON');
  }

  async #getTableColumns(schemaName: string): Promise<string[]> {
    try {
      const res = await this.client!.execute(
        `PRAGMA table_info("${schemaName}")`
      );
      return res.rows.map((row: any) => row.name as string);
    } catch {
      return [];
    }
  }

  async truncate(tableNames?: string[]) {
    if (tableNames === undefined) {
      const res = await this.client!.execute(`
        select name from sqlite_schema
        where type='table'
        and name not like 'sqlite_%'`);
      tableNames = res.rows.map((row: any) => row.name as string);
    }

    if (!tableNames) return;

    for (const name of tableNames) {
      await this.client!.execute(`DELETE FROM "${name}"`);
    }
  }

  async #getForeignKeys(schemaName: string): Promise<string[]> {
    try {
      const res = await this.client!.execute(
        `PRAGMA foreign_key_list("${schemaName}")`
      );
      return res.rows.map((row: any) => row.from as string);
    } catch {
      return [];
    }
  }

  #getFiltersArray(filters: QueryFilter) {
    const filtersArray = [];
    for (const field in filters) {
      const value = Reflect.get(filters, field);

      let operator: string | number = '=';
      let comparisonValue = value as string | number | (string | number)[];

      if (Array.isArray(value)) {
        operator = (value[0] as string).toLowerCase();
        comparisonValue = value[1] as string | number | (string | number)[];

        if (operator === 'includes') {
          operator = 'like';
        }

        if (
          operator === 'like' &&
          typeof comparisonValue === 'string' &&
          !comparisonValue.includes('%')
        ) {
          comparisonValue = `%${comparisonValue}%`;
        }
      }

      filtersArray.push([field, operator, comparisonValue]);

      if (Array.isArray(value) && value.length > 2) {
        const operator = value[2];
        const comparisonValue = value[3];
        filtersArray.push([field, operator, comparisonValue]);
      }
    }

    return filtersArray;
  }

  async #getColumnDiff(schemaName: string): Promise<ColumnDiff> {
    const tableColumns = await this.#getTableColumns(schemaName);
    const validFields = Reflect.get(this.schemaMap, schemaName)!.fields.filter(
      (f) => !f.computed
    );
    const diff: ColumnDiff = { added: [], removed: [] };

    for (const field of validFields) {
      const hasDbType = this.typeMap.hasOwnProperty(field.fieldtype);
      if (!tableColumns.includes(field.fieldname) && hasDbType) {
        diff.added.push(field);
      }
    }

    const validFieldNames = validFields.map((field) => field.fieldname);
    for (const column of tableColumns) {
      if (!validFieldNames.includes(column)) {
        diff.removed.push(column);
      }
    }

    return diff;
  }

  async #getNewForeignKeys(schemaName: string): Promise<Field[]> {
    const foreignKeys = await this.#getForeignKeys(schemaName);
    const newForeignKeys: Field[] = [];
    const schema = Reflect.get(this.schemaMap, schemaName) as Schema;
    for (const field of schema.fields) {
      if (
        field.fieldtype === 'Link' &&
        !foreignKeys.includes(field.fieldname)
      ) {
        newForeignKeys.push(field);
      }
    }
    return newForeignKeys;
  }

  #buildColumnForTable(
    columnDefs: string[],
    foreignKeys: string[],
    field: Field
  ) {
    if (field.fieldtype === FieldTypeEnum.Table) {
      return;
    }

    const columnType = Reflect.get(this.typeMap, field.fieldtype);
    if (!columnType) {
      return;
    }

    let sqliteType = 'TEXT';
    if (columnType === 'integer') {
      sqliteType = 'INTEGER';
    } else if (columnType === 'float') {
      sqliteType = 'REAL';
    } else if (columnType === 'boolean') {
      sqliteType = 'INTEGER';
    }

    let def = `"${field.fieldname}" ${sqliteType}`;

    if (field.fieldname === 'name') {
      def += ' PRIMARY KEY NOT NULL';
    } else {
      if (field.required) {
        def += ' NOT NULL';
      }
      if (field.default !== undefined) {
        const defaultValue =
          typeof field.default === 'string'
            ? `'${field.default.replace(/'/g, "''")}'`
            : field.default;
        def += ` DEFAULT ${defaultValue}`;
      }
    }

    columnDefs.push(def);

    if (field.fieldtype === FieldTypeEnum.Link && field.target) {
      const targetSchemaName = field.target;
      const schema = this.schemaMap[targetSchemaName] as Schema;
      if (schema) {
        foreignKeys.push(
          `FOREIGN KEY ("${field.fieldname}") REFERENCES "${schema.name}"("name") ON UPDATE CASCADE ON DELETE RESTRICT`
        );
      }
    }
  }

  async #alterTable({ schemaName, diff, newForeignKeys }: AlterConfig) {
    if (diff.added.length) {
      for (const field of diff.added) {
        const columnType = Reflect.get(this.typeMap, field.fieldtype);
        if (!columnType) continue;

        let sqliteType = 'TEXT';
        if (columnType === 'integer') {
          sqliteType = 'INTEGER';
        } else if (columnType === 'float') {
          sqliteType = 'REAL';
        } else if (columnType === 'boolean') {
          sqliteType = 'INTEGER';
        }

        let def = `ALTER TABLE "${schemaName}" ADD COLUMN "${field.fieldname}" ${sqliteType}`;
        if (field.required) {
          def += ' NOT NULL';
        }
        if (field.default !== undefined) {
          const defaultValue =
            typeof field.default === 'string'
              ? `'${field.default.replace(/'/g, "''")}'`
              : field.default;
          def += ` DEFAULT ${defaultValue}`;
        }

        await this.client!.execute(def);
      }
    }

    if (diff.removed.length) {
      await this.#dropColumns(schemaName, diff.removed);
    }

    if (newForeignKeys.length) {
      await this.#addForeignKeys(schemaName);
    }
  }

  async #createTable(schemaName: string, tableName?: string) {
    tableName ??= schemaName;
    const fields = Reflect.get(this.schemaMap, schemaName)!.fields.filter(
      (f) => !f.computed
    );
    return await this.#runCreateTableQuery(tableName, fields);
  }

  #runCreateTableQuery(schemaName: string, fields: Field[]) {
    const columnDefs: string[] = [];
    const foreignKeys: string[] = [];

    for (const field of fields) {
      this.#buildColumnForTable(columnDefs, foreignKeys, field);
    }

    const sql = `CREATE TABLE "${schemaName}" (\n  ${[...columnDefs, ...foreignKeys].join(',\n  ')}\n)`;
    return this.client!.execute(sql);
  }

  async #getNonExtantSingleValues(singleSchemaName: string) {
    const res = await this.client!.execute({
      sql: `SELECT "fieldname" FROM "SingleValue" WHERE "parent" = ?`,
      args: [singleSchemaName],
    });
    const existingFields = res.rows.map((row: any) => row.fieldname as string);

    const nonExtant: NonExtantConfig['nonExtant'] = [];
    const fields = Reflect.get(this.schemaMap, singleSchemaName)?.fields ?? [];
    for (const { fieldname, default: value } of fields) {
      if (existingFields.includes(fieldname) || value === undefined) {
        continue;
      }

      nonExtant.push({ fieldname, value });
    }

    return nonExtant;
  }

  async #deleteOne(schemaName: string, name: string) {
    return await this.client!.execute({
      sql: `DELETE FROM "${schemaName}" WHERE "name" = ?`,
      args: [name],
    });
  }

  async #deleteSingle(schemaName: string, fieldname: string) {
    return await this.client!.execute({
      sql: `DELETE FROM "SingleValue" WHERE "parent" = ? AND "fieldname" = ?`,
      args: [schemaName, fieldname],
    });
  }

  #deleteChildren(schemaName: string, parentName: string) {
    return this.client!.execute({
      sql: `DELETE FROM "${schemaName}" WHERE "parent" = ?`,
      args: [parentName],
    });
  }

  #runDeleteOtherChildren(
    field: TargetField,
    parentName: string,
    added: string[]
  ) {
    if (added.length === 0) {
      return this.client!.execute({
        sql: `DELETE FROM "${field.target}" WHERE "parent" = ?`,
        args: [parentName],
      });
    }
    const placeholders = added.map(() => '?').join(', ');
    return this.client!.execute({
      sql: `DELETE FROM "${field.target}" WHERE "parent" = ? AND "name" NOT IN (${placeholders})`,
      args: [parentName, ...added],
    });
  }

  #prepareChild(
    parentSchemaName: string,
    parentName: string,
    child: FieldValueMap,
    field: Field,
    idx: number
  ) {
    if (!child.name) {
      child.name ??= getRandomString();
    }
    child.parent = parentName;
    child.parentSchemaName = parentSchemaName;
    child.parentFieldname = field.fieldname;
    child.idx ??= idx;
  }

  async #addForeignKeys(schemaName: string) {
    const tableRows = await this.getAll(schemaName, { fields: ['*'] });
    await this.prestigeTheTable(schemaName, tableRows);
  }

  async #loadChildren(
    parentName: string,
    fieldValueMap: FieldValueMap,
    tableFields: TargetField[]
  ) {
    for (const field of tableFields) {
      Reflect.set(
        fieldValueMap,
        field.fieldname,
        await this.getAll(field.target, {
          fields: ['*'],
          filters: { parent: parentName },
          orderBy: 'idx',
          order: 'asc',
        })
      );
    }
  }

  async #getOne(schemaName: string, name: string, fields: string[]) {
    const selectCols =
      fields.length === 0 ? '*' : fields.map((c) => `"${c}"`).join(', ');
    const res = await this.client!.execute({
      sql: `SELECT ${selectCols} FROM "${schemaName}" WHERE "name" = ? LIMIT 1`,
      args: [name],
    });
    return (res.rows[0] as FieldValueMap) || null;
  }

  async #getSingle(schemaName: string): Promise<FieldValueMap> {
    const values = await this.getAll('SingleValue', {
      fields: ['fieldname', 'value'],
      filters: { parent: schemaName },
      orderBy: 'fieldname',
      order: 'asc',
    });

    const fieldValueMap = getValueMapFromList(
      values,
      'fieldname',
      'value'
    ) as FieldValueMap;
    const tableFields: TargetField[] = this.#getTableFields(schemaName);
    if (tableFields.length) {
      await this.#loadChildren(schemaName, fieldValueMap, tableFields);
    }

    return fieldValueMap;
  }

  async #insertOne(schemaName: string, fieldValueMap: FieldValueMap) {
    if (!fieldValueMap.name) {
      fieldValueMap.name = getRandomString();
    }

    const fields = Reflect.get(this.schemaMap, schemaName)!.fields.filter(
      (f) => f.fieldtype !== FieldTypeEnum.Table && !f.computed
    );

    const columns: string[] = [];
    const placeholders: string[] = [];
    const args: any[] = [];

    for (const { fieldname } of fields) {
      const val = Reflect.get(fieldValueMap, fieldname);
      if (val !== undefined) {
        columns.push(`"${fieldname}"`);
        placeholders.push('?');
        args.push(val);
      }
    }

    const sql = `INSERT INTO "${schemaName}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    return await this.client!.execute({ sql, args });
  }

  async #updateSingleValues(
    singleSchemaName: string,
    fieldValueMap: FieldValueMap
  ) {
    const fields = Reflect.get(this.schemaMap, singleSchemaName)!.fields.filter(
      (f) => !f.computed && f.fieldtype !== 'Table'
    );
    for (const field of fields) {
      const value = Reflect.get(fieldValueMap, field.fieldname) as
        | RawValue
        | undefined;
      if (value === undefined) {
        continue;
      }

      await this.#updateSingleValue(singleSchemaName, field.fieldname, value);
    }
  }

  async #updateSingleValue(
    singleSchemaName: string,
    fieldname: string,
    value: RawValue
  ) {
    const res = await this.client!.execute({
      sql: `SELECT "name" FROM "SingleValue" WHERE "parent" = ? AND "fieldname" = ? LIMIT 1`,
      args: [singleSchemaName, fieldname],
    });

    if (res.rows.length === 0) {
      await this.#insertSingleValue(singleSchemaName, fieldname, value);
    } else {
      await this.client!.execute({
        sql: `UPDATE "SingleValue" SET "value" = ?, "modifiedBy" = ?, "modified" = ? WHERE "parent" = ? AND "fieldname" = ?`,
        args: [
          value,
          SYSTEM,
          new Date().toISOString(),
          singleSchemaName,
          fieldname,
        ],
      });
    }
  }

  async #insertSingleValue(
    singleSchemaName: string,
    fieldname: string,
    value: RawValue
  ) {
    const updateMap = getDefaultMetaFieldValueMap();
    const fieldValueMap: FieldValueMap = Object.assign({}, updateMap, {
      parent: singleSchemaName,
      fieldname,
      value,
      name: getRandomString(),
    });

    const columns = Object.keys(fieldValueMap)
      .map((c) => `"${c}"`)
      .join(', ');
    const placeholders = Object.keys(fieldValueMap)
      .map(() => '?')
      .join(', ');
    const args = Object.values(fieldValueMap) as any[];

    await this.client!.execute({
      sql: `INSERT INTO "SingleValue" (${columns}) VALUES (${placeholders})`,
      args,
    });
  }

  async #getSinglesUpdateList() {
    const update: string[] = [];
    const updateNonExtant: NonExtantConfig[] = [];
    for (const [schemaName, schema] of Object.entries(this.schemaMap)) {
      if (!schema || !schema.isSingle) {
        continue;
      }

      const exists = await this.#singleExists(schemaName);
      if (!exists && schema.fields.some((f) => f.default !== undefined)) {
        update.push(schemaName);
      }

      if (!exists) {
        continue;
      }

      const nonExtant = await this.#getNonExtantSingleValues(schemaName);
      if (nonExtant.length) {
        updateNonExtant.push({
          schemaName,
          nonExtant,
        });
      }
    }

    return { update, updateNonExtant };
  }

  async #initializeSingles({ update, updateNonExtant }: UpdateSinglesConfig) {
    for (const config of updateNonExtant) {
      await this.#updateNonExtantSingleValues(config);
    }

    for (const schemaName of update) {
      const fields = Reflect.get(this.schemaMap, schemaName)!.fields;
      const defaultValues: FieldValueMap = fields.reduce((acc, f) => {
        if (f.default !== undefined) {
          Reflect.set(acc, f.fieldname, f.default);
        }

        return acc;
      }, {} as FieldValueMap);

      await this.#updateSingleValues(schemaName, defaultValues);
    }
  }

  async #updateNonExtantSingleValues({
    schemaName,
    nonExtant,
  }: NonExtantConfig) {
    for (const { fieldname, value } of nonExtant) {
      await this.#updateSingleValue(schemaName, fieldname, value);
    }
  }

  async #updateOne(schemaName: string, fieldValueMap: FieldValueMap) {
    const updateMap = { ...fieldValueMap };
    delete updateMap.name;
    const schema = Reflect.get(this.schemaMap, schemaName) as Schema;

    for (const { fieldname, fieldtype, computed } of schema.fields) {
      if (fieldtype !== FieldTypeEnum.Table && !computed) {
        continue;
      }
      Reflect.deleteProperty(updateMap, fieldname);
    }

    const setClauses: string[] = [];
    const args: any[] = [];

    for (const [colName, val] of Object.entries(updateMap)) {
      setClauses.push(`"${colName}" = ?`);
      args.push(val);
    }

    if (setClauses.length === 0) {
      return;
    }

    args.push(fieldValueMap.name);
    const sql = `UPDATE "${schemaName}" SET ${setClauses.join(', ')} WHERE "name" = ?`;
    return await this.client!.execute({ sql, args });
  }

  async #insertOrUpdateChildren(
    schemaName: string,
    fieldValueMap: FieldValueMap,
    isUpdate: boolean
  ) {
    let parentName = fieldValueMap.name as string;
    if (Reflect.get(this.schemaMap, schemaName)?.isSingle) {
      parentName = schemaName;
    }

    const tableFields = this.#getTableFields(schemaName);

    for (const field of tableFields) {
      const added: string[] = [];

      const tableFieldValue = Reflect.get(fieldValueMap, field.fieldname) as
        | FieldValueMap[]
        | undefined
        | null;
      if (getIsNullOrUndef(tableFieldValue)) {
        continue;
      }

      for (const child of tableFieldValue) {
        this.#prepareChild(schemaName, parentName, child, field, added.length);

        if (
          isUpdate &&
          (await this.exists(field.target, child.name as string))
        ) {
          await this.#updateOne(field.target, child);
        } else {
          await this.#insertOne(field.target, child);
        }

        added.push(child.name as string);
      }

      if (isUpdate) {
        await this.#runDeleteOtherChildren(field, parentName, added);
      }
    }
  }

  #getTableFields(schemaName: string): TargetField[] {
    return Reflect.get(this.schemaMap, schemaName)!.fields.filter(
      (f) => f.fieldtype === FieldTypeEnum.Table
    ) as TargetField[];
  }
}
