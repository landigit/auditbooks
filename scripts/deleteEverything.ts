import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { createClient } from '@libsql/client';

async function deleteEverything() {
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
      const config: unknown = JSON.parse(readFileSync(configPath, 'utf8'));
      if (
        config &&
        typeof config === 'object' &&
        'files' in config &&
        Array.isArray(config.files)
      ) {
        dbPaths = config.files
          .map((f: unknown) => {
            if (f && typeof f === 'object' && 'dbPath' in f) {
              return typeof f.dbPath === 'string' ? f.dbPath : null;
            }
            return null;
          })
          .filter((p): p is string => p !== null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`Warning: Could not parse config.json: ${message}`);
    }
  }

  const mainDbPath =
    process.env['DB_PATH'] ||
    join(process.cwd(), '..', 'GRVEP', 'GRVe Printers.db');
  if (!dbPaths.includes(mainDbPath)) {
    dbPaths.push(mainDbPath);
  }

  for (const dbPath of dbPaths) {
    if (!existsSync(dbPath)) continue;

    console.log(`Connecting to database to clear tables: ${dbPath}`);
    const client = createClient({ url: `file:${dbPath}` });
    try {
      // 1. Payments
      const pCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Payment'"
      );
      if (pCheck.rows.length > 0) {
        const r1 = await client.execute('DELETE FROM Payment');
        console.log(`Deleted ${r1.rowsAffected} records from Payment`);
      }

      const pfCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='PaymentFor'"
      );
      if (pfCheck.rows.length > 0) {
        const r2 = await client.execute('DELETE FROM PaymentFor');
        console.log(`Deleted ${r2.rowsAffected} records from PaymentFor`);
      }

      // 2. Sales Invoices
      const siCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='SalesInvoice'"
      );
      if (siCheck.rows.length > 0) {
        const r3 = await client.execute('DELETE FROM SalesInvoice');
        console.log(`Deleted ${r3.rowsAffected} records from SalesInvoice`);
      }

      const siiCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='SalesInvoiceItem'"
      );
      if (siiCheck.rows.length > 0) {
        const r4 = await client.execute('DELETE FROM SalesInvoiceItem');
        console.log(`Deleted ${r4.rowsAffected} records from SalesInvoiceItem`);
      }

      // 3. Purchase Invoices (Bills)
      const piCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='PurchaseInvoice'"
      );
      if (piCheck.rows.length > 0) {
        const r5 = await client.execute('DELETE FROM PurchaseInvoice');
        console.log(`Deleted ${r5.rowsAffected} records from PurchaseInvoice`);
      }

      const piiCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='PurchaseInvoiceItem'"
      );
      if (piiCheck.rows.length > 0) {
        const r6 = await client.execute('DELETE FROM PurchaseInvoiceItem');
        console.log(
          `Deleted ${r6.rowsAffected} records from PurchaseInvoiceItem`
        );
      }

      // 4. Journal Entries
      const jeCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='JournalEntry'"
      );
      if (jeCheck.rows.length > 0) {
        const r8 = await client.execute('DELETE FROM JournalEntry');
        console.log(`Deleted ${r8.rowsAffected} records from JournalEntry`);
      }

      const jeaCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='JournalEntryAccount'"
      );
      if (jeaCheck.rows.length > 0) {
        const r9 = await client.execute('DELETE FROM JournalEntryAccount');
        console.log(
          `Deleted ${r9.rowsAffected} records from JournalEntryAccount`
        );
      }

      // 5. Ledger Entries
      const aleCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='AccountingLedgerEntry'"
      );
      if (aleCheck.rows.length > 0) {
        const r7 = await client.execute(
          "DELETE FROM AccountingLedgerEntry WHERE referenceType IN ('Payment', 'SalesInvoice', 'PurchaseInvoice', 'JournalEntry')"
        );
        console.log(
          `Deleted ${r7.rowsAffected} records from AccountingLedgerEntry`
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error clearing tables in ${dbPath}: ${message}`);
    } finally {
      client.close();
    }
  }
}

deleteEverything();
