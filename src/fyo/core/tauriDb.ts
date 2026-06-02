import Database from '@tauri-apps/plugin-sql';
import {
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from 'kysely';
import { exists, remove } from '@tauri-apps/plugin-fs';
import {
  getDbError,
  NotFoundError,
  ValueError,
  DatabaseError,
} from 'fyo/utils/errors';
import {
  Field,
  FieldTypeEnum,
  RawValue,
  Schema,
  SchemaMap,
  TargetField,
} from 'schemas/types';
import {
  getIsNullOrUndef,
  getRandomString,
  getValueMapFromList,
} from 'src/utils/core';
import {
  DatabaseBase,
  DatabaseDemuxBase,
  GetAllOptions,
  QueryFilter,
  DatabaseMethod,
  TopExpenses,
  TotalOutstanding,
  Cashflow,
  TotalCreditAndDebit,
} from 'src/utils/db/types';

// SYSTEM constants and helpers
export const SYSTEM = '__SYSTEM__';

export const sqliteTypeMap: Record<string, string> = {
  AutoComplete: 'text',
  Currency: 'text',
  Int: 'integer',
  Float: 'float',
  Percent: 'float',
  Check: 'boolean',
  Code: 'text',
  Date: 'date',
  Datetime: 'datetime',
  Time: 'time',
  Text: 'text',
  Data: 'text',
  Secret: 'text',
  Link: 'text',
  DynamicLink: 'text',
  Password: 'text',
  Select: 'text',
  Attachment: 'text',
  AttachImage: 'text',
  Color: 'text',
};

export function getDefaultMetaFieldValueMap() {
  const now = new Date().toISOString();
  return {
    createdBy: SYSTEM,
    modifiedBy: SYSTEM,
    created: now,
    modified: now,
  };
}

export const databaseMethodSet: Set<DatabaseMethod> = new Set([
  'insert',
  'get',
  'getAll',
  'getSingleValues',
  'rename',
  'update',
  'delete',
  'deleteAll',
  'close',
  'exists',
]);

// Tauri SQLite client wrapping @tauri-apps/plugin-sql
export class TauriSqliteClient {
  db: Database;

  constructor(db: Database) {
    this.db = db;
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

    const trimmed = sql.trim().toLowerCase();
    const isSelectOrPragma =
      trimmed.startsWith('select') ||
      trimmed.startsWith('pragma') ||
      trimmed.startsWith('show') ||
      trimmed.startsWith('explain');

    try {
      if (isSelectOrPragma) {
        const rows = await this.db.select<any[]>(sql, args);
        return { rows, rowsAffected: 0 };
      } else {
        const res = await this.db.execute(sql, args);
        return { rows: [], rowsAffected: res.rowsAffected };
      }
    } catch (e: any) {
      console.error('SQL Execution Error:', sql, args, e);
      throw e;
    }
  }

  async close() {
    await this.db.close();
  }
}

// Re-implemented DatabaseCore executing on Tauri SQL
export class TauriDatabaseCore extends DatabaseBase {
  client?: TauriSqliteClient;
  typeMap = sqliteTypeMap;
  dbPath: string;
  schemaMap: SchemaMap = {};

  constructor(dbPath?: string) {
    super();
    this.dbPath = dbPath ?? ':memory:';
  }

  static async getCountryCode(dbPath: string): Promise<string> {
    let countryCode = 'in';
    const db = new TauriDatabaseCore(dbPath);
    await db.connect();

    let query: { value: string }[] = [];
    try {
      const res = await db.client!.execute({
        sql: `SELECT value FROM "SingleValue" WHERE fieldname = 'countryCode' AND parent = 'SystemSettings' LIMIT 1`,
        args: [],
      });
      query = res.rows;
    } catch {
      // not initialized
    }

    await db.close();
    if (query.length > 0) {
      countryCode = query[0].value;
    }
    return countryCode;
  }

  setSchemaMap(schemaMap: SchemaMap) {
    this.schemaMap = schemaMap;
  }

  async connect() {
    const conn = await Database.load('sqlite:' + this.dbPath);
    this.client = new TauriSqliteClient(conn);
    await this.client.execute('PRAGMA foreign_keys=ON');
    if (this.dbPath !== ':memory:') {
      try {
        await this.client.execute('PRAGMA journal_mode=WAL');
        await this.client.execute('PRAGMA synchronous=NORMAL');
      } catch (err) {
        console.error('Failed to configure SQLite pragmas:', err);
      }
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = undefined;
    }
  }

  async migrate(config: any = {}) {
    const { create, alter } = await this.#getCreateAlterList();
    const hasSingleValueTable = !create.includes('SingleValue');
    let singlesConfig = {
      update: [] as string[],
      updateNonExtant: [] as any[],
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

    if (config.pre) {
      await config.pre();
    }
    for (const schemaName of create) {
      await this.#createTable(schemaName);
    }

    for (const alterConf of alter) {
      await this.#alterTable(alterConf);
    }

    if (!hasSingleValueTable) {
      singlesConfig = await this.#getSinglesUpdateList();
    }

    await this.#initializeSingles(singlesConfig);
    if (config.post) {
      await config.post();
    }
  }

  async #getCreateAlterList() {
    const create: string[] = [];
    const alter: any[] = [];

    for (const [schemaName, schema] of Object.entries(this.schemaMap)) {
      if (!schema || schema.isSingle) {
        continue;
      }

      const exists = await this.#tableExists(schemaName);
      if (!exists) {
        create.push(schemaName);
        continue;
      }

      const diff = await this.#getColumnDiff(schemaName);
      const newForeignKeys = await this.#getNewForeignKeys(schemaName);
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

  async insert(schemaName: string, fieldValueMap: any): Promise<any> {
    if (Reflect.get(this.schemaMap, schemaName)!.isSingle) {
      await this.#updateSingleValues(schemaName, fieldValueMap);
    } else {
      await this.#insertOne(schemaName, fieldValueMap);
    }

    await this.#insertOrUpdateChildren(schemaName, fieldValueMap, false);
    return fieldValueMap;
  }

  async get(
    schemaName: string,
    name = '',
    fields?: string | string[]
  ): Promise<any> {
    const schema = Reflect.get(this.schemaMap, schemaName) as Schema;
    if (!schema.isSingle && !name) {
      throw new ValueError('name is mandatory');
    }

    let fieldValueMap: any = {};
    if (schema.isSingle) {
      return await this.#getSingle(schemaName);
    }

    if (typeof fields === 'string') {
      fields = [fields];
    }

    if (fields === undefined || fields === null) {
      fields = schema.fields.filter((f) => !f.computed).map((f) => f.fieldname);
    }

    const allTableFields = this.#getTableFields(schemaName);
    const allTableFieldNames = allTableFields.map((f) => f.fieldname);
    const tableFields = allTableFields.filter((f) =>
      fields.includes(f.fieldname)
    );
    const nonTableFieldNames = fields.filter(
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
  ): Promise<any[]> {
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
          const sqlOp = operator.toUpperCase();

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
        } else if (typeof val === 'boolean') {
          if (operator === '=' || operator === 'is') {
            conditions.push(`("${field}" = ? OR "${field}" = ?)`);
            args.push(val ? 1 : 0, val ? '1' : '0');
          } else if (operator === '!=' || operator === 'is not') {
            conditions.push(`("${field}" != ? AND "${field}" != ?)`);
            args.push(val ? 1 : 0, val ? '1' : '0');
          } else {
            conditions.push(`"${field}" ${operator} ?`);
            args.push(val ? 1 : 0);
          }
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
    return res.rows;
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
          const sqlOp = operator.toUpperCase();

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
        } else if (typeof val === 'boolean') {
          if (operator === '=' || operator === 'is') {
            conditions.push(`("${field}" = ? OR "${field}" = ?)`);
            args.push(val ? 1 : 0, val ? '1' : '0');
          } else if (operator === '!=' || operator === 'is not') {
            conditions.push(`("${field}" != ? AND "${field}" != ?)`);
            args.push(val ? 1 : 0, val ? '1' : '0');
          } else {
            conditions.push(`"${field}" ${operator} ?`);
            args.push(val ? 1 : 0);
          }
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
  ): Promise<any[]> {
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

  async update(schemaName: string, fieldValueMap: any) {
    if (Reflect.get(this.schemaMap, schemaName)!.isSingle) {
      await this.#updateSingleValues(schemaName, fieldValueMap);
    } else {
      await this.#updateOne(schemaName, fieldValueMap);
    }

    await this.#insertOrUpdateChildren(schemaName, fieldValueMap, true);
  }

  async delete(schemaName: string, name: string) {
    const schema = Reflect.get(this.schemaMap, schemaName) as Schema;
    if (schema.isSingle) {
      await this.#deleteSingle(schemaName, name);
      return;
    }

    await this.#deleteOne(schemaName, name);

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

  async prestigeTheTable(schemaName: string, tableRows: any[]) {
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
        const op2 = value[2];
        const val2 = value[3];
        filtersArray.push([field, op2, val2]);
      }
    }

    return filtersArray;
  }

  async #getColumnDiff(schemaName: string): Promise<any> {
    const tableColumns = await this.#getTableColumns(schemaName);
    const validFields = Reflect.get(this.schemaMap, schemaName)!.fields.filter(
      (f: any) => !f.computed
    );
    const diff: any = { added: [], removed: [] };

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

  async #alterTable({ schemaName, diff, newForeignKeys }: any) {
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
      (f: any) => !f.computed
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

    const nonExtant: any[] = [];
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
    child: any,
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
    fieldValueMap: any,
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
    return res.rows[0] || null;
  }

  async #getSingle(schemaName: string): Promise<any> {
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
    ) as any;
    const tableFields = this.#getTableFields(schemaName);
    if (tableFields.length) {
      await this.#loadChildren(schemaName, fieldValueMap, tableFields);
    }

    return fieldValueMap;
  }

  async #insertOne(schemaName: string, fieldValueMap: any) {
    if (!fieldValueMap.name) {
      fieldValueMap.name = getRandomString();
    }

    const fields = Reflect.get(this.schemaMap, schemaName)!.fields.filter(
      (f: any) => f.fieldtype !== FieldTypeEnum.Table && !f.computed
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

  async #updateSingleValues(singleSchemaName: string, fieldValueMap: any) {
    const fields = Reflect.get(this.schemaMap, singleSchemaName)!.fields.filter(
      (f: any) => !f.computed && f.fieldtype !== 'Table'
    );
    for (const field of fields) {
      const value = Reflect.get(fieldValueMap, field.fieldname);
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
    const fieldValueMap = Object.assign({}, updateMap, {
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
    const args = Object.values(fieldValueMap);

    await this.client!.execute({
      sql: `INSERT INTO "SingleValue" (${columns}) VALUES (${placeholders})`,
      args,
    });
  }

  async #getSinglesUpdateList() {
    const update: string[] = [];
    const updateNonExtant: any[] = [];
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

  async #initializeSingles({ update, updateNonExtant }: any) {
    for (const config of updateNonExtant) {
      await this.#updateNonExtantSingleValues(config);
    }

    for (const schemaName of update) {
      const fields = Reflect.get(this.schemaMap, schemaName)!.fields;
      const defaultValues = fields.reduce((acc: any, f: any) => {
        if (f.default !== undefined) {
          Reflect.set(acc, f.fieldname, f.default);
        }

        return acc;
      }, {});

      await this.#updateSingleValues(schemaName, defaultValues);
    }
  }

  async #updateNonExtantSingleValues({ schemaName, nonExtant }: any) {
    for (const { fieldname, value } of nonExtant) {
      await this.#updateSingleValue(schemaName, fieldname, value);
    }
  }

  async #updateOne(schemaName: string, fieldValueMap: any) {
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
    fieldValueMap: any,
    isUpdate: boolean
  ) {
    let parentName = fieldValueMap.name as string;
    if (Reflect.get(this.schemaMap, schemaName)?.isSingle) {
      parentName = schemaName;
    }

    const tableFields = this.#getTableFields(schemaName);

    for (const field of tableFields) {
      const added: string[] = [];

      const tableFieldValue = Reflect.get(fieldValueMap, field.fieldname);
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
      (f: any) => f.fieldtype === FieldTypeEnum.Table
    ) as TargetField[];
  }
}

// Re-implemented BespokeQueries using raw SQL query executions for Webview/Tauri
export class TauriBespokeQueries {
  static async getLastInserted(
    db: TauriDatabaseCore,
    schemaName: string
  ): Promise<number> {
    if (!db.client) {
      return 0;
    }
    const lastInserted = await db.client.execute({
      sql: `select cast(name as int) as num from "${schemaName}" order by num desc limit 1`,
      args: [],
    });

    const num = lastInserted.rows[0]?.num;
    if (num === undefined || num === null) {
      return 0;
    }
    return Number(num);
  }

  static async getTopExpenses(
    db: TauriDatabaseCore,
    fromDate: string,
    toDate: string
  ): Promise<TopExpenses> {
    if (!db.client) {
      return [] as any;
    }
    const res = await db.client.execute({
      sql: `
        SELECT account, sum(cast(debit as real) - cast(credit as real)) as total
        FROM AccountingLedgerEntry
        WHERE (reverted = 0 OR reverted = '0')
          AND account IN (SELECT name FROM Account WHERE rootType = 'Expense')
          AND date BETWEEN ? AND ?
        GROUP BY account
        ORDER BY total DESC
        LIMIT 5
      `,
      args: [fromDate, toDate],
    });
    return res.rows as unknown as TopExpenses;
  }

  static async getTotalOutstanding(
    db: TauriDatabaseCore,
    schemaName: string,
    fromDate: string,
    toDate: string
  ): Promise<TotalOutstanding> {
    if (!db.client) {
      return {} as any;
    }
    const res = await db.client.execute({
      sql: `
        SELECT sum(cast(baseGrandTotal as real)) as total, sum(cast(outstandingAmount as real)) as outstanding
        FROM "${schemaName}"
        WHERE (submitted = 1 OR submitted = '1') AND (cancelled = 0 OR cancelled = '0') AND date BETWEEN ? AND ?
        LIMIT 1
      `,
      args: [fromDate, toDate],
    });
    return (res.rows[0] || {}) as TotalOutstanding;
  }

  static async getCashflow(
    db: TauriDatabaseCore,
    fromDate: string,
    toDate: string
  ): Promise<Cashflow> {
    if (!db.client) {
      return [] as any;
    }
    const res = await db.client.execute({
      sql: `
        SELECT strftime('%Y-%m', date) as yearmonth,
               sum(cast(debit as real)) as inflow,
               sum(cast(credit as real)) as outflow
        FROM AccountingLedgerEntry
        WHERE (reverted = 0 OR reverted = '0')
          AND account IN (SELECT name FROM Account WHERE accountType IN ('Cash', 'Bank') AND (isGroup = 0 OR isGroup = '0'))
          AND date BETWEEN ? AND ?
        GROUP BY strftime('%Y-%m', date)
      `,
      args: [fromDate, toDate],
    });
    return res.rows as unknown as Cashflow;
  }

  static async getIncomeAndExpenses(
    db: TauriDatabaseCore,
    fromDate: string,
    toDate: string
  ) {
    if (!db.client) {
      return { income: [], expense: [] };
    }
    const incomeRes = await db.client.execute({
      sql: `
        select sum(cast(credit as real) - cast(debit as real)) as balance, strftime('%Y-%m', date) as yearmonth
        from AccountingLedgerEntry
        where
          (reverted = 0 OR reverted = '0') and
          date between date(?) and date(?) and
          account in (
            select name
            from Account
            where rootType = 'Income'
          )
        group by yearmonth`,
      args: [fromDate, toDate],
    });

    const expenseRes = await db.client.execute({
      sql: `
        select sum(cast(debit as real) - cast(credit as real)) as balance, strftime('%Y-%m', date) as yearmonth
        from AccountingLedgerEntry
        where
          (reverted = 0 OR reverted = '0') and
          date between date(?) and date(?) and
          account in (
            select name
            from Account
            where rootType = 'Expense'
          )
        group by yearmonth`,
      args: [fromDate, toDate],
    });

    return { income: incomeRes.rows, expense: expenseRes.rows };
  }

  static async getTotalCreditAndDebit(db: TauriDatabaseCore) {
    if (!db.client) {
      return [] as any;
    }
    const res = await db.client.execute(`
      select 
        account, 
        sum(cast(credit as real)) as totalCredit, 
        sum(cast(debit as real)) as totalDebit
      from AccountingLedgerEntry
      group by account
    `);
    return res.rows as unknown as TotalCreditAndDebit[];
  }

  static async getStockQuantity(
    db: TauriDatabaseCore,
    item: string,
    location?: string,
    fromDate?: string,
    toDate?: string,
    batch?: string,
    serialNumbers?: string[]
  ): Promise<number | null> {
    if (!db.client) {
      return null;
    }
    const conditions: string[] = ['item = ?'];
    const args: any[] = [item];

    if (location) {
      conditions.push('location = ?');
      args.push(location);
    }
    if (batch) {
      conditions.push('batch = ?');
      args.push(batch);
    }
    if (serialNumbers?.length) {
      const placeholders = serialNumbers.map(() => '?').join(', ');
      conditions.push(`serialNumber IN (${placeholders})`);
      args.push(...serialNumbers);
    }
    if (fromDate) {
      conditions.push('datetime(date) > datetime(?)');
      args.push(fromDate);
    }
    if (toDate) {
      conditions.push('datetime(date) < datetime(?)');
      args.push(toDate);
    }

    const sql = `SELECT sum(cast(quantity as real)) as total FROM StockLedgerEntry WHERE ${conditions.join(' AND ')}`;
    const res = await db.client.execute({ sql, args });

    if (!res.rows.length || res.rows[0].total === null) {
      return null;
    }
    return Number(res.rows[0].total);
  }

  static async getReturnBalanceItemsQty(
    db: TauriDatabaseCore,
    schemaName: string,
    docName: string
  ): Promise<any | undefined> {
    // Re-implemented to fetch nested table schemas using raw sql query selections
    if (!db.client) {
      return;
    }
    // We can fallback to executing raw query checks. For now, since return quantities are simple mapping,
    // we can return mapped rows. Let's run raw fetches:
    const itemTable = `${schemaName}Item`;
    const docTable = schemaName;

    const returnDocNamesRes = await db.client.execute({
      sql: `SELECT name FROM "${docTable}" WHERE returnAgainst = ? AND (submitted = 1 OR submitted = '1') AND (cancelled = 0 OR cancelled = '0')`,
      args: [docName],
    });
    const returnDocNames = returnDocNamesRes.rows.map((i) => i.name as string);

    if (!returnDocNames.length) {
      return;
    }

    // Helper map to structure results
    const isInvoice = ['SalesInvoice', 'PurchaseInvoice'].includes(schemaName);
    const placeholders = returnDocNames.map(() => '?').join(', ');

    // Select returned items
    const returnedItemsRes = await db.client.execute({
      sql: `SELECT item, batch, sum(cast(quantity as real)) as quantity ${!isInvoice ? ', serialNumber' : ''} FROM "${itemTable}" WHERE parent IN (${placeholders}) GROUP BY item, batch ${!isInvoice ? ', serialNumber' : ''}`,
      args: returnDocNames,
    });

    const docItemsRes = await db.client.execute({
      sql: `SELECT name, item, batch, sum(cast(quantity as real)) as quantity ${!isInvoice ? ', serialNumber' : ''} FROM "${itemTable}" WHERE parent = ? GROUP BY item, batch ${!isInvoice ? ', serialNumber' : ''}`,
      args: [docName],
    });

    const docItemsMap = TauriBespokeQueries.#getDocItemMap(docItemsRes.rows);
    const returnedItemsMap = TauriBespokeQueries.#getDocItemMap(
      returnedItemsRes.rows
    );

    return TauriBespokeQueries.#getReturnBalanceItemQtyMap(
      docItemsMap,
      returnedItemsMap
    );
  }

  static #getDocItemMap(docItems: any[]): Record<string, any> {
    const docItemsMap: Record<string, any> = {};
    const batchesMap: Record<string, any> = {};

    for (const item of docItems) {
      const existingDocItem = Reflect.get(docItemsMap, item.item);
      if (existingDocItem) {
        if (item.batch) {
          const batches = existingDocItem.batches!;
          const batchInfo = Reflect.get(batches, item.batch);
          if (!batchInfo) {
            Reflect.set(batches, item.batch, {
              quantity: item.quantity,
              serialNumbers: item.serialNumber
                ? item.serialNumber.split('\n')
                : undefined,
            });
          } else {
            batchInfo.quantity += item.quantity;
          }
        } else {
          existingDocItem.quantity += item.quantity;
        }
        continue;
      }

      if (item.batch) {
        Reflect.set(batchesMap, item.batch, {
          quantity: item.quantity,
          serialNumbers: item.serialNumber
            ? item.serialNumber.split('\n')
            : undefined,
        });
      }

      Reflect.set(docItemsMap, item.item, {
        batches: batchesMap,
        quantity: item.quantity,
        serialNumbers: item.serialNumber
          ? item.serialNumber.split('\n')
          : undefined,
      });
    }
    return docItemsMap;
  }

  static #getReturnBalanceItemQtyMap(
    docItemsMap: Record<string, any>,
    returnedItemsMap: Record<string, any>
  ): Record<string, any> {
    const returnBalanceItems: Record<string, any> = {};
    for (const row in docItemsMap) {
      const docItem = Reflect.get(docItemsMap, row);
      const returnedDocItem = Reflect.get(returnedItemsMap, row);
      const docItemHasBatch = !!Object.keys(docItem.batches ?? {}).length;
      let balanceQty = -docItem.quantity;

      if (returnedDocItem) {
        balanceQty = -(Math.abs(balanceQty) + returnedDocItem.quantity);
      }

      const balanceBatchQtyMap: Record<string, any> = {};
      if (docItemHasBatch && docItem.batches) {
        for (const batch in docItem.batches) {
          const ItemQty = Math.abs(
            Reflect.get(docItem.batches, batch).quantity
          );
          let balanceQty = -ItemQty;

          if (returnedDocItem && returnedDocItem.batches) {
            const returnedItem = Reflect.get(returnedDocItem.batches, batch);
            if (returnedItem) {
              balanceQty = -(
                Math.abs(balanceQty) - Math.abs(returnedItem.quantity)
              );
            }
          }

          Reflect.set(balanceBatchQtyMap, batch, {
            quantity: balanceQty,
            serialNumbers: undefined,
          });
        }
      }

      Reflect.set(returnBalanceItems, row, {
        quantity: balanceQty,
        batches: balanceBatchQtyMap,
        serialNumbers: undefined,
      });
    }
    return returnBalanceItems;
  }

  static async getPOSTransactedAmount(
    db: TauriDatabaseCore,
    fromDate: Date,
    toDate: Date,
    lastShiftClosingDate?: Date
  ): Promise<Record<string, number> | undefined> {
    if (!db.client) {
      return;
    }
    let sql = `
      SELECT name, returnAgainst FROM SalesInvoice 
      WHERE isPos = '1' AND date BETWEEN ? AND ?
    `;
    const args: any[] = [fromDate.toISOString(), toDate.toISOString()];
    if (lastShiftClosingDate) {
      sql += ' AND created > ?';
      args.push(lastShiftClosingDate.toISOString());
    }

    const invoicesRes = await db.client.execute({ sql, args });
    const invoices = invoicesRes.rows;

    if (!invoices.length) {
      return;
    }

    const sinvNames = invoices.map((row) => row.name);
    const invoiceSignMap = invoices.reduce<Record<string, number>>(
      (map, inv) => {
        Reflect.set(map, inv.name, inv.returnAgainst ? -1 : 1);
        return map;
      },
      {}
    );

    const placeholders = sinvNames.map(() => '?').join(', ');
    const paymentEntryNamesRes = await db.client.execute({
      sql: `SELECT parent, referenceName FROM PaymentFor WHERE referenceName IN (${placeholders})`,
      args: sinvNames,
    });
    const paymentEntryNames = paymentEntryNamesRes.rows.map(
      (doc) => doc.parent
    );

    if (!paymentEntryNames.length) {
      return;
    }

    const pmPlaceholders = paymentEntryNames.map(() => '?').join(', ');
    const groupedAmountsRes = await db.client.execute({
      sql: `
        SELECT paymentMethod, name, sum(cast(amount as real)) as amount 
        FROM Payment 
        WHERE name IN (${pmPlaceholders}) 
        GROUP BY paymentMethod, name
      `,
      args: paymentEntryNames,
    });
    const groupedAmounts = groupedAmountsRes.rows;

    const transactedAmounts: Record<string, number> = {};

    for (const row of groupedAmounts) {
      const paymentRefsRes = await db.client.execute({
        sql: `SELECT referenceName FROM PaymentFor WHERE parent = ?`,
        args: [row.name],
      });
      const paymentRefs = paymentRefsRes.rows;

      for (const ref of paymentRefs) {
        const sign = Reflect.get(invoiceSignMap, ref.referenceName) ?? 1;
        const signedAmount = Number(row.amount) * sign;

        Reflect.set(
          transactedAmounts,
          row.paymentMethod,
          (Reflect.get(transactedAmounts, row.paymentMethod) ?? 0) +
            signedAmount
        );
      }
    }

    return transactedAmounts;
  }
}

