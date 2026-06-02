import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import * as schema from './schema';
import * as relations from './relations';

// Initialize the SQLite client pointing to our local SQLite database.
let client: Database.Database;
try {
  client = new Database('drizzle/db/demo.db');
} catch {
  client = new Database(':memory:');
}

// Configure pragmas for performance optimization (skip during testing to prevent SQLITE_BUSY concurrent lock errors)
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  try {
    client.exec('PRAGMA foreign_keys=ON');
    client.exec('PRAGMA journal_mode=WAL');
    client.exec('PRAGMA synchronous=NORMAL');
  } catch (err) {
    console.error(
      'Failed to configure SQLite client optimization pragmas:',
      err
    );
  }
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
