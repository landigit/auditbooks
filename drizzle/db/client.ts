import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import * as schema from './schema';
import * as relations from './relations';

// Initialize the LibSQL client pointing to our local SQLite database.
const client = createClient({
  url: 'file:drizzle/db/demo.db',
});

// Configure pragmas for performance optimization (skip during testing to prevent SQLITE_BUSY concurrent lock errors)
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  (async () => {
    try {
      await client.execute('PRAGMA foreign_keys=ON');
      await client.execute('PRAGMA journal_mode=WAL');
      await client.execute('PRAGMA synchronous=NORMAL');
    } catch (err) {
      console.error(
        'Failed to configure SQLite client optimization pragmas:',
        err
      );
    }
  })();
}

// Create the Drizzle database instance with pre-registered schemas and relationships.
export const db = drizzle(client, {
  schema: { ...schema, ...relations },
});

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
