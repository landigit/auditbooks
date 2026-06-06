// fyo/demux/dbLynx.ts
// ---------------------------------------------------------------------------
// Pure-JS DatabaseDemuxBase for Vue Lynx Native.
//
// On a real device  → calls AuditbooksSqliteModule (Kotlin / Swift native)
// In rspeedy dev    → falls back to existing ipc.db.* HTTP calls (no change)
// ---------------------------------------------------------------------------
import type { SchemaMap } from "schemas/types";
import type { DatabaseDemuxBase, DatabaseMethod } from "utils/db/types";
import type { BackendResponse } from "utils/ipc/types";
import { getSchemas } from "schemas";
import {
  getDefaultMetaFieldValueMap,
  sqliteTypeMap,
} from "utils/db/lynxHelpers";
import type { FieldValueMap, SingleValue } from "backend/database/types";
import {
  type Field,
  FieldTypeEnum,
  type RawValue,
  type Schema,
} from "schemas/types";
import { getRandomString } from "utils";

// ============================================================================
// 1. Native SQLite client types
// ============================================================================
interface SqlResult {
  rows: Record<string, unknown>[];
  rowsAffected: number;
}

interface NativeSqliteModule {
  openDatabase(
    filename: string,
    onSuccess: (ok: boolean) => void,
    onError: (msg: string) => void,
  ): void;
  execute(
    sql: string,
    args: unknown[],
    onSuccess: (result: SqlResult) => void,
    onError: (msg: string) => void,
  ): void;
  closeDatabase(
    onSuccess: (ok: boolean) => void,
    onError: (msg: string) => void,
  ): void;
  deleteDatabase(
    filename: string,
    onSuccess: (ok: boolean) => void,
    onError: (msg: string) => void,
  ): void;
  listDatabases(
    onSuccess: (files: string[]) => void,
    onError: (msg: string) => void,
  ): void;
}

// ============================================================================
// 2. Detect Lynx native environment
// ============================================================================
function getNativeModule(): NativeSqliteModule | null {
  try {
    const lynx = (globalThis as any).lynx;
    if (lynx && typeof lynx.requireModule === "function") {
      return lynx.requireModule("AuditbooksSqliteModule") as NativeSqliteModule;
    }
  } catch {
    // not in Lynx shell (e.g. rspeedy web preview)
  }
  return null;
}

// ============================================================================
// 3. Promise-based wrapper around the callback native module
// ============================================================================
class NativeSqliteClient {
  readonly mod: NativeSqliteModule;
  schemaMap: SchemaMap = {};

  constructor(mod: NativeSqliteModule) {
    this.mod = mod;
  }

  open(filename: string): Promise<void> {
    return new Promise((res, rej) =>
      this.mod.openDatabase(
        filename,
        () => res(),
        (e) => rej(new Error(e)),
      ),
    );
  }

  execute(sql: string, args: unknown[] = []): Promise<SqlResult> {
    return new Promise((res, rej) =>
      this.mod.execute(
        sql,
        args,
        (r) => res(r),
        (e) => rej(new Error(`SQL error: ${e}\nSQL: ${sql}`)),
      ),
    );
  }

  close(): Promise<void> {
    return new Promise((res, rej) =>
      this.mod.closeDatabase(
        () => res(),
        (e) => rej(new Error(e)),
      ),
    );
  }

  deleteDb(filename: string): Promise<void> {
    return new Promise((res, rej) =>
      this.mod.deleteDatabase(
        filename,
        () => res(),
        (e) => rej(new Error(e)),
      ),
    );
  }

  listDbs(): Promise<string[]> {
    return new Promise((res, rej) =>
      this.mod.listDatabases(
        (f) => res(f),
        (e) => rej(new Error(e)),
      ),
    );
  }
}

// ============================================================================
// 4. Filter-array helper (mirrors DatabaseCore)
// ============================================================================
function getFiltersArray(filters: Record<string, unknown>) {
  const out: [string, string, unknown][] = [];
  for (const field in filters) {
    const value = filters[field];
    let operator = "=";
    let comparisonValue = value;
    if (Array.isArray(value)) {
      operator = (value[0] as string).toLowerCase();
      comparisonValue = value[1];
      if (operator === "includes") operator = "like";
      if (
        operator === "like" &&
        typeof comparisonValue === "string" &&
        !comparisonValue.includes("%")
      ) {
        comparisonValue = `%${comparisonValue}%`;
      }
    }
    out.push([field, operator, comparisonValue]);
    if (Array.isArray(value) && value.length > 2)
      out.push([field, value[2] as string, value[3]]);
  }
  return out;
}

