import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import * as schema from './schema';
import * as relations from './relations';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { safeGet, safeSet } from '../../utils/index';

export type RemoteCallback = (
  sql: string,
  params: any[],
  method: 'run' | 'all' | 'values' | 'get'
) => Promise<{ rows: any[] }>;

let remoteCallback: RemoteCallback | null = null;

export function setRemoteCallback(cb: RemoteCallback) {
  remoteCallback = cb;
}

// Create the Drizzle database instance with pre-registered schemas and relationships.
export const db = drizzle(
  async (sql, params, method) => {
    if (!remoteCallback) {
      throw new Error(
        'Drizzle remote callback has not been set. Call setRemoteCallback(cb) first.'
      );
    }
    return remoteCallback(sql, params, method);
  },
  {
    schema: { ...schema, ...relations },
  }
);

// Pre-build a case-insensitive map of table names (both camelCase and PascalCase) to Drizzle table objects.
const tables: Record<string, any> = Object.create(null);

for (const [key, val] of Object.entries(schema)) {
  if (val && typeof val === 'object') {
    try {
      const config = getTableConfig(val as any);
      if (config && config.name) {
        safeSet(tables, config.name.toLowerCase(), val);
        safeSet(tables, key.toLowerCase(), val);
      }
    } catch (e) {
      // Not a Drizzle table object, skip
    }
  }
}

/**
 * Gets a Drizzle table object dynamically by its name (case-insensitive).
 */
export function getTable(name: string) {
  const table = safeGet(tables, name.toLowerCase());
  if (!table) {
    throw new Error(`Table "${name}" not found in Drizzle schema.`);
  }
  return table;
}

export type DbType = typeof db;
export * as schema from './schema';
export * as relations from './relations';

// Core Inferred Database Row Models
export type AccountingLedgerEntry = InferSelectModel<
  typeof schema.accountingLedgerEntry
>;
export type NewAccountingLedgerEntry = InferInsertModel<
  typeof schema.accountingLedgerEntry
>;

export type SalesInvoice = InferSelectModel<typeof schema.salesInvoice>;
export type NewSalesInvoice = InferInsertModel<typeof schema.salesInvoice>;

export type PurchaseInvoice = InferSelectModel<typeof schema.purchaseInvoice>;
export type NewPurchaseInvoice = InferInsertModel<
  typeof schema.purchaseInvoice
>;

export type Account = InferSelectModel<typeof schema.account>;
export type NewAccount = InferInsertModel<typeof schema.account>;

export type Payment = InferSelectModel<typeof schema.payment>;
export type NewPayment = InferInsertModel<typeof schema.payment>;
