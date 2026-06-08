import { DatabaseError, NotImplemented } from 'fyo/utils/errors';
import { SchemaMap, FieldValueMap, RawValue, SingleValue } from 'schemas/types';
import { DatabaseDemuxBase, DatabaseMethod, GetAllOptions, QueryFilter } from 'utils/db/types';
import { getSchemas } from 'schemas';
import { getRandomString } from 'utils';
import { db, getTable, setRemoteCallback } from 'drizzle/db/client';
import { singleValue } from 'drizzle/db/schema';
import { eq, ne, like, inArray, notInArray, gt, gte, lt, lte, isNull, isNotNull, and, or, desc, asc, sql, SQL, between } from 'drizzle-orm';
import { accountingLedgerEntry, account, salesInvoice, payment, paymentFor, stockLedgerEntry } from 'drizzle/db/schema';
import { sqliteTypeMap, getDefaultMetaFieldValueMap } from 'utils/db/lynxHelpers';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
const isLynx = typeof globalThis !== 'undefined' && (globalThis as any).lynx && typeof (globalThis as any).lynx.requireModule === 'function';

async function openDbFile(dbPath: string): Promise<void> {
  const isAbsolute = dbPath.startsWith('/') || /^[A-Za-z]:/.test(dbPath);
  const filename = isAbsolute ? dbPath : (dbPath.split(/[/\\]/).pop() ?? dbPath);

  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('db_close').catch(() => {});
    await invoke('db_open', { path: filename });

    setRemoteCallback(async (querySql, params, method) => {
      const isQuery = method === 'all' || method === 'get' || method === 'values';
      const cleanedParams = params.map(p => typeof p === 'boolean' ? (p ? 1 : 0) : p);
      if (isQuery) {
        const rows = await invoke<any[]>('db_query', { sql: querySql, args: cleanedParams });
        return { rows: rows ?? [] };
      } else {
        const affected = await invoke<number>('db_execute', { sql: querySql, args: cleanedParams });
        return { rows: [], rowsAffected: affected ?? 0 };
      }
    });
  } else if (isLynx) {
    const mod = (globalThis as any).lynx.requireModule('AuditbooksSqliteModule');
    await new Promise<void>((resolve, reject) => {
      mod.openDatabase(filename, () => resolve(), (e: any) => reject(new Error(e)));
    });

    setRemoteCallback(async (querySql, params, method) => {
      const cleanedParams = params.map(p => typeof p === 'boolean' ? (p ? 1 : 0) : p);
      return new Promise((resolve, reject) => {
        mod.execute(querySql, cleanedParams, (result: any) => {
          resolve({ rows: result.rows ?? [], rowsAffected: result.rowsAffected ?? 0 });
        }, (err: any) => {
          reject(new Error(err));
        });
      });
    });
  }
}

