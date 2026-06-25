import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';
import BetterSQLite3 from 'better-sqlite3';

function deleteEverything() {
  const configPath = join(
    os.homedir(),
    'AppData',
    'Roaming',
    'com.landigit.books',
    'config.json'
  );

  let dbPaths: string[] = [];

  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      if (config.files && Array.isArray(config.files)) {
        dbPaths = config.files.map((f: any) => f.dbPath).filter(Boolean);
      }
    } catch (err: any) {
      console.warn(`Warning: Could not parse config.json: ${err.message}`);
    }
  }

  const mainDbPath =
    process.env.DB_PATH ||
    join(process.cwd(), '..', 'GRVEP', 'GRVe Printers.db');
  if (!dbPaths.includes(mainDbPath)) {
    dbPaths.push(mainDbPath);
  }

  for (const dbPath of dbPaths) {
    if (!existsSync(dbPath)) continue;

    console.log(`Connecting to database to clear tables: ${dbPath}`);
    try {
      const db = new BetterSQLite3(dbPath);

      // 1. Payments
      const pCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='Payment'"
        )
        .get();
      if (pCheck) {
        const r1 = db.prepare('DELETE FROM Payment').run();
        console.log(`Deleted ${r1.changes} records from Payment`);
      }
      const pfCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='PaymentFor'"
        )
        .get();
      if (pfCheck) {
        const r2 = db.prepare('DELETE FROM PaymentFor').run();
        console.log(`Deleted ${r2.changes} records from PaymentFor`);
      }

      // 2. Sales Invoices
      const siCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='SalesInvoice'"
        )
        .get();
      if (siCheck) {
        const r3 = db.prepare('DELETE FROM SalesInvoice').run();
        console.log(`Deleted ${r3.changes} records from SalesInvoice`);
      }
      const siiCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='SalesInvoiceItem'"
        )
        .get();
      if (siiCheck) {
        const r4 = db.prepare('DELETE FROM SalesInvoiceItem').run();
        console.log(`Deleted ${r4.changes} records from SalesInvoiceItem`);
      }

      // 3. Purchase Invoices (Bills)
      const piCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='PurchaseInvoice'"
        )
        .get();
      if (piCheck) {
        const r5 = db.prepare('DELETE FROM PurchaseInvoice').run();
        console.log(`Deleted ${r5.changes} records from PurchaseInvoice`);
      }
      const piiCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='PurchaseInvoiceItem'"
        )
        .get();
      if (piiCheck) {
        const r6 = db.prepare('DELETE FROM PurchaseInvoiceItem').run();
        console.log(`Deleted ${r6.changes} records from PurchaseInvoiceItem`);
      }

      // 4. Journal Entries
      const jeCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='JournalEntry'"
        )
        .get();
      if (jeCheck) {
        const r8 = db.prepare('DELETE FROM JournalEntry').run();
        console.log(`Deleted ${r8.changes} records from JournalEntry`);
      }
      const jeaCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='JournalEntryAccount'"
        )
        .get();
      if (jeaCheck) {
        const r9 = db.prepare('DELETE FROM JournalEntryAccount').run();
        console.log(`Deleted ${r9.changes} records from JournalEntryAccount`);
      }

      // 5. Ledger Entries
      const aleCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='AccountingLedgerEntry'"
        )
        .get();
      if (aleCheck) {
        const r7 = db
          .prepare(
            "DELETE FROM AccountingLedgerEntry WHERE referenceType IN ('Payment', 'SalesInvoice', 'PurchaseInvoice', 'JournalEntry')"
          )
          .run();
        console.log(`Deleted ${r7.changes} records from AccountingLedgerEntry`);
      }

      db.close();
    } catch (err: any) {
      console.error(`Error clearing tables in ${dbPath}: ${err.message}`);
    }
  }
}

deleteEverything();
