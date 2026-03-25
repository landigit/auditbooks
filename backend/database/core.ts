import Database from 'better-sqlite3';
import { NotFoundError, ValueError, getDbError } from 'fyo/utils/errors';
import { Kysely, SqliteDialect, sql } from 'kysely';
import type {
  AlterTableColumnAlteringBuilder,
  ComparisonOperatorExpression,
  InsertObject,
  ReferenceExpression,
  SelectQueryBuilder,
  UpdateObject,
} from 'kysely';
import {
  type Field,
  FieldTypeEnum,
  type RawValue,
  type Schema,
  type SchemaMap,
  type TargetField,
} from 'schemas/types';
import type { DB } from 'src/types/db';
import { getIsNullOrUndef, getRandomString, getValueMapFromList } from 'utils';
import {
  DatabaseBase,
  type GetAllOptions,
  type QueryFilter,
} from 'utils/db/types';
import { SYSTEM, getDefaultMetaFieldValueMap, sqliteTypeMap } from '../helpers';
import type {
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
 * This is the ORM, the DatabaseCore interface (function signatures) should be
 * replicated by the frontend demuxes and all the backend muxes.
 */

export default class DatabaseCore extends DatabaseBase {
  db?: Kysely<DB>;
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
      if (db.db) {
        query = await db.db
          .selectFrom('SingleValue')
          .select('value')
          .where('fieldname', '=', 'countryCode')
          .where('parent', '=', 'SystemSettings')
          .execute();
      }
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
    const nativeDb = new Database(this.dbPath);
    nativeDb.pragma('foreign_keys = ON');

    this.db = new Kysely<DB>({
      dialect: new SqliteDialect({
        database: nativeDb,
      }),
    });
  }

  async close() {
    await this.db?.destroy();
  }

  async migrate(config: MigrationConfig = {}) {
    console.log('[DatabaseCore] Starting migration...');
    const { create, alter } = await this.#getCreateAlterList();
    console.log(`[DatabaseCore] Create: ${create.length}, Alter: ${alter.length}`);
    const hasSingleValueTable = !create.includes('SingleValue');
    let singlesConfig: UpdateSinglesConfig = {
      update: [],
      updateNonExtant: [],
    };

    if (hasSingleValueTable) {
      console.log('[DatabaseCore] Fetching singles update list...');
      singlesConfig = await this.#getSinglesUpdateList();
    }

    const shouldMigrate = !!(
      create.length ||
      alter.length ||
      singlesConfig.update.length ||
      singlesConfig.updateNonExtant.length
    );

    if (!shouldMigrate) {
      console.log('[DatabaseCore] Nothing to migrate.');
      return;
    }

    await config.pre?.();
    for (const schemaName of create) {
      console.log(`[DatabaseCore] Creating table: ${schemaName}`);
      await this.#createTable(schemaName);
    }

    for (const alterConfig of alter) {
      console.log(`[DatabaseCore] Altering table: ${alterConfig.schemaName}`);
      await this.#alterTable(alterConfig);
    }

    if (!hasSingleValueTable) {
      console.log('[DatabaseCore] Fetching singles update list (post-create)...');
      singlesConfig = await this.#getSinglesUpdateList();
    }

    console.log('[DatabaseCore] Initializing singles...');
    await this.#initializeSingles(singlesConfig);
    await config.post?.();
    console.log('[DatabaseCore] Migration complete.');
  }

  async #getCreateAlterList() {
    const create: string[] = [];
    const alter: AlterConfig[] = [];

    const tables = this.db ? await this.db.introspection.getTables() : [];
    const tableNames = tables.map((t) => t.name);

    for (const [schemaName, schema] of Object.entries(this.schemaMap)) {
      if (!schema || schema.isSingle) {
        continue;
      }

      const exists = tableNames.includes(schemaName);
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

    let row: unknown[] = [];
    try {
      if (this.db) {
        let query = this.db.selectFrom(schemaName as keyof DB).selectAll();
        if (name !== undefined) {
          // @ts-ignore
          query = query.where('name', '=', name);
        }
        const result = await query.limit(1).execute();
        row = result;
      }
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
    if (this.schemaMap[schemaName]?.isSingle) {
      await this.#updateSingleValues(schemaName, fieldValueMap);
    } else {
      await this.#insertOneInternal(schemaName, fieldValueMap);
    }

    await this.#insertOrUpdateChildren(schemaName, fieldValueMap, false);
    return fieldValueMap;
  }

  async get(
    schemaName: string,
    name = '',
    fields?: string | string[]
  ): Promise<FieldValueMap> {
    const schema = this.schemaMap[schemaName] as Schema;
    if (schema === undefined) {
      throw new NotFoundError(`schema ${schemaName} not found`);
    }
    if (!schema.isSingle && !name) {
      throw new ValueError('name is mandatory');
    }

    if (schema.isSingle) {
      return await this.#getSingle(schemaName);
    }

    const targetFields =
      fields === undefined
        ? schema.fields.filter((f) => !f.computed).map((f) => f.fieldname)
        : typeof fields === 'string'
          ? [fields]
          : fields;

    const allTableFields: TargetField[] = this.#getTableFields(schemaName);
    const allTableFieldNames: string[] = allTableFields.map((f) => f.fieldname);
    const tableFields: TargetField[] = allTableFields.filter((f: TargetField) =>
      targetFields.includes(f.fieldname)
    );
    const nonTableFieldNames: string[] = targetFields.filter(
      (f: string) => !allTableFieldNames.includes(f)
    );

    let fieldValueMap: FieldValueMap = {};
    if (nonTableFieldNames.length > 0) {
      fieldValueMap =
        (await this.#getOne(schemaName, name, nonTableFieldNames)) ?? {};
    }

    if (tableFields.length > 0) {
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
    } = options as GetAllOptions;

    if (this.db) {
      let query = this.db.selectFrom(schemaName as keyof DB);

      if (!fields || fields === '*' || (Array.isArray(fields) && fields.includes('*'))) {
        query = query.selectAll() as unknown as SelectQueryBuilder<
          DB,
          keyof DB,
          FieldValueMap
        >;
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: <reason>
        query = query.select(fields as any);
      }

      const filtersArray = this.#getFiltersArray(filters ?? {});
      for (const [field, operator, comparisonValue] of filtersArray) {
        if (comparisonValue === undefined) {
          continue;
        }
        const effectiveValue = this.#convertBooleans(comparisonValue);
        if (operator === 'in' && Array.isArray(effectiveValue)) {
          query = query.where(
            field as ReferenceExpression<DB, keyof DB>,
            'in',
            // biome-ignore lint/suspicious/noExplicitAny: <reason>
            effectiveValue as any
          );
        } else {
          query = query.where(
            field as ReferenceExpression<DB, keyof DB>,
            operator as ComparisonOperatorExpression,
            // biome-ignore lint/suspicious/noExplicitAny: <reason>
            effectiveValue as any
          );
        }
      }

      if (orderBy) {
        if (Array.isArray(orderBy)) {
          for (const col of orderBy) {
            query = query.orderBy(
              col as ReferenceExpression<DB, keyof DB>,
              order
            );
          }
        } else {
          query = query.orderBy(
            orderBy as ReferenceExpression<DB, keyof DB>,
            order
          );
        }
      }

      if (groupBy) {
        if (Array.isArray(groupBy)) {
          for (const col of groupBy) {
            query = query.groupBy(col as ReferenceExpression<DB, keyof DB>);
          }
        } else {
          query = query.groupBy(groupBy as ReferenceExpression<DB, keyof DB>);
        }
      }

      if (offset) query = query.offset(offset);
      if (limit) query = query.limit(limit);

      return (await query.execute()) as FieldValueMap[];
    }
    return [];
  }

  async deleteAll(schemaName: string, filters: QueryFilter): Promise<number> {
    if (this.db) {
      let query = this.db.deleteFrom(schemaName as keyof DB);
      const filtersArray = this.#getFiltersArray(filters);
      for (const [field, operator, comparisonValue] of filtersArray) {
        query = query.where(
          field as ReferenceExpression<DB, keyof DB>,
          operator as ComparisonOperatorExpression,
          // biome-ignore lint/suspicious/noExplicitAny: <reason>
          comparisonValue as any
        );
      }
      const result = await query.execute();
      return result.reduce(
        (acc, res) => acc + Number(res.numDeletedRows || 0),
        0
      );
    }
    return 0;
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

    if (this.db) {
      let query = this.db.selectFrom('SingleValue');
      // @ts-ignore
      query = query.where((eb) =>
        eb.or(
          fieldnameList.map((f) => {
            if (typeof f === 'string') {
              return eb('fieldname', '=', f);
            }
            const { fieldname, parent } = f;
            if (parent) {
              return eb.and([
                eb('fieldname', '=', fieldname),
                eb('parent', '=', parent),
              ]);
            }
            return eb('fieldname', '=', fieldname);
          })
        )
      );

      const res = await query
        .select(['fieldname', 'value', 'parent'])
        .execute();
      return res as unknown as SingleValue<RawValue>;
    }

    return [];
  }

  async rename(schemaName: string, oldName: string, newName: string) {
    if (this.db) {
      await this.db
        .updateTable(schemaName as keyof DB)
        // biome-ignore lint/suspicious/noExplicitAny: <reason>
        .set({ name: newName } as any)
        .where('name', '=', oldName)
        .execute();
    }
  }

  async update(schemaName: string, fieldValueMap: FieldValueMap) {
    if (this.schemaMap[schemaName]?.isSingle) {
      await this.#updateSingleValues(schemaName, fieldValueMap);
    } else {
      await this.#updateOne(schemaName, fieldValueMap);
    }

    await this.#insertOrUpdateChildren(schemaName, fieldValueMap, true);
  }

  async delete(schemaName: string, name: string) {
    const schema = this.schemaMap[schemaName] as Schema;
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

  async truncate(tableNames?: string[]) {
    let targetTables = tableNames;
    if (targetTables === undefined) {
      if (this.db) {
        // biome-ignore lint/suspicious/noExplicitAny: <reason>
        const result = await sql<any>`
          select name from sqlite_schema
          where type='table'
          and name not like 'sqlite_%'
        `.execute(this.db);
        targetTables = (result.rows || []).map((i) => i.name);
      }
    }

    if (targetTables) {
      for (const name of targetTables) {
        if (this.db) {
          await this.db.deleteFrom(name as keyof DB).execute();
        }
      }
    }
  }

  async #tableExists(schemaName: string): Promise<boolean> {
    if (this.db) {
      const q = (await this.db.introspection.getTables()).find(
        (t) => t.name === schemaName
      );
      return !!q;
    }
    return false;
  }

  async #singleExists(singleSchemaName: string): Promise<boolean> {
    if (this.db) {
      const result = await this.db
        .selectFrom('SingleValue')
        .select((eb) => eb.fn.count('parent').as('count'))
        .where('parent', '=', singleSchemaName)
        .executeTakeFirst();
      const count = result?.count;
      return !!count && Number(count) > 0;
    }
    return false;
  }

  async #dropColumns(schemaName: string, targetColumns: string[]) {
    if (this.db) {
      let builder = this.db.schema.alterTable(schemaName);
      for (const column of targetColumns) {
        // biome-ignore lint/suspicious/noExplicitAny: <reason>
        builder = builder.dropColumn(column) as any;
      }
      // biome-ignore lint/suspicious/noExplicitAny: <reason>
      return await (builder as any).execute();
    }
  }

  async prestigeTheTable(schemaName: string, tableRows: FieldValueMap[]) {
    const tempName = `__${schemaName}`;

    if (this.db) {
      await this.db.schema.dropTable(tempName).ifExists().execute();
      // biome-ignore lint/suspicious/noExplicitAny: <reason>
      await (sql as any)`PRAGMA foreign_keys=OFF`.execute(this.db);
      await this.#createTable(schemaName, tempName);

      if (tableRows.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < tableRows.length; i += batchSize) {
          const batch = tableRows
            .slice(i, i + batchSize)
            .map((row) => this.#convertBooleans(row));
          await this.db
            // biome-ignore lint/suspicious/noExplicitAny: <reason>
            .insertInto(tempName as any)
            // biome-ignore lint/suspicious/noExplicitAny: <reason>
            .values(batch as any)
            .execute();
        }
      }

      await this.db.schema.dropTable(schemaName).execute();
      await this.db.schema.alterTable(tempName).renameTo(schemaName).execute();
      await sql`PRAGMA foreign_keys=ON`.execute(this.db);
    }
  }

  async #getTableColumns(schemaName: string): Promise<string[]> {
    if (this.db) {
      const result = await sql<FieldValueMap>`PRAGMA table_info(${sql.raw(
        schemaName
      )})`.execute(this.db);
      const info: FieldValueMap[] = result.rows ?? [];
      return info.map((d) => d.name as string);
    }
    return [];
  }

  async #getForeignKeys(schemaName: string): Promise<string[]> {
    if (this.db) {
      const result = await sql<FieldValueMap>`PRAGMA foreign_key_list(${sql.raw(
        schemaName
      )})`.execute(this.db);
      const foreignKeyList: FieldValueMap[] = result.rows ?? [];
      return foreignKeyList.map((d) => d.from as string);
    }
    return [];
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
      if (comparisonValue !== undefined) {
        filtersArray.push([field, operator, comparisonValue]);
      }

      if (Array.isArray(value) && value.length > 2) {
        const op2 = value[2];
        const val2 = value[3];
        if (val2 !== undefined) {
          filtersArray.push([field, op2, val2]);
        }
      }
    }

    return filtersArray;
  }

  async #getColumnDiff(schemaName: string): Promise<ColumnDiff> {
    const tableColumns = await this.#getTableColumns(schemaName);
    const validFields =
      this.schemaMap[schemaName]?.fields?.filter((f) => !f.computed) ?? [];
    const diff: ColumnDiff = { added: [], removed: [] };

    for (const field of validFields) {
      const hasDbType = Object.hasOwn(this.typeMap, field.fieldtype);
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
    if (this.db) {
      for (const field of diff.added) {
        const builder = this.db.schema.alterTable(schemaName);
        const finalBuilder = this.#addColumnToKyselyBuilder(builder, field);
        await (
          finalBuilder as unknown as AlterTableColumnAlteringBuilder
        ).execute();
      }

      if (diff.removed.length) {
        await this.#dropColumns(schemaName, diff.removed);
      }

      if (newForeignKeys.length) {
        await this.#addForeignKeys(schemaName);
      }
    }
  }

  async #createTable(schemaName: string, tableName?: string) {
    const targetTableName = tableName ?? schemaName;
    const fields =
      this.schemaMap[schemaName]?.fields?.filter((f) => !f.computed) ?? [];

    if (this.db) {
      let builder = this.db.schema.createTable(targetTableName);
      for (const field of fields) {
        builder = this.#addColumnToKyselyBuilder(builder, field);
      }
      // biome-ignore lint/suspicious/noExplicitAny: <reason>
      return await (builder as any).execute();
    }
  }

  async #getNonExtantSingleValues(singleSchemaName: string) {
    const fields = this.schemaMap[singleSchemaName]?.fields ?? [];
    const selection = fields.map((f) => f.fieldname);
    if (selection.length === 0) {
      return [];
    }
    let existingFields: { fieldname: string }[] = [];
    if (this.db) {
      existingFields = await this.db
        .selectFrom('SingleValue')
        .where('parent', '=', singleSchemaName)
        // @ts-ignore
        .select('fieldname')
        .execute();
    }

    const existingNames = existingFields.map((f) => f.fieldname);
    const nonExtant: { fieldname: string; value: RawValue }[] = [];
    for (const field of fields) {
      if (
        field.default !== undefined &&
        !existingNames.includes(field.fieldname)
      ) {
        nonExtant.push({ fieldname: field.fieldname, value: field.default });
      }
    }

    return nonExtant;
  }

  async #deleteOne(schemaName: string, name: string) {
    if (this.db) {
      return await this.db
        .deleteFrom(schemaName as keyof DB)
        .where('name', '=', name)
        .execute();
    }
  }

  async #deleteSingle(schemaName: string, fieldname: string) {
    if (this.db) {
      return await this.db
        .deleteFrom('SingleValue')
        .where('parent', '=', schemaName)
        .where('fieldname', '=', fieldname)
        .execute();
    }
  }

  #deleteChildren(schemaName: string, parentName: string) {
    if (this.db) {
      return (
        this.db
          .deleteFrom(schemaName as keyof DB)
          // @ts-ignore
          .where('parent', '=', parentName)
          .execute()
      );
    }
  }

  #runDeleteOtherChildren(
    field: TargetField,
    parentName: string,
    added: string[]
  ) {
    if (this.db) {
      return (
        this.db
          .deleteFrom(field.target as keyof DB)
          // @ts-ignore
          .where('parent', '=', parentName)
          // @ts-ignore
          .where('name', 'not in', added)
          .execute()
      );
    }
  }

  #prepareChild(
    parentSchemaName: string,
    parentName: string,
    child: FieldValueMap,
    field: TargetField,
    idx: number
  ) {
    child.parent = parentName;
    child.parentSchemaName = parentSchemaName;
    child.parentFieldname = field.fieldname;
    child.idx ??= idx;
  }

  async #addForeignKeys(schemaName: string) {
    if (this.db) {
      const tableRows = (await this.db
        // biome-ignore lint/suspicious/noExplicitAny: <reason>
        .selectFrom(schemaName as any)
        .selectAll()
        .execute()) as FieldValueMap[];
      if (tableRows.length > 0) {
        await this.prestigeTheTable(schemaName, tableRows);
      }
    }
  }

  async #loadChildren(
    parentName: string,
    fieldValueMap: FieldValueMap,
    tableFields: TargetField[]
  ) {
    for (const field of tableFields) {
      fieldValueMap[field.fieldname] = await this.getAll(field.target, {
        fields: '*',
        filters: { parent: parentName },
        orderBy: 'idx',
        order: 'asc',
      });
    }
  }

  async #getOne(
    schemaName: string,
    name: string,
    fields: string[]
  ): Promise<FieldValueMap> {
    if (this.db) {
      let query = this.db
        // biome-ignore lint/suspicious/noExplicitAny: <reason>
        .selectFrom(schemaName as any);

      if (fields.includes('*')) {
        // biome-ignore lint/suspicious/noExplicitAny: <reason>
        query = query.selectAll() as any;
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: <reason>
        query = query.select(fields as any);
      }

      const fieldValueMap = (await query
        // @ts-ignore
        .where('name', '=', name)
        .executeTakeFirst()) as FieldValueMap;
      return fieldValueMap || {};
    }
    return {};
  }

  async #getSingle(schemaName: string): Promise<FieldValueMap> {
    const values = await this.getAll('SingleValue', {
      fields: ['fieldname', 'value'],
      filters: { parent: schemaName },
      orderBy: 'fieldname',
      order: 'asc',
    });

    const fieldValueMap = getValueMapFromList(
      values || [],
      'fieldname',
      'value'
    ) as FieldValueMap;
    const tableFields: TargetField[] = this.#getTableFields(schemaName);
    if (tableFields.length) {
      await this.#loadChildren(schemaName, fieldValueMap, tableFields);
    }

    return fieldValueMap;
  }

  #insertOneInternal(schemaName: string, fieldValueMap: FieldValueMap) {
    if (!fieldValueMap.name) {
      fieldValueMap.name = getRandomString();
    }

    const fields =
      this.schemaMap[schemaName]?.fields?.filter(
        (f) => f.fieldtype !== FieldTypeEnum.Table && !f.computed
      ) ?? [];

    const validMap: FieldValueMap = {};
    for (const { fieldname } of fields) {
      validMap[fieldname] = this.#convertBooleans(fieldValueMap[fieldname]);
    }

    return (
      this.db
        // biome-ignore lint/suspicious/noExplicitAny: <reason>
        ?.insertInto(schemaName as any)
        // biome-ignore lint/suspicious/noExplicitAny: <reason>
        .values(validMap as any)
        .execute()
    );
  }

  async #updateSingleValues(
    singleSchemaName: string,
    fieldValueMap: FieldValueMap
  ) {
    const fields =
      this.schemaMap[singleSchemaName]?.fields?.filter(
        (f) => !f.computed && f.fieldtype !== 'Table'
      ) ?? [];
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
    if (this.db) {
      const names = await this.db
        .selectFrom('SingleValue')
        .select('name')
        .where('parent', '=', singleSchemaName)
        .where('fieldname', '=', fieldname)
        .execute();

      if (!names?.length) {
        return await this.#insertSingleValue(
          singleSchemaName,
          fieldname,
          value
        );
      }
      return await this.db
        .updateTable('SingleValue')
        .set({
          // biome-ignore lint/suspicious/noExplicitAny: <reason>
          value: this.#convertBooleans(value) as any,
          modifiedBy: SYSTEM,
          modified: new Date().toISOString(),
        })
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
    const fieldValueMap: FieldValueMap = Object.assign({}, updateMap, {
      parent: singleSchemaName,
      fieldname,
      value: this.#convertBooleans(value),
      name: getRandomString(),
    });
    return await this.db
      ?.insertInto('SingleValue')
      // biome-ignore lint/suspicious/noExplicitAny: <reason>
      .values(fieldValueMap as any)
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
      const fields = this.schemaMap[schemaName]?.fields;
      if (!fields) {
        continue;
      }

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
    const updateMap = this.#convertBooleans(fieldValueMap) as FieldValueMap;
    updateMap.name = undefined;
    const schema = this.schemaMap[schemaName] as Schema;
    for (const { fieldname, fieldtype, computed } of schema.fields) {
      if (fieldtype === FieldTypeEnum.Table || computed) {
        updateMap[fieldname] = undefined;
      }
    }

    const updateKeys = Object.keys(updateMap).filter(
      (k) => updateMap[k] !== undefined
    );
    if (updateKeys.length === 0) {
      return;
    }

    return await this.db
      ?.updateTable(schemaName as keyof DB)
      // biome-ignore lint/suspicious/noExplicitAny: <reason>
      .set(updateMap as any)
      .where('name', '=', fieldValueMap.name as string)
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
          child.name &&
          (await this.exists(field.target, child.name as string))
        ) {
          await this.update(field.target, child);
        } else {
          await this.insert(field.target, child);
        }

        added.push(child.name as string);
      }

      if (isUpdate) {
        await this.#runDeleteOtherChildren(field, parentName, added);
      }
    }
  }

  #getTableFields(schemaName: string): TargetField[] {
    return (this.schemaMap[schemaName]?.fields.filter(
      (f) => f.fieldtype === FieldTypeEnum.Table
    ) ?? []) as TargetField[];
  }

  // biome-ignore lint/suspicious/noExplicitAny: <reason>
  #addColumnToKyselyBuilder(builder: any, field: Field): any {
    if (field.fieldtype === FieldTypeEnum.Table) {
      return builder;
    }

    const columnType = this.typeMap[field.fieldtype];
    if (!columnType) {
      return builder;
    }

    // biome-ignore lint/suspicious/noExplicitAny: <reason>
    return builder.addColumn(field.fieldname, columnType as any, (col: any) => {
      let column = col;
      if (field.fieldname === 'name') {
        column = column.primaryKey();
      }

      if (field.default !== undefined) {
        column = column.defaultTo(field.default);
      }

      if (field.required) {
        column = column.notNull();
      }

      const isLink = field.fieldtype === FieldTypeEnum.Link && field.target;
      if (isLink) {
        const targetSchemaName = field.target as string;
        const targetSchema = this.schemaMap[targetSchemaName] as Schema;
        column = column
          .references(`${targetSchema.name}.name`)
          .onUpdate('cascade')
          .onDelete('restrict');
      }

      return column;
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: <reason>
  #convertBooleans(value: any): any {
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.#convertBooleans(v));
    }
    if (
      typeof value === 'object' &&
      value !== null &&
      !(value instanceof Date)
    ) {
      // biome-ignore lint/suspicious/noExplicitAny: <reason>
      const obj: any = {};
      for (const key in value) {
        obj[key] = this.#convertBooleans(value[key]);
      }
      return obj;
    }
    return value;
  }
}
