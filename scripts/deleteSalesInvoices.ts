import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';
import BetterSQLite3 from 'better-sqlite3';

function deleteSalesInvoices() {
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

    console.log(`Connecting to database to clear Sales Invoices: ${dbPath}`);
    try {
      const db = new BetterSQLite3(dbPath);

      const siCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='SalesInvoice'"
        )
        .get();
      if (siCheck) {
        const result1 = db.prepare('DELETE FROM SalesInvoice').run();
        console.log(`Deleted ${result1.changes} records from SalesInvoice`);
      }

      const siiCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='SalesInvoiceItem'"
        )
        .get();
      if (siiCheck) {
        const result2 = db.prepare('DELETE FROM SalesInvoiceItem').run();
        console.log(`Deleted ${result2.changes} records from SalesInvoiceItem`);
      }

      const aleCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='AccountingLedgerEntry'"
        )
        .get();
      if (aleCheck) {
        const result3 = db
          .prepare(
            "DELETE FROM AccountingLedgerEntry WHERE referenceType = 'SalesInvoice'"
          )
          .run();
        console.log(
          `Deleted ${result3.changes} records from AccountingLedgerEntry`
        );
      }

      db.close();
    } catch (err: any) {
      console.error(
        `Error clearing Sales Invoices in ${dbPath}: ${err.message}`
      );
    }
  }
}

deleteSalesInvoices();