// ============================================================================
// 5. LynxDatabaseCore — all DatabaseBase methods, no bun:sqlite
// ============================================================================
class LynxDatabaseCore {
  client: NativeSqliteClient;
  schemaMap: SchemaMap = {};
  readonly typeMap = sqliteTypeMap;

  constructor(client: NativeSqliteClient) {
    this.client = client;
  }

  setSchemaMap(sm: SchemaMap) {
    this.schemaMap = sm;
  }

  // -- exists --
  async exists(schemaName: string, name?: string): Promise<boolean> {
    const schema = this.schemaMap[schemaName] as Schema | undefined;
    if (schema?.isSingle) return this.singleExists(schemaName);
    const args: unknown[] = [];
    let sql = `SELECT name FROM "${schemaName}"`;
    if (name !== undefined) {
      sql += ` WHERE "name" = ?`;
      args.push(name);
    }
    sql += " LIMIT 1";
    const r = await this.client.execute(sql, args);
    return r.rows.length > 0;
  }

  private async singleExists(schemaName: string): Promise<boolean> {
    const r = await this.client.execute(
      `SELECT count("parent") as count FROM "SingleValue" WHERE "parent" = ? LIMIT 1`,
      [schemaName],
    );
    return Number(r.rows[0]?.count) > 0;
  }

  // -- insert --
  async insert(schemaName: string, fvm: FieldValueMap): Promise<FieldValueMap> {
    const schema = this.schemaMap[schemaName] as Schema | undefined;
    if (schema?.isSingle) {
      await this.updateSingleValues(schemaName, fvm);
    } else {
      await this.insertOne(schemaName, fvm);
    }
    await this.insertOrUpdateChildren(schemaName, fvm, false);
    return fvm;
  }

  // -- get --
  async get(
    schemaName: string,
    name = "",
    fields?: string | string[],
  ): Promise<FieldValueMap> {
    const schema = this.schemaMap[schemaName] as Schema | undefined;
    if (schema?.isSingle) return this.getSingle(schemaName);
    if (typeof fields === "string") fields = [fields];
    if (!fields) {
      fields = (schema?.fields ?? [])
        .filter((f: any) => !f.computed)
        .map((f: any) => f.fieldname as string);
    }
    const tableFields = this.getTableFields(schemaName);
    const tableFieldNames = tableFields.map((f: any) => f.fieldname as string);
    const nonTableFields = (fields as string[]).filter(
      (f) => !tableFieldNames.includes(f),
    );
    const fvm: FieldValueMap = nonTableFields.length
      ? ((await this.getOne(schemaName, name, nonTableFields)) ?? {})
      : {};
    const childFields = tableFields.filter((f: any) =>
      (fields as string[]).includes(f.fieldname),
    );
    if (childFields.length) await this.loadChildren(name, fvm, childFields);
    return fvm;
  }