// Re-implemented DatabaseManager executing on Tauri SQL/FS
export class TauriDatabaseManager extends DatabaseDemuxBase {
  db?: TauriDatabaseCore;
  rawCustomFields: any[] = [];

  get #isInitialized(): boolean {
    return this.db !== undefined && this.db.client !== undefined;
  }

  async getSchemaMap(countryCode = '-') {
    const { getSchemas } = await import('src/schemas');
    if (this.db) {
      return this.db.schemaMap || getSchemas(countryCode, this.rawCustomFields);
    }
    return getSchemas(countryCode, this.rawCustomFields);
  }

  async setRawCustomFields() {
    try {
      this.rawCustomFields = (await this.db?.getAll('CustomField')) || [];
    } catch {
      this.rawCustomFields = [];
    }
  }

  async createNewDatabase(dbPath: string, countryCode: string) {
    if (this.db) {
      await this.call('close');
    }
    if (await exists(dbPath)) {
      await remove(dbPath);
    }
    return await this.connectToDatabase(dbPath, countryCode);
  }

  async connectToDatabase(dbPath: string, countryCode?: string) {
    if (this.db) {
      await this.call('close');
    }
    countryCode = await this._connect(dbPath, countryCode);
    await this.#migrate();
    return countryCode;
  }

  async _connect(dbPath: string, countryCode?: string) {
    if (!countryCode) {
      countryCode = await TauriDatabaseCore.getCountryCode(dbPath);
    }
    this.db = new TauriDatabaseCore(dbPath);
    await this.db.connect();

    await this.setRawCustomFields();
    const { getSchemas } = await import('src/schemas');
    const schemaMap = getSchemas(countryCode, this.rawCustomFields);
    this.db.setSchemaMap(schemaMap);

    return countryCode;
  }

  async #migrate(): Promise<void> {
    if (!this.#isInitialized) {
      return;
    }
    const isFirstRun = await this.#getIsFirstRun();
    if (isFirstRun) {
      await this.db!.migrate();
    }
  }

  async call(method: DatabaseMethod, ...args: unknown[]) {
    if (!this.#isInitialized) {
      return;
    }

    if (!databaseMethodSet.has(method)) {
      return;
    }

    const response = await (Reflect.get(this.db!, method) as any).call(
      this.db!,
      ...(args as any[])
    );
    if (method === 'close') {
      this.db = undefined;
    }

    return response;
  }

  async callBespoke(method: string, ...args: unknown[]): Promise<unknown> {
    if (!this.#isInitialized) {
      return;
    }

    if (!TauriBespokeQueries.hasOwnProperty(method)) {
      throw new DatabaseError(`invalid bespoke db function ${method}`);
    }

    const queryFunction = Reflect.get(TauriBespokeQueries, method);
    return await queryFunction(this.db!, ...args);
  }

  async #getIsFirstRun(): Promise<boolean> {
    if (!this.db || !this.db.client) {
      return true;
    }
    try {
      const res = await this.db.client.execute({
        sql: "select count(*) as count from sqlite_master where type='table' and name='PatchRun'",
        args: [],
      });
      return Number(res.rows[0]?.count) === 0;
    } catch {
      return true;
    }
  }
}

// Global active database manager instance for the frontend
export const tauriDatabaseManager = new TauriDatabaseManager();

// Custom Kysely Dialect using Tauri SQL plugin
export function createKyselyInstance(tauriDb: Database) {
  return new Kysely<any>({
    dialect: {
      createAdapter() {
        return new SqliteAdapter();
      },
      createDriver() {
        return {
          async init() {},
          async acquireConnection() {
            return {
              async executeQuery(compiledQuery) {
                const results = await tauriDb.select<any[]>(
                  compiledQuery.sql,
                  compiledQuery.parameters as any[]
                );
                return { rows: results };
              },
              async *streamQuery() {
                yield* [];
                throw new Error('Streaming is not supported');
              },
            };
          },
          async beginTransaction() {},
          async commitTransaction() {},
          async rollbackTransaction() {},
          async releaseConnection() {},
          async destroy() {},
        };
      },
      createIntrospector(db) {
        return new SqliteIntrospector(db);
      },
      createQueryCompiler() {
        return new SqliteQueryCompiler();
      },
    },
  });
}