async function migrate(schemaMap: SchemaMap) {
  // 1. Create SingleValue table if it does not exist
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "SingleValue" (
      "name" TEXT PRIMARY KEY NOT NULL,
      "parent" TEXT,
      "fieldname" TEXT,
      "value" TEXT,
      "created" TEXT,
      "modified" TEXT,
      "modifiedBy" TEXT,
      "createdBy" TEXT
    )`);

  // 2. Migrate normal tables
  for (const [schemaName, schema] of Object.entries(schemaMap)) {
    if (!schema || schema.isSingle) continue;

    const existsRes = await db.run(sql`
      SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name=${schemaName}
    `);
    const exists = Number((existsRes as any).rows?.[0]?.count ?? 0) > 0;

    if (!exists) {
      const colDefs: string[] = [];
      const fks: string[] = [];
      for (const field of schema.fields) {
        if (field.fieldtype === 'Table' || field.computed) continue;
        const type = sqliteTypeMap[field.fieldtype];
        if (!type) continue;

        const sqlType = type === 'integer' ? 'INTEGER' : type === 'float' ? 'REAL' : 'TEXT';
        let def = `"${field.fieldname}" ${sqlType}`;
        if (field.fieldname === 'name') {
          def += ' PRIMARY KEY NOT NULL';
        } else {
          if (field.required) def += ' NOT NULL';
          if (field.default !== undefined) {
            const d = typeof field.default === 'string'
              ? `'${field.default.replace(/'/g, "''")}'`
              : field.default;
            def += ` DEFAULT ${d}`;
          }
        }
        colDefs.push(def);

        if (field.fieldtype === 'Link' && field.target) {
          const target = schemaMap[field.target];
          if (target) {
            fks.push(`FOREIGN KEY ("${field.fieldname}") REFERENCES "${target.name}"("name") ON UPDATE CASCADE ON DELETE RESTRICT`);
          }
        }
      }

      const allDefs = [...colDefs, ...fks].join(', ');
      await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS "${schemaName}" (${allDefs})`));
    } else {
      const tableInfo = await db.run(sql.raw(`PRAGMA table_info("${schemaName}")`));
      const existingCols = (tableInfo as any).rows.map((row: any) => row.name as string);

      for (const field of schema.fields) {
        if (field.fieldtype === 'Table' || field.computed) continue;
        if (existingCols.includes(field.fieldname)) continue;
        const type = sqliteTypeMap[field.fieldtype];
        if (!type) continue;

        const sqlType = type === 'integer' ? 'INTEGER' : type === 'float' ? 'REAL' : 'TEXT';
        let def = `ALTER TABLE "${schemaName}" ADD COLUMN "${field.fieldname}" ${sqlType}`;
        if (field.required) def += ' NOT NULL';
        if (field.default !== undefined) {
          const d = typeof field.default === 'string'
            ? `'${field.default.replace(/'/g, "''")}'`
            : field.default;
          def += ` DEFAULT ${d}`;
        }
        await db.run(sql.raw(def));
      }
    }
  }

  // 3. Initialize single values
  for (const [schemaName, schema] of Object.entries(schemaMap)) {
    if (!schema?.isSingle) continue;
    for (const field of schema.fields) {
      if (field.default === undefined || field.computed) continue;
      const ex = await db.select({ count: sql<number>`count(*)` })
        .from(singleValue)
        .where(and(eq(singleValue.parent, schemaName), eq(singleValue.fieldname, field.fieldname)));
      if ((ex[0]?.count ?? 0) === 0) {
        const meta = getDefaultMetaFieldValueMap();
        await db.insert(singleValue).values({
          name: getRandomString(),
          parent: schemaName,
          fieldname: field.fieldname,
          value: String(field.default),
          created: meta.created,
          modified: meta.modified,
          modifiedBy: meta.modifiedBy,
          createdBy: meta.createdBy,
        });
      }
    }
  }
}

function buildConditions(table: any, filters?: QueryFilter): SQL[] {
  const conditions: SQL[] = [];
  if (!filters) return conditions;

  for (const [fieldname, filterVal] of Object.entries(filters)) {
    if (filterVal === undefined || !(fieldname in table)) continue;
    const col = table[fieldname];

    let op = '=';
    let val = filterVal;
    if (Array.isArray(filterVal)) {
      op = String(filterVal[0]).toLowerCase();
      val = filterVal[1];
    }

    if (val === null) {
      if (op === '=' || op === 'is') {
        conditions.push(isNull(col));
      } else {
        conditions.push(isNotNull(col));
      }
      continue;
    }

    switch (op) {
      case '=':
      case 'is':
        conditions.push(eq(col, val as any));
        break;
      case '!=':
      case 'is not':
        conditions.push(ne(col, val as any));
        break;
      case 'like':
      case 'includes':
        conditions.push(like(col, typeof val === 'string' && !val.includes('%') ? `%${val}%` : String(val)));
        break;
      case 'in':
        const inArr = Array.isArray(val) ? val : [val];
        if (inArr.length > 0) {
          conditions.push(inArray(col, inArr as any));
        }
        break;
      case 'not in':
        const notInArr = Array.isArray(val) ? val : [val];
        if (notInArr.length > 0) {
          conditions.push(notInArray(col, notInArr as any));
        }
        break;
      case '>':
        conditions.push(gt(col, val as any));
        break;
      case '>=':
        conditions.push(gte(col, val as any));
        break;
      case '<':
        conditions.push(lt(col, val as any));
        break;
      case '<=':
        conditions.push(lte(col, val as any));
        break;
    }
  }
  return conditions;
}

export class DatabaseDemux extends DatabaseDemuxBase {
  #isElectron = false;
  schemaMap: SchemaMap = {};

  constructor(isElectron: boolean) {
    super();
    this.#isElectron = isElectron;
  }