  // -- getAll --
  async getAll(
    schemaName: string,
    options: any = {},
  ): Promise<FieldValueMap[]> {
    const schema = this.schemaMap[schemaName] as Schema | undefined;
    const hasCreated = schema?.fields?.some(
      (f: any) => f.fieldname === "created",
    );
    const {
      fields = ["name"],
      filters,
      offset,
      limit,
      groupBy,
      orderBy = hasCreated ? "created" : undefined,
      order = "desc",
    } = options as {
      fields?: string[];
      filters?: Record<string, unknown>;
      offset?: number;
      limit?: number;
      groupBy?: string | string[];
      orderBy?: string | string[];
      order?: string;
    };

    const selectStr =
      !fields || fields.length === 0 || fields.includes("*")
        ? "*"
        : fields.map((c) => `"${c}"`).join(", ");

    let sql = `SELECT ${selectStr} FROM "${schemaName}"`;
    const args: unknown[] = [];

    if (filters && Object.keys(filters).length > 0) {
      const fa = getFiltersArray(filters);
      const conditions: string[] = [];
      for (const [field, op, val] of fa) {
        if (op === "in" || op === "not in") {
          const arr = Array.isArray(val) ? val : [val];
          const hasNull = arr.includes(null);
          const nonNull = arr.filter((v) => v !== null);
          const sqlOp = op.toUpperCase();
          if (nonNull.length) {
            const ph = nonNull.map(() => "?").join(", ");
            if (hasNull) {
              conditions.push(
                sqlOp === "IN"
                  ? `("${field}" IN (${ph}) OR "${field}" IS NULL)`
                  : `("${field}" NOT IN (${ph}) AND "${field}" IS NOT NULL)`,
              );
            } else {
              conditions.push(`"${field}" ${sqlOp} (${ph})`);
            }
            args.push(...nonNull);
          } else if (hasNull) {
            conditions.push(
              sqlOp === "IN" ? `"${field}" IS NULL` : `"${field}" IS NOT NULL`,
            );
          }
        } else if (val === null && (op === "=" || op === "is")) {
          conditions.push(`"${field}" IS NULL`);
        } else if (val === null && (op === "!=" || op === "is not")) {
          conditions.push(`"${field}" IS NOT NULL`);
        } else {
          conditions.push(`"${field}" ${op} ?`);
          args.push(val);
        }
      }
      if (conditions.length) sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    if (groupBy) {
      const cols = Array.isArray(groupBy) ? groupBy : [groupBy];
      sql += ` GROUP BY ${cols.map((c) => `"${c}"`).join(", ")}`;
    }
    if (orderBy) {
      const cols = Array.isArray(orderBy) ? orderBy : [orderBy];
      sql += ` ORDER BY ${cols.map((c) => `"${c}"`).join(", ")} ${(order as string).toUpperCase()}`;
    }
    if (limit !== undefined) {
      sql += " LIMIT ?";
      args.push(limit);
    }
    if (offset !== undefined) {
      sql += " OFFSET ?";
      args.push(offset);
    }

    const r = await this.client.execute(sql, args);
    return r.rows as FieldValueMap[];
  }

  // -- getSingleValues --
  async getSingleValues(
    ...fieldnames: ({ fieldname: string; parent?: string } | string)[]
  ): Promise<SingleValue<RawValue>> {
    const list = fieldnames.map((f) =>
      typeof f === "string" ? { fieldname: f } : f,
    );
    const conditions: string[] = [];
    const args: unknown[] = [];
    for (const { fieldname, parent } of list) {
      if (parent === undefined) {
        conditions.push(`"fieldname" = ?`);
        args.push(fieldname);
      } else {
        conditions.push(`("fieldname" = ? AND "parent" = ?)`);
        args.push(fieldname, parent);
      }
    }
    try {
      const r = await this.client.execute(
        `SELECT fieldname, value, parent FROM "SingleValue" WHERE ${conditions.join(" OR ")}`,
        args,
      );
      return r.rows as any[];
    } catch {
      return [];
    }
  }

  // -- rename --
  async rename(
    schemaName: string,
    oldName: string,
    newName: string,
  ): Promise<void> {
    await this.client.execute(
      `UPDATE "${schemaName}" SET "name" = ? WHERE "name" = ?`,
      [newName, oldName],
    );
  }

  // -- update --
  async update(schemaName: string, fvm: FieldValueMap): Promise<void> {
    const schema = this.schemaMap[schemaName] as Schema | undefined;
    if (schema?.isSingle) await this.updateSingleValues(schemaName, fvm);
    else await this.updateOne(schemaName, fvm);
    await this.insertOrUpdateChildren(schemaName, fvm, true);
  }

  // -- delete --
  async delete(schemaName: string, name: string): Promise<void> {
    const schema = this.schemaMap[schemaName] as Schema | undefined;
    if (schema?.isSingle) {
      await this.deleteSingle(schemaName);
      return;
    }
    await this.deleteOne(schemaName, name);
    for (const tf of this.getTableFields(schemaName)) {
      await this.deleteChildren((tf as any).target, name);
    }
  }

  // -- deleteAll --
  async deleteAll(
    schemaName: string,
    filters: Record<string, unknown>,
  ): Promise<number> {
    let sql = `DELETE FROM "${schemaName}"`;
    const args: unknown[] = [];
    if (filters && Object.keys(filters).length > 0) {
      const fa = getFiltersArray(filters);
      const conditions: string[] = [];
      for (const [field, op, val] of fa) {
        if (val === null && (op === "=" || op === "is"))
          conditions.push(`"${field}" IS NULL`);
        else if (val === null) conditions.push(`"${field}" IS NOT NULL`);
        else {
          conditions.push(`"${field}" ${op} ?`);
          args.push(val);
        }
      }
      if (conditions.length) sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    const r = await this.client.execute(sql, args);
    return r.rowsAffected;
  }

  // -- close --
  async close(): Promise<void> {
    await this.client.close();
  }

  // -- migrate --
  async migrate(): Promise<void> {
    // Create SingleValue table first (other tables depend on singles)
    const svExists = await this.tableExists("SingleValue");
    if (!svExists) await this.createSingleValueTable();

    for (const [name, schema] of Object.entries(this.schemaMap)) {
      if (!schema || (schema as Schema).isSingle) continue;
      const exists = await this.tableExists(name);
      if (!exists) {
        await this.createTable(name);
        continue;
      }
      const diff = await this.getColumnDiff(name);
      for (const field of diff.added) await this.addColumn(name, field);
    }
    await this.initializeSingles();
  }

  // ============================================================================
  // Bespoke queries — raw SQL only, no Drizzle
  // ============================================================================
  async callBespoke(method: string, ...args: unknown[]): Promise<unknown> {
    switch (method) {
      case "getLastInserted": {
        const [sn] = args as [string];
        const r = await this.client.execute(
          `SELECT cast(name as int) as num FROM "${sn}" ORDER BY num DESC LIMIT 1`,
        );
        return Number(r.rows[0]?.num ?? 0);
      }
      case "getIncomeAndExpenses": {
        const [from, to] = args as [string, string];
        const income = await this.client.execute(
          `SELECT sum(cast(credit as real) - cast(debit as real)) as balance,
                  strftime('%Y-%m', date) as yearmonth
           FROM AccountingLedgerEntry
           WHERE reverted=0 AND date BETWEEN date(?) AND date(?)
             AND account IN (SELECT name FROM Account WHERE rootType='Income')
           GROUP BY yearmonth`,
          [from, to],
        );
        const expense = await this.client.execute(
          `SELECT sum(cast(debit as real) - cast(credit as real)) as balance,
                  strftime('%Y-%m', date) as yearmonth
           FROM AccountingLedgerEntry
           WHERE reverted=0 AND date BETWEEN date(?) AND date(?)
             AND account IN (SELECT name FROM Account WHERE rootType='Expense')
           GROUP BY yearmonth`,
          [from, to],
        );
        return { income: income.rows, expense: expense.rows };
      }
      case "getTotalCreditAndDebit": {
        const r = await this.client.execute(
          `SELECT account,
                  sum(cast(credit as real)) as totalCredit,
                  sum(cast(debit as real)) as totalDebit
           FROM AccountingLedgerEntry GROUP BY account`,
        );
        return r.rows;
      }
      case "getCashflow": {
        const [from, to] = args as [string, string];
        const r = await this.client.execute(
          `SELECT strftime('%Y-%m', date) as yearmonth,
                  sum(cast(debit as real)) as inflow,
                  sum(cast(credit as real)) as outflow
           FROM AccountingLedgerEntry
           WHERE reverted=0 AND date BETWEEN date(?) AND date(?)
             AND account IN (
               SELECT name FROM Account WHERE accountType IN ('Cash','Bank') AND isGroup='0'
             )
           GROUP BY yearmonth`,
          [from, to],
        );
        return r.rows;
      }
      case "getTotalOutstanding": {
        const [sn, from, to] = args as [string, string, string];
        const r = await this.client.execute(
          `SELECT sum(cast(baseGrandTotal as real)) as total,
                  sum(cast(outstandingAmount as real)) as outstanding
           FROM "${sn}"
           WHERE submitted=1 AND cancelled=0 AND date BETWEEN date(?) AND date(?)`,
          [from, to],
        );
        return r.rows[0] ?? {};
      }
      case "getStockQuantity": {
        const [item, location, from, to, batch] = args as [
          string,
          string?,
          string?,
          string?,
          string?,
        ];
        let sql = `SELECT sum(cast(quantity as real)) as total
                   FROM StockLedgerEntry WHERE item=?`;
        const a: unknown[] = [item];
        if (location) {
          sql += " AND location=?";
          a.push(location);
        }
        if (batch) {
          sql += " AND batch=?";
          a.push(batch);
        }
        if (from) {
          sql += " AND datetime(date) > datetime(?)";
          a.push(from);
        }
        if (to) {
          sql += " AND datetime(date) < datetime(?)";
          a.push(to);
        }
        const r = await this.client.execute(sql, a);
        const val = r.rows[0]?.total;
        return val == null ? null : Number(val);
      }
      default:
        throw new Error(`[LynxDemux] Unknown bespoke method: ${method}`);
    }
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private async tableExists(name: string): Promise<boolean> {
    const r = await this.client.execute(
      `SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
      [name],
    );
    return Number(r.rows[0]?.count) > 0;
  }

  private async createSingleValueTable(): Promise<void> {
    await this.client.execute(`
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
  }

  private async createTable(schemaName: string): Promise<void> {
    const schema = this.schemaMap[schemaName] as Schema | undefined;
    if (!schema) return;
    const columnDefs: string[] = [];
    const fks: string[] = [];
    for (const field of schema.fields) {
      if (field.fieldtype === FieldTypeEnum.Table || field.computed) continue;
      const sqlType =
        this.typeMap[field.fieldtype as keyof typeof sqliteTypeMap];
      if (!sqlType) continue;
      const t =
        sqlType === "integer"
          ? "INTEGER"
          : sqlType === "float"
            ? "REAL"
            : "TEXT";
      let def = `"${field.fieldname}" ${t}`;
      if (field.fieldname === "name") {
        def += " PRIMARY KEY NOT NULL";
      } else {
        if (field.required) def += " NOT NULL";
        if (field.default !== undefined) {
          const d =
            typeof field.default === "string"
              ? `'${(field.default as string).replace(/'/g, "''")}'`
              : field.default;
          def += ` DEFAULT ${d}`;
        }
      }
      columnDefs.push(def);
      if (field.fieldtype === FieldTypeEnum.Link && field.target) {
        const target = this.schemaMap[field.target as string] as
          | Schema
          | undefined;
        if (target) {
          fks.push(
            `FOREIGN KEY ("${field.fieldname}") REFERENCES "${target.name}"("name") ON UPDATE CASCADE ON DELETE RESTRICT`,
          );
        }
      }
    }
    const all = [...columnDefs, ...fks].join(", ");
    await this.client.execute(
      `CREATE TABLE IF NOT EXISTS "${schemaName}" (${all})`,
    );
  }

  private async addColumn(schemaName: string, field: Field): Promise<void> {
    const sqlType = this.typeMap[field.fieldtype as keyof typeof sqliteTypeMap];
    if (!sqlType) return;
    const t =
      sqlType === "integer" ? "INTEGER" : sqlType === "float" ? "REAL" : "TEXT";
    let def = `ALTER TABLE "${schemaName}" ADD COLUMN "${field.fieldname}" ${t}`;
    if (field.required) def += " NOT NULL";
    if (field.default !== undefined) {
      const d =
        typeof field.default === "string"
          ? `'${(field.default as string).replace(/'/g, "''")}'`
          : field.default;
      def += ` DEFAULT ${d}`;
    }
    await this.client.execute(def);
  }

  private async getColumnDiff(
    schemaName: string,
  ): Promise<{ added: Field[]; removed: string[] }> {
    const r = await this.client.execute(`PRAGMA table_info("${schemaName}")`);
    const existing = r.rows.map((row) => row.name as string);
    const schema = this.schemaMap[schemaName] as Schema | undefined;
    const added: Field[] = [];
    for (const f of schema?.fields ?? []) {
      if (
        !existing.includes(f.fieldname) &&
        this.typeMap[f.fieldtype as keyof typeof sqliteTypeMap]
      ) {
        added.push(f);
      }
    }
    return { added, removed: [] };
  }

  private async initializeSingles(): Promise<void> {
    for (const [schemaName, schema] of Object.entries(this.schemaMap)) {
      if (!(schema as Schema)?.isSingle) continue;
      for (const field of (schema as Schema).fields) {
        if (field.default === undefined || field.computed) continue;
        const ex = await this.client.execute(
          `SELECT count(*) as count FROM "SingleValue" WHERE parent=? AND fieldname=?`,
          [schemaName, field.fieldname],
        );
        if (Number(ex.rows[0]?.count) === 0) {
          const meta = getDefaultMetaFieldValueMap();
          await this.client.execute(
            `INSERT INTO "SingleValue"
               (name, parent, fieldname, value, created, modified, modifiedBy, createdBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              getRandomString(),
              schemaName,
              field.fieldname,
              field.default,
              meta.created,
              meta.modified,
              meta.modifiedBy,
              meta.createdBy,
            ],
          );
        }
      }
    }
  }

  private getTableFields(schemaName: string): Field[] {
    const schema = this.schemaMap[schemaName] as Schema | undefined;
    return (schema?.fields ?? []).filter(
      (f: any) => f.fieldtype === FieldTypeEnum.Table,
    );
  }

  private async insertOne(
    schemaName: string,
    fvm: FieldValueMap,
  ): Promise<void> {
    const schema = this.schemaMap[schemaName] as Schema | undefined;
    const cols = (schema?.fields ?? [])
      .filter(
        (f: any) =>
          !f.computed &&
          f.fieldtype !== FieldTypeEnum.Table &&
          this.typeMap[f.fieldtype as keyof typeof sqliteTypeMap],
      )
      .map((f: any) => f.fieldname as string)
      .filter((c) => fvm[c] !== undefined);
    if (!cols.length) return;
    const ph = cols.map(() => "?").join(", ");
    await this.client.execute(
      `INSERT INTO "${schemaName}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${ph})`,
      cols.map((c) => fvm[c] ?? null),
    );
  }

  private async updateOne(
    schemaName: string,
    fvm: FieldValueMap,
  ): Promise<void> {
    const schema = this.schemaMap[schemaName] as Schema | undefined;
    const cols = (schema?.fields ?? [])
      .filter(
        (f: any) =>
          !f.computed &&
          f.fieldtype !== FieldTypeEnum.Table &&
          this.typeMap[f.fieldtype as keyof typeof sqliteTypeMap] &&
          f.fieldname !== "name",
      )
      .map((f: any) => f.fieldname as string)
      .filter((c) => fvm[c] !== undefined);
    if (!cols.length) return;
    const set = cols.map((c) => `"${c}" = ?`).join(", ");
    await this.client.execute(
      `UPDATE "${schemaName}" SET ${set} WHERE "name" = ?`,
      [...cols.map((c) => fvm[c] ?? null), fvm.name],
    );
  }

  private async getOne(
    schemaName: string,
    name: string,
    fields: string[],
  ): Promise<FieldValueMap | null> {
    const selectStr = fields.map((c) => `"${c}"`).join(", ");
    const r = await this.client.execute(
      `SELECT ${selectStr} FROM "${schemaName}" WHERE "name" = ? LIMIT 1`,
      [name],
    );
    return (r.rows[0] as FieldValueMap) ?? null;
  }

  private async deleteOne(schemaName: string, name: string): Promise<void> {
    await this.client.execute(`DELETE FROM "${schemaName}" WHERE "name" = ?`, [
      name,
    ]);
  }

  private async deleteChildren(
    childSchema: string,
    parentName: string,
  ): Promise<void> {
    await this.client.execute(
      `DELETE FROM "${childSchema}" WHERE "parent" = ?`,
      [parentName],
    );
  }

  private async getSingle(schemaName: string): Promise<FieldValueMap> {
    const r = await this.client.execute(
      `SELECT fieldname, value FROM "SingleValue" WHERE "parent" = ?`,
      [schemaName],
    );
    const out: FieldValueMap = {};
    for (const row of r.rows)
      out[row.fieldname as string] = row.value as RawValue;
    return out;
  }

  private async updateSingleValues(
    schemaName: string,
    fvm: FieldValueMap,
  ): Promise<void> {
    const meta = getDefaultMetaFieldValueMap();
    for (const [fieldname, value] of Object.entries(fvm)) {
      const ex = await this.client.execute(
        `SELECT count(*) as count FROM "SingleValue" WHERE parent=? AND fieldname=?`,
        [schemaName, fieldname],
      );
      if (Number(ex.rows[0]?.count) > 0) {
        await this.client.execute(
          `UPDATE "SingleValue" SET value=?, modified=?, modifiedBy=?
           WHERE parent=? AND fieldname=?`,
          [value, meta.modified, meta.modifiedBy, schemaName, fieldname],
        );
      } else {
        await this.client.execute(
          `INSERT INTO "SingleValue"
             (name, parent, fieldname, value, created, modified, modifiedBy, createdBy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            getRandomString(),
            schemaName,
            fieldname,
            value,
            meta.created,
            meta.modified,
            meta.modifiedBy,
            meta.createdBy,
          ],
        );
      }
    }
  }

  private async deleteSingle(schemaName: string): Promise<void> {
    await this.client.execute(`DELETE FROM "SingleValue" WHERE "parent" = ?`, [
      schemaName,
    ]);
  }

  private async loadChildren(
    parentName: string,
    fvm: FieldValueMap,
    tableFields: Field[],
  ): Promise<void> {
    for (const tf of tableFields) {
      const r = await this.client.execute(
        `SELECT * FROM "${(tf as any).target}" WHERE "parent" = ? ORDER BY "idx" ASC`,
        [parentName],
      );
      fvm[tf.fieldname] = r.rows as FieldValueMap[];
    }
  }

  private async insertOrUpdateChildren(
    schemaName: string,
    fvm: FieldValueMap,
    isUpdate: boolean,
  ): Promise<void> {
    for (const tf of this.getTableFields(schemaName)) {
      const children = (fvm[(tf as any).fieldname] as FieldValueMap[]) ?? [];
      if (isUpdate)
        await this.deleteChildren((tf as any).target, fvm.name as string);
      for (const child of children) {
        await this.insertOne((tf as any).target, {
          ...child,
          parent: fvm.name,
        });
      }
    }
  }
}

// ============================================================================
// 6. LynxDemux — implements DatabaseDemuxBase
// ============================================================================
export class LynxDemux implements DatabaseDemuxBase {
  private core: LynxDatabaseCore | null = null;
  private mod: NativeSqliteModule | null = null;
  readonly isNative: boolean;

  constructor() {
    this.mod = getNativeModule();
    this.isNative = this.mod !== null;
  }

  async getSchemaMap(): Promise<SchemaMap> {
    if (this.isNative) {
      // getSchemas(countryCode, customFields) — use defaults; country code
      // is resolved from the DB after connect via SystemSettings.countryCode
      return getSchemas("in", []) as SchemaMap;
    }
    return this.ipcCall<SchemaMap>(() => ipc.db.getSchema());
  }

  async createNewDatabase(
    dbPath: string,
    countryCode?: string,
  ): Promise<string> {
    if (this.isNative) return this.openOrCreate(dbPath, countryCode ?? "in");
    return this.ipcCall<string>(() => ipc.db.create(dbPath, countryCode));
  }

  async connectToDatabase(
    dbPath: string,
    countryCode?: string,
  ): Promise<string> {
    if (this.isNative) return this.openOrCreate(dbPath, countryCode);
    return this.ipcCall<string>(() => ipc.db.connect(dbPath, countryCode));
  }

  async call(method: DatabaseMethod, ...args: unknown[]): Promise<unknown> {
    if (this.isNative && this.core) {
      return (this.core as any)[method](...args);
    }
    return this.ipcCall(() => ipc.db.call(method, ...args));
  }

  async callBespoke(method: string, ...args: unknown[]): Promise<unknown> {
    if (this.isNative && this.core) {
      return this.core.callBespoke(method, ...args);
    }
    return this.ipcCall(() => ipc.db.bespoke(method, ...args));
  }

  // ---- Private helpers ----

  private async openOrCreate(
    dbPath: string,
    countryCode = "in",
  ): Promise<string> {
    const filename = dbPath.split(/[\\/]/).pop() ?? dbPath;
    const client = new NativeSqliteClient(this.mod!);
    await client.open(filename);

    const schemaMap = await this.getSchemaMap();
    const core = new LynxDatabaseCore(client);
    core.setSchemaMap(schemaMap);
    await core.migrate();
    this.core = core;

    try {
      const sv = await core.getSingleValues({
        fieldname: "countryCode",
        parent: "SystemSettings",
      });
      if (sv.length > 0) return (sv[0] as any).value as string;
    } catch {
      // new DB
    }
    return countryCode;
  }

  private async ipcCall<T>(fn: () => Promise<BackendResponse>): Promise<T> {
    const res = await fn();
    if (res.error?.name) {
      const err = new Error(`${res.error.name}: ${res.error.message}`);
      err.stack = res.error.stack;
      throw err;
    }
    return res.data as T;
  }
}

// ============================================================================
// 7. Exports
// ============================================================================

// Singleton factory
let _demux: LynxDemux | null = null;
export function getLynxDemux(): LynxDemux {
  if (!_demux) _demux = new LynxDemux();
  return _demux;
}

/** Helper for DatabaseSelector-lynx.vue */
export async function listNativeDatabases(): Promise<string[]> {
  const mod = getNativeModule();
  if (!mod) return [];
  return new Promise((resolve) => {
    mod.listDatabases(
      (files) => resolve(files),
      () => resolve([]),
    );
  });
}
