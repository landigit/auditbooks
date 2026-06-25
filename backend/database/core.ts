import { getDbError, NotFoundError, ValueError } from 'fyo/utils/errors';
import {
  Kysely,
  SqliteDialect,
  sql,
  Expression,
  SqlBool,
  InsertObject,
} from 'kysely';
import BetterSQLite3 from 'better-sqlite3';
import { DB } from './schema';
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
  GetQueryBuilderOptions,
  MigrationConfig,
  NonExtantConfig,
  SingleValue,
  UpdateSinglesConfig,
} from './types';

/**
 * # DatabaseCore
 * This is the ORM, the DatabaseCore interface (function signatures) should be
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
 *
 * Note: Meta values: created, modified, createdBy, modifiedBy are set by DatabaseCore
 * only for schemas that are SingleValue. Else they have to be passed by the caller in
 * the `fieldValueMap`.
 */

export default class DatabaseCore extends DatabaseBase {
  kysely?: Kysely<DB>;
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
      query = (await db
        .kysely!.selectFrom('SingleValue')
        .select('value')
        .where('fieldname', '=', 'countryCode')
        .where('parent', '=', 'SystemSettings')
        .execute()) as { value: string }[];
    } catch {
      // Database not inialized and no countryCode passed
    }

    if (query.length > 0) {
      countryCode = query[0].value;
    }

    await db.close();
    return countryCode;
  }

  setSchemaMap(schemaMap: SchemaMap) {
    this.schemaMap = schemaMap;
  }

  async connect() {
    const db = new BetterSQLite3(this.dbPath);
    db.pragma('foreign_keys = ON');
    this.kysely = new Kysely<DB>({
      dialect: new SqliteDialect({
        database: db,
      }),
    });
  }

  async close() {
    await this.kysely?.destroy();
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
    const schema = this.schemaMap[schemaName] as Schema;
    if (schema.isSingle) {
      return this.#singleExists(schemaName);
    }

    let row = [];
    try {
      let query = (this.kysely as any).selectFrom(schemaName).select('name');
      if (name !== undefined) {
        query = query.where('name', '=', name);
      }
      row = await query.limit(1).execute();
    } catch (err) {
      if (getDbError(err as Error) !== NotFoundError) {
        throw err;
      }
    }
    return row.length > 0;
  }

  async insert(
    schemaName: string,
    fieldValueMap: FieldValueMap
  ): Promise<FieldValueMap> {
    // insert parent
    if (this.schemaMap[schemaName]!.isSingle) {
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
    const schema = this.schemaMap[schemaName] as Schema;
    if (!schema.isSingle && !name) {
      throw new ValueError('name is mandatory');
    }

    /**
     * If schema is single return all the values
     * of the single type schema, in this case field
     * is ignored.
     */
    let fieldValueMap: FieldValueMap = {};
    if (schema.isSingle) {
      return await this.#getSingle(schemaName);
    }

    if (typeof fields === 'string') {
      fields = [fields];
    }

    if (fields === undefined) {
      fields = schema.fields.filter((f) => !f.computed).map((f) => f.fieldname);
    }

    /**
     * Separate table fields and non table fields
     */
    const allTableFields: TargetField[] = this.#getTableFields(schemaName);
    const allTableFieldNames: string[] = allTableFields.map((f) => f.fieldname);
    const tableFields: TargetField[] = allTableFields.filter((f) =>
      fields!.includes(f.fieldname)
    );
    const nonTableFieldNames: string[] = fields.filter(
      (f) => !allTableFieldNames.includes(f)
    );

    /**
     * If schema is not single then return specific fields
     * if child fields are selected, all child fields are returned.
     */
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
    const schema = this.schemaMap[schemaName] as Schema;
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

    let targetFields = (typeof fields === 'string' ? [fields] : fields).filter(
      Boolean
    );
    if (targetFields.length === 0) {
      targetFields = ['*'];
    }

    const query = this.#getKyselySelectQuery(
      schemaName,
      targetFields,
      filters ?? {},
      {
        offset,
        limit,
        groupBy,
        orderBy,
        order,
      }
    );
    return (await query.execute()) as FieldValueMap[];
  }

  async deleteAll(schemaName: string, filters: QueryFilter): Promise<number> {
    let query = (this.kysely as any).deleteFrom(schemaName);
    query = this.#applyFiltersToKyselyQuery(query, filters);
    const result = await query.executeTakeFirst();
    return Number(result.numDeletedRows);
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

    let query = this.kysely!.selectFrom('SingleValue').select([
      'fieldname',
      'value',
      'parent',
    ]);

    query = query.where((eb) => {
      const firstConditions: Expression<SqlBool>[] = [
        eb('fieldname', '=', fieldnameList[0].fieldname),
      ];
      if (fieldnameList[0].parent !== undefined) {
        firstConditions.push(eb('parent', '=', fieldnameList[0].parent));
      }
      const expression = eb.and(firstConditions);

      const orExpressions = fieldnameList
        .slice(1)
        .map(({ fieldname, parent }) => {
          const conds: Expression<SqlBool>[] = [
            eb('fieldname', '=', fieldname),
          ];
          if (parent !== undefined) {
            conds.push(eb('parent', '=', parent));
          }
          return eb.and(conds);
        });

      if (orExpressions.length > 0) {
        return eb.or([expression, ...orExpressions]);
      }
      return expression;
    });

    let values: { fieldname: string; parent: string; value: RawValue }[];
    try {
      values = (await query.execute()) as {
        fieldname: string;
        parent: string;
        value: RawValue;
      }[];
    } catch (err) {
      if (getDbError(err as Error) === NotFoundError) {
        return [];
      }

      throw err;
    }

    return values;
  }

  async rename(schemaName: string, oldName: string, newName: string) {
    /**
     * Rename is expensive mostly won't allow it.
     * NOTE: rename all links - Not implemented as rename is expensive
     * NOTE: rename in childtables - Not implemented as rename is expensive
     */
    await (this.kysely as any)
      .updateTable(schemaName)
      .set({ name: newName })
      .where('name', '=', oldName)
      .execute();
  }

  async update(schemaName: string, fieldValueMap: FieldValueMap) {
    // update parent
    if (this.schemaMap[schemaName]!.isSingle) {
      await this.#updateSingleValues(schemaName, fieldValueMap);
    } else {
      await this.#updateOne(schemaName, fieldValueMap);
    }

    // insert or update children
    await this.#insertOrUpdateChildren(schemaName, fieldValueMap, true);
  }

  async delete(schemaName: string, name: string) {
    const schema = this.schemaMap[schemaName] as Schema;
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
    const result = await sql<{ name: string }>`
      select name from sqlite_schema
      where type='table' and name=${schemaName}
    `.execute(this.kysely!);
    return result.rows.length > 0;
  }

  async #singleExists(singleSchemaName: string): Promise<boolean> {
    const res = await this.kysely!.selectFrom('SingleValue')
      .select(({ fn }) => fn.count('parent').as('count'))
      .where('parent', '=', singleSchemaName)
      .executeTakeFirst();
    const count = Number(res?.count);
    return count > 0;
  }

  async prestigeTheTable(schemaName: string, tableRows: FieldValueMap[]) {
    const tempName = `__${schemaName}`;

    await this.kysely!.schema.dropTable(tempName).ifExists().execute();
    await sql`PRAGMA foreign_keys=OFF`.execute(this.kysely!);
    await this.#createTable(schemaName, tempName);

    const validFields = new Set(
      this.schemaMap[schemaName]!.fields.filter(
        (f) => !f.computed && f.fieldtype !== FieldTypeEnum.Table
      ).map((f) => f.fieldname)
    );

    const sanitizedRows = tableRows.map((row) => {
      const sanitized: any = {};
      for (const key of Object.keys(row)) {
        if (validFields.has(key)) {
          sanitized[key] = row[key];
        }
      }
      return sanitized;
    });

    await this.#batchInsert(tempName, sanitizedRows, 200);

    await this.kysely!.schema.dropTable(schemaName).execute();
    await this.kysely!.schema.alterTable(tempName)
      .renameTo(schemaName)
      .execute();
    await sql`PRAGMA foreign_keys=ON`.execute(this.kysely!);
  }

  async #batchInsert(tableName: string, rows: any[], chunkSize = 200) {
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await (this.kysely as any).insertInto(tableName).values(chunk).execute();
    }
  }

  async #getTableColumns(schemaName: string): Promise<string[]> {
    const info =
      await sql<any>`PRAGMA table_info(${sql.raw(schemaName)})`.execute(
        this.kysely!
      );
    return info.rows.map((d) => d.name as string);
  }

  async truncate(tableNames?: string[]) {
    if (tableNames === undefined) {
      const q = await sql<{ name: string }>`
        select name from sqlite_schema
        where type='table'
        and name not like 'sqlite_%'
      `.execute(this.kysely!);
      tableNames = q.rows.map((i) => i.name);
    }

    for (const name of tableNames) {
      await sql`delete from ${sql.raw(name)}`.execute(this.kysely!);
    }
  }

  async #getForeignKeys(schemaName: string): Promise<string[]> {
    const foreignKeyList =
      await sql<any>`PRAGMA foreign_key_list(${sql.raw(schemaName)})`.execute(
        this.kysely!
      );
    return foreignKeyList.rows.map((d) => d.from as string);
  }

  #getKyselySelectQuery(
    schemaName: string,
    fields: string[],
    filters: QueryFilter,
    options: GetQueryBuilderOptions
  ): any {
    let query = (this.kysely as any).selectFrom(schemaName);
    if (fields.length === 1 && fields[0] === '*') {
      query = query.selectAll();
    } else {
      query = query.select(fields);
    }

    query = this.#applyFiltersToKyselyQuery(query, filters);

    const { orderBy, groupBy, order } = options;
    if (Array.isArray(orderBy)) {
      for (const column of orderBy) {
        query = query.orderBy(column, order);
      }
    }

    if (typeof orderBy === 'string') {
      query = query.orderBy(orderBy, order);
    }

    if (Array.isArray(groupBy)) {
      query = query.groupBy(groupBy);
    }

    if (typeof groupBy === 'string') {
      query = query.groupBy(groupBy);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return query;
  }

  #applyFiltersToKyselyQuery(query: any, filters: QueryFilter): any {
    const filtersArray = this.#getFiltersArray(filters);
    for (let i = 0; i < filtersArray.length; i++) {
      const filter = filtersArray[i];
      const field = filter[0] as string;
      const operator = filter[1];
      const comparisonValue = filter[2];

      let val = comparisonValue;
      if (Array.isArray(val)) {
        val = val.map((v) => this.#formatValueForDatabase(v));
      } else {
        val = this.#formatValueForDatabase(val);
      }

      if (operator === '=') {
        if (val === null) {
          query = query.where(field, 'is', null);
        } else {
          query = query.where(field, '=', val);
        }
      } else if (operator === 'in') {
        const list = Array.isArray(val) ? val : [val];
        if (list.includes(null)) {
          const nonNulls = list.filter((v) => v !== null) as string[];
          if (nonNulls.length > 0) {
            query = query.where((eb: any) =>
              eb.or([eb(field, 'in', nonNulls), eb(field, 'is', null)])
            );
          } else {
            query = query.where(field, 'is', null);
          }
        } else {
          query = query.where(field, 'in', list as string[]);
        }
      } else if (operator === 'not in') {
        const list = Array.isArray(val) ? val : [val];
        query = query.where(field, 'not in', list as string[]);
      } else {
        query = query.where(field, operator, val);
      }
    }
    return query;
  }

  #getFiltersArray(filters: QueryFilter) {
    const filtersArray = [];
    for (const field in filters) {
      const value = filters[field];

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
        // multiple conditions
        const operator = value[2];
        const comparisonValue = value[3];
        filtersArray.push([field, operator, comparisonValue]);
      }
    }

    return filtersArray;
  }

  async #getColumnDiff(schemaName: string): Promise<ColumnDiff> {
    const tableColumns = await this.#getTableColumns(schemaName);
    const validFields = this.schemaMap[schemaName]!.fields.filter(
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
    const schema = this.schemaMap[schemaName] as Schema;
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

  async #alterTable({ schemaName, diff, newForeignKeys }: AlterConfig) {
    if (diff.added.length) {
      let builder: any = this.kysely!.schema.alterTable(schemaName);
      for (const field of diff.added) {
        let columnType = this.typeMap[field.fieldtype] as string;
        if (!columnType) continue;
        if (columnType === 'float') {
          columnType = 'real';
        }

        builder = builder.addColumn(
          field.fieldname,
          columnType as any,
          (col: any) => {
            if (field.default !== undefined) {
              col = col.defaultTo(String(field.default));
            }
            if (field.required) {
              col = col.notNull();
            }
            return col;
          }
        );
      }
      await builder.execute();
    }

    if (diff.removed.length) {
      const tableRows = await this.getAll(schemaName);
      await this.prestigeTheTable(schemaName, tableRows);
    } else if (newForeignKeys.length) {
      await this.#addForeignKeys(schemaName);
    }
  }

  async #createTable(schemaName: string, tableName?: string) {
    tableName ??= schemaName;
    const fields = this.schemaMap[schemaName]!.fields.filter(
      (f) => !f.computed
    );
    return await this.#runCreateTableQuery(tableName, fields, schemaName);
  }

  async #runCreateTableQuery(
    tableName: string,
    fields: Field[],
    schemaName: string
  ) {
    let builder: any = this.kysely!.schema.createTable(tableName);
    for (const field of fields) {
      let columnType = this.typeMap[field.fieldtype] as string;
      if (!columnType) {
        continue;
      }
      if (columnType === 'float') {
        columnType = 'real';
      }
      builder = builder.addColumn(
        field.fieldname,
        columnType as any,
        (col: any) => {
          if (field.fieldname === 'name') {
            col = col.primaryKey();
          }
          if (field.default !== undefined) {
            col = col.defaultTo(String(field.default));
          }
          if (field.required) {
            col = col.notNull();
          }
          return col;
        }
      );
    }

    for (const field of fields) {
      if (field.fieldtype === FieldTypeEnum.Link && field.target) {
        const targetSchema = this.schemaMap[field.target] as Schema;
        if (targetSchema) {
          builder = builder.addForeignKeyConstraint(
            `${tableName}_${field.fieldname}_fk`,
            [field.fieldname],
            targetSchema.name as any,
            ['name'],
            (cb: any) => cb.onUpdate('cascade').onDelete('restrict')
          );
        }
      }
    }

    await builder.execute();

    const schema = this.schemaMap[schemaName];
    if (schema?.isChild) {
      await this.kysely!.schema.createIndex(`${tableName}_parent_idx`)
        .on(tableName)
        .columns(['parent'])
        .execute();
    }

    for (const field of fields) {
      if (field.fieldtype === 'Link' && field.fieldname !== 'name') {
        await this.kysely!.schema.createIndex(
          `${tableName}_${field.fieldname}_idx`
        )
          .on(tableName)
          .columns([field.fieldname])
          .execute();
      }
    }
  }

  async #getNonExtantSingleValues(singleSchemaName: string) {
    const existingFields = (
      await this.kysely!.selectFrom('SingleValue')
        .select('fieldname')
        .where('parent', '=', singleSchemaName)
        .execute()
    ).map(({ fieldname }) => fieldname);

    const nonExtant: NonExtantConfig['nonExtant'] = [];
    const fields = this.schemaMap[singleSchemaName]?.fields ?? [];
    for (const { fieldname, default: value } of fields) {
      if (existingFields.includes(fieldname) || value === undefined) {
        continue;
      }

      nonExtant.push({ fieldname, value });
    }

    return nonExtant;
  }

  async #deleteOne(schemaName: string, name: string) {
    await (this.kysely as any)
      .deleteFrom(schemaName)
      .where('name', '=', name)
      .execute();
  }

  async #deleteSingle(schemaName: string, fieldname: string) {
    const res = await this.kysely!.deleteFrom('SingleValue')
      .where('parent', '=', schemaName)
      .where('fieldname', '=', fieldname)
      .executeTakeFirst();
    return Number(res.numDeletedRows);
  }

  async #deleteChildren(schemaName: string, parentName: string) {
    await (this.kysely as any)
      .deleteFrom(schemaName)
      .where('parent', '=', parentName)
      .execute();
  }

  async #runDeleteOtherChildren(
    field: TargetField,
    parentName: string,
    added: string[]
  ) {
    let query = (this.kysely as any)
      .deleteFrom(field.target)
      .where('parent', '=', parentName);
    if (added.length > 0) {
      query = query.where('name', 'not in', added);
    }
    await query.execute();
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
    const tableRows = await (this.kysely as any)
      .selectFrom(schemaName)
      .selectAll()
      .execute();
    await this.prestigeTheTable(schemaName, tableRows);
  }

  async #loadChildren(
    parentName: string,
    fieldValueMap: FieldValueMap,
    tableFields: TargetField[]
  ) {
    for (const field of tableFields) {
      fieldValueMap[field.fieldname] = await this.getAll(field.target, {
        fields: ['*'],
        filters: { parent: parentName },
        orderBy: 'idx',
        order: 'asc',
      });
    }
  }

  async #getOne(schemaName: string, name: string, fields: string[]) {
    const fieldValueMap = await (this.kysely as any)
      .selectFrom(schemaName)
      .select(fields)
      .where('name', '=', name)
      .executeTakeFirst();
    return fieldValueMap as FieldValueMap;
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

    // Column fields
    const fields = this.schemaMap[schemaName]!.fields.filter(
      (f) => f.fieldtype !== FieldTypeEnum.Table && !f.computed
    );

    const validMap: FieldValueMap = {};
    for (const { fieldname } of fields) {
      const val = fieldValueMap[fieldname];
      if (val !== undefined) {
        validMap[fieldname] = this.#formatValueForDatabase(val);
      }
    }

    await (this.kysely as any)
      .insertInto(schemaName)
      .values(validMap)
      .execute();
  }

  async #updateSingleValues(
    singleSchemaName: string,
    fieldValueMap: FieldValueMap
  ) {
    const fields = this.schemaMap[singleSchemaName]!.fields.filter(
      (f) => !f.computed && f.fieldtype !== 'Table'
    );
    for (const field of fields) {
      const value = fieldValueMap[field.fieldname] as RawValue | undefined;
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
    const names = await this.kysely!.selectFrom('SingleValue')
      .select('name')
      .where('parent', '=', singleSchemaName)
      .where('fieldname', '=', fieldname)
      .execute();

    const stringValue = value === null ? null : String(value);

    if (!names?.length) {
      await this.#insertSingleValue(singleSchemaName, fieldname, value);
    } else {
      await this.kysely!.updateTable('SingleValue')
        .set({
          value: stringValue,
          modifiedBy: SYSTEM,
          modified: new Date().toISOString(),
        } as unknown as Record<string, unknown>)
        .where('parent', '=', singleSchemaName)
        .where('fieldname', '=', fieldname)
        .execute();
    }
  }

  async #insertSingleValue(
    singleSchemaName: string,
    fieldname: string,
    value: RawValue
  ) {
    const updateMap = getDefaultMetaFieldValueMap();
    const stringValue = value === null ? null : String(value);
    const fieldValueMap = Object.assign({}, updateMap, {
      parent: singleSchemaName,
      fieldname,
      value: stringValue,
      name: getRandomString(),
    });
    return await this.kysely!.insertInto('SingleValue')
      .values(fieldValueMap as unknown as InsertObject<DB, 'SingleValue'>)
      .execute();
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
      const fields = this.schemaMap[schemaName]!.fields;
      const defaultValues: FieldValueMap = fields.reduce((acc, f) => {
        if (f.default !== undefined) {
          acc[f.fieldname] = f.default;
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
    for (const key of Object.keys(updateMap)) {
      const val = updateMap[key];
      if (val === undefined) {
        delete updateMap[key];
      } else {
        updateMap[key] = this.#formatValueForDatabase(val);
      }
    }
    const schema = this.schemaMap[schemaName] as Schema;
    for (const { fieldname, fieldtype, computed } of schema.fields) {
      if (fieldtype !== FieldTypeEnum.Table && !computed) {
        continue;
      }

      delete updateMap[fieldname];
    }

    if (Object.keys(updateMap).length === 0) {
      return;
    }

    await (this.kysely as any)
      .updateTable(schemaName)
      .set(updateMap)
      .where('name', '=', fieldValueMap.name)
      .execute();
  }

  async #insertOrUpdateChildren(
    schemaName: string,
    fieldValueMap: FieldValueMap,
    isUpdate: boolean
  ) {
    let parentName = fieldValueMap.name as string;
    if (this.schemaMap[schemaName]?.isSingle) {
      parentName = schemaName;
    }

    const tableFields = this.#getTableFields(schemaName);

    for (const field of tableFields) {
      const added: string[] = [];

      const tableFieldValue = fieldValueMap[field.fieldname] as
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
    return this.schemaMap[schemaName]!.fields.filter(
      (f) => f.fieldtype === FieldTypeEnum.Table
    ) as TargetField[];
  }

  #formatValueForDatabase(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (typeof value === 'object') {
      if (typeof value.toISOString === 'function') {
        return value.toISOString();
      }
      if (typeof value.toString === 'function') {
        return value.toString();
      }
    }
    return value;
  }
}