  async getSchemaMap(): Promise<SchemaMap> {
    if (this.#isElectron && !isTauri && !isLynx) {
      const response = await ipc.db.getSchema();
      if (response.error?.name) throw new DatabaseError(response.error.message);
      return response.data as SchemaMap;
    }
    return getSchemas('in', []) as SchemaMap;
  }

  async createNewDatabase(
    dbPath: string,
    countryCode?: string
  ): Promise<string> {
    if (this.#isElectron && !isTauri && !isLynx) {
      const response = await ipc.db.create(dbPath, countryCode);
      if (response.error?.name) throw new DatabaseError(response.error.message);
      return response.data as string;
    }

    await openDbFile(dbPath);
    this.schemaMap = await this.getSchemaMap();
    await migrate(this.schemaMap);
    return countryCode ?? 'in';
  }

  async connectToDatabase(
    dbPath: string,
    countryCode?: string
  ): Promise<string> {
    if (this.#isElectron && !isTauri && !isLynx) {
      const response = await ipc.db.connect(dbPath, countryCode);
      if (response.error?.name) throw new DatabaseError(response.error.message);
      return response.data as string;
    }

    await openDbFile(dbPath);
    this.schemaMap = await this.getSchemaMap();
    await migrate(this.schemaMap);

    try {
      const sv = await this.getSingleValues({
        fieldname: 'countryCode',
        parent: 'SystemSettings',
      });
      if (sv && sv.length > 0) {
        return sv[0].value as string;
      }
    } catch {
      // Return default if SystemSettings doesn't exist yet
    }

    return countryCode ?? 'in';
  }

  async call(method: DatabaseMethod, ...args: unknown[]): Promise<unknown> {
    if (this.#isElectron && !isTauri && !isLynx) {
      const response = await ipc.db.call(method, ...args);
      if (response.error?.name) {
        const dberror = new DatabaseError(`${response.error.name}\n${response.error.message}`);
        dberror.stack = response.error.stack;
        throw dberror;
      }
      return response.data;
    }

    // Client-side pure Drizzle implementation
    switch (method) {
      case 'exists': {
        const [schemaName, name] = args as [string, string?];
        const schema = this.schemaMap[schemaName];
        if (schema?.isSingle) {
          const res = await db.select({ count: sql<number>`count(*)` })
            .from(singleValue)
            .where(eq(singleValue.parent, schemaName));
          return (res[0]?.count ?? 0) > 0;
        }

        const table = getTable(schemaName);
        let results;
        if (name !== undefined) {
          results = await db.select({ name: table.name }).from(table).where(eq(table.name, name)).limit(1);
        } else {
          results = await db.select({ name: table.name }).from(table).limit(1);
        }
        return results.length > 0;
      }

      case 'insert': {
        const [schemaName, fvm] = args as [string, FieldValueMap];
        const schema = this.schemaMap[schemaName];
        if (schema?.isSingle) {
          for (const [fieldname, value] of Object.entries(fvm)) {
            const existing = await db.select({ name: singleValue.name })
              .from(singleValue)
              .where(and(eq(singleValue.parent, schemaName), eq(singleValue.fieldname, fieldname)))
              .limit(1);
            if (existing.length > 0) {
              await db.update(singleValue)
                .set({ value: String(value), modified: new Date().toISOString() })
                .where(eq(singleValue.name, existing[0].name));
            } else {
              await db.insert(singleValue).values({
                name: getRandomString(),
                parent: schemaName,
                fieldname,
                value: String(value),
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
              });
            }
          }
        } else {
          const table = getTable(schemaName);
          const insertData: any = {};
          for (const field of schema.fields) {
            if (field.fieldtype !== 'Table' && !field.computed && fvm[field.fieldname] !== undefined) {
              insertData[field.fieldname] = fvm[field.fieldname];
            }
          }
          if (!insertData.name) {
            insertData.name = getRandomString();
            fvm.name = insertData.name;
          }
          await db.insert(table).values(insertData);
        }

        // Insert children
        const childFields = schema?.fields.filter(f => f.fieldtype === 'Table') ?? [];
        for (const cf of childFields) {
          const children = (fvm[cf.fieldname] as any[]) || [];
          const childTable = getTable(cf.target);
          const childSchema = this.schemaMap[cf.target];
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
              ...child,
              name: child.name || getRandomString(),
              parent: fvm.name,
              parentSchemaName: schemaName,
              parentFieldname: cf.fieldname,
              idx: child.idx !== undefined ? child.idx : i,
            };
            const childInsertData: any = {};
            for (const f of childSchema.fields) {
              if (f.fieldtype !== 'Table' && !f.computed && childData[f.fieldname] !== undefined) {
                childInsertData[f.fieldname] = childData[f.fieldname];
              }
            }
            await db.insert(childTable).values(childInsertData);
          }
        }
        return fvm;
      }

      case 'get': {
        const [schemaName, name, fields] = args as [string, string, (string | string[])?];
        const schema = this.schemaMap[schemaName];
        if (schema?.isSingle) {
          const rows = await db.select().from(singleValue).where(eq(singleValue.parent, schemaName));
          const fvm: FieldValueMap = {};
          for (const row of rows) {
            fvm[row.fieldname!] = row.value;
          }
          // Load child tables for single
          const childFields = schema.fields.filter(f => f.fieldtype === 'Table');
          for (const cf of childFields) {
            const childTable = getTable(cf.target);
            const children = await db.select().from(childTable)
              .where(eq(childTable.parent, schemaName))
              .orderBy(asc(childTable.idx));
            fvm[cf.fieldname] = children;
          }
          return fvm;
        }

        const table = getTable(schemaName);
        const results = await db.select().from(table).where(eq(table.name, name)).limit(1);
        const fvm = (results[0] as FieldValueMap) || null;
        if (!fvm) return null;

        // Load children
        const selectFields = typeof fields === 'string' ? [fields] : (fields || []);
        const childFields = schema.fields.filter(f => f.fieldtype === 'Table' && (selectFields.length === 0 || selectFields.includes(f.fieldname)));
        for (const cf of childFields) {
          const childTable = getTable(cf.target);
          const children = await db.select().from(childTable)
            .where(eq(childTable.parent, name))
            .orderBy(asc(childTable.idx));
          fvm[cf.fieldname] = children;
        }
        return fvm;
      }

      case 'getAll': {
        const [schemaName, options] = args as [string, GetAllOptions?];
        const table = getTable(schemaName);
        let query = db.select().from(table);

        const conds = buildConditions(table, options?.filters);
        if (conds.length) {
          query = query.where(and(...conds)) as any;
        }

        if (options?.groupBy) {
          const cols = Array.isArray(options.groupBy) ? options.groupBy : [options.groupBy];
          const groupBys = cols.map(c => table[c]).filter(Boolean);
          if (groupBys.length) {
            query = query.groupBy(...groupBys) as any;
          }
        }

        if (options?.orderBy) {
          const cols = Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy];
          const orderFn = options.order === 'asc' ? asc : desc;
          const orderBys = cols.map(c => table[c] ? orderFn(table[c]) : null).filter(Boolean);
          if (orderBys.length) {
            query = query.orderBy(...orderBys as any) as any;
          }
        }

        if (options?.limit !== undefined) {
          query = query.limit(options.limit) as any;
        }
        if (options?.offset !== undefined) {
          query = query.offset(options.offset) as any;
        }

        return await query;
      }

      case 'getSingleValues': {
        const fieldnames = args as ({ fieldname: string; parent?: string } | string)[];
        const conditions: SQL[] = [];
        for (const f of fieldnames) {
          const { fieldname, parent } = typeof f === 'string' ? { fieldname: f, parent: undefined } : f;
          if (parent === undefined) {
            conditions.push(eq(singleValue.fieldname, fieldname));
          } else {
            conditions.push(and(eq(singleValue.fieldname, fieldname), eq(singleValue.parent, parent)));
          }
        }
        if (conditions.length === 0) return [];
        return await db.select({
          fieldname: singleValue.fieldname,
          parent: singleValue.parent,
          value: singleValue.value,
        }).from(singleValue).where(or(...conditions));
      }

      case 'rename': {
        const [schemaName, oldName, newName] = args as [string, string, string];
        const table = getTable(schemaName);
        await db.update(table).set({ name: newName }).where(eq(table.name, oldName));
        return;
      }

      case 'update': {
        const [schemaName, fvm] = args as [string, FieldValueMap];
        const schema = this.schemaMap[schemaName];
        if (schema?.isSingle) {
          for (const [fieldname, value] of Object.entries(fvm)) {
            const existing = await db.select({ name: singleValue.name })
              .from(singleValue)
              .where(and(eq(singleValue.parent, schemaName), eq(singleValue.fieldname, fieldname)))
              .limit(1);
            if (existing.length > 0) {
              await db.update(singleValue)
                .set({ value: String(value), modified: new Date().toISOString() })
                .where(eq(singleValue.name, existing[0].name));
            } else {
              await db.insert(singleValue).values({
                name: getRandomString(),
                parent: schemaName,
                fieldname,
                value: String(value),
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
              });
            }
          }
        } else {
          const table = getTable(schemaName);
          const updateData: any = {};
          for (const field of schema.fields) {
            if (field.fieldtype !== 'Table' && !field.computed && fvm[field.fieldname] !== undefined && field.fieldname !== 'name') {
              updateData[field.fieldname] = fvm[field.fieldname];
            }
          }
          await db.update(table).set(updateData).where(eq(table.name, fvm.name as string));
        }

        // Update children by deleting and recreating
        const childFields = schema?.fields.filter(f => f.fieldtype === 'Table') ?? [];
        for (const cf of childFields) {
          const childTable = getTable(cf.target);
          await db.delete(childTable).where(eq(childTable.parent, fvm.name as string));

          const children = (fvm[cf.fieldname] as any[]) || [];
          const childSchema = this.schemaMap[cf.target];
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
              ...child,
              name: child.name || getRandomString(),
              parent: fvm.name,
              parentSchemaName: schemaName,
              parentFieldname: cf.fieldname,
              idx: child.idx !== undefined ? child.idx : i,
            };
            const childInsertData: any = {};
            for (const f of childSchema.fields) {
              if (f.fieldtype !== 'Table' && !f.computed && childData[f.fieldname] !== undefined) {
                childInsertData[f.fieldname] = childData[f.fieldname];
              }
            }
            await db.insert(childTable).values(childInsertData);
          }
        }
        return;
      }

      case 'delete': {
        const [schemaName, name] = args as [string, string];
        const schema = this.schemaMap[schemaName];
        if (schema?.isSingle) {
          await db.delete(singleValue).where(eq(singleValue.parent, schemaName));
          return;
        }

        const table = getTable(schemaName);
        await db.delete(table).where(eq(table.name, name));

        const childFields = schema?.fields.filter(f => f.fieldtype === 'Table') ?? [];
        for (const cf of childFields) {
          const childTable = getTable(cf.target);
          await db.delete(childTable).where(eq(childTable.parent, name));
        }
        return;
      }

      case 'deleteAll': {
        const [schemaName, filters] = args as [string, QueryFilter];
        const table = getTable(schemaName);
        const conds = buildConditions(table, filters);

        // Count matching records first
        let countQuery = db.select({ count: sql<number>`count(*)` }).from(table);
        if (conds.length) {
          countQuery = countQuery.where(and(...conds)) as any;
        }
        const countRes = await countQuery;
        const count = countRes[0]?.count ?? 0;

        let deleteQuery = db.delete(table);
        if (conds.length) {
          deleteQuery = deleteQuery.where(and(...conds)) as any;
        }
        await deleteQuery;
        return count;
      }

      case 'close': {
        if (isTauri) {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('db_close').catch(() => {});
        } else if (isLynx) {
          const mod = (globalThis as any).lynx.requireModule('AuditbooksSqliteModule');
          await new Promise<void>((resolve, reject) => {
            mod.closeDatabase(() => resolve(), (e: any) => reject(new Error(e)));
          });
        }
        return;
      }

      default:
        throw new NotImplemented();
    }
  }

  async callBespoke(method: string, ...args: unknown[]): Promise<unknown> {
    if (this.#isElectron && !isTauri && !isLynx) {
      const response = await ipc.db.bespoke(method, ...args);
      if (response.error?.name) {
        throw new DatabaseError(response.error.message);
      }
      return response.data;
    }

    switch (method) {
      case 'getLastInserted': {
        const [sn] = args as [string];
        const table = getTable(sn);
        const res = await db.select({ num: sql<number>`cast(${table.name} as int)` })
          .from(table)
          .orderBy(desc(sql`num`))
          .limit(1);
        return res[0]?.num ?? 0;
      }

      case 'getIncomeAndExpenses': {
        const [from, to] = args as [string, string];
        const income = await db
          .select({
            balance: sql<number>`sum(cast(${accountingLedgerEntry.credit} as real) - cast(${accountingLedgerEntry.debit} as real))`,
            yearmonth: sql<string>`strftime('%Y-%m', ${accountingLedgerEntry.date})`.as('yearmonth'),
          })
          .from(accountingLedgerEntry)
          .where(
            and(
              eq(accountingLedgerEntry.reverted, '0'),
              between(accountingLedgerEntry.date, from, to),
              inArray(
                accountingLedgerEntry.account,
                db.select({ name: account.name }).from(account).where(eq(account.rootType, 'Income'))
              )
            )
          )
          .groupBy(sql`yearmonth`);

        const expense = await db
          .select({
            balance: sql<number>`sum(cast(${accountingLedgerEntry.debit} as real) - cast(${accountingLedgerEntry.credit} as real))`,
            yearmonth: sql<string>`strftime('%Y-%m', ${accountingLedgerEntry.date})`.as('yearmonth'),
          })
          .from(accountingLedgerEntry)
          .where(
            and(
              eq(accountingLedgerEntry.reverted, '0'),
              between(accountingLedgerEntry.date, from, to),
              inArray(
                accountingLedgerEntry.account,
                db.select({ name: account.name }).from(account).where(eq(account.rootType, 'Expense'))
              )
            )
          )
          .groupBy(sql`yearmonth`);

        return { income, expense };
      }

      case 'getTotalCreditAndDebit': {
        return await db
          .select({
            account: accountingLedgerEntry.account,
            totalCredit: sql<number>`sum(cast(${accountingLedgerEntry.credit} as real))`,
            totalDebit: sql<number>`sum(cast(${accountingLedgerEntry.debit} as real))`,
          })
          .from(accountingLedgerEntry)
          .groupBy(accountingLedgerEntry.account);
      }

      case 'getCashflow': {
        const [from, to] = args as [string, string];
        const cashAndBankAccounts = db
          .select({ name: account.name })
          .from(account)
          .where(
            and(
              inArray(account.accountType, ['Cash', 'Bank']),
              eq(account.isGroup, '0')
            )
          );
        const dateAsMonthYear = sql`strftime('%Y-%m', ${accountingLedgerEntry.date})`;
        return await db
          .select({
            yearmonth: dateAsMonthYear.as('yearmonth'),
            inflow: sql<number>`sum(cast(${accountingLedgerEntry.debit} as real))`,
            outflow: sql<number>`sum(cast(${accountingLedgerEntry.credit} as real))`,
          })
          .from(accountingLedgerEntry)
          .where(
            and(
              eq(accountingLedgerEntry.reverted, '0'),
              inArray(accountingLedgerEntry.account, cashAndBankAccounts),
              between(accountingLedgerEntry.date, from, to)
            )
          )
          .groupBy(dateAsMonthYear);
      }

      case 'getTotalOutstanding': {
        const [sn, from, to] = args as [string, string, string];
        const table = getTable(sn);
        const result = await db
          .select({
            total: sql<number>`sum(cast(${table.baseGrandTotal} as real))`,
            outstanding: sql<number>`sum(cast(${table.outstandingAmount} as real))`,
          })
          .from(table)
          .where(
            and(
              eq(table.submitted, true),
              eq(table.cancelled, false),
              between(table.date, from, to)
            )
          )
          .limit(1);
        return result[0] || {};
      }

      case 'getStockQuantity': {
        const [item, location, fromDate, toDate, batch] = args as [string, string?, string?, string?, string?];
        const conditions: SQL[] = [eq(stockLedgerEntry.item, item)];
        if (location) conditions.push(eq(stockLedgerEntry.location, location));
        if (batch) conditions.push(eq(stockLedgerEntry.batch, batch));
        if (fromDate) conditions.push(sql`datetime(${stockLedgerEntry.date}) > datetime(${fromDate})`);
        if (toDate) conditions.push(sql`datetime(${stockLedgerEntry.date}) < datetime(${toDate})`);

        const res = await db
          .select({
            total: sql<number>`sum(cast(${stockLedgerEntry.quantity} as real))`,
          })
          .from(stockLedgerEntry)
          .where(and(...conditions));
        return res[0]?.total == null ? null : Number(res[0].total);
      }

      default:
        throw new Error(`[DatabaseDemux] Unknown bespoke method: ${method}`);
    }
  }
}
