import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { createClient } from '@libsql/client';

async function deletePayments() {
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

    console.log(`Connecting to database to clear Payments: ${dbPath}`);
    const client = createClient({ url: `file:${dbPath}` });
    try {
      const pCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Payment'"
      );
      if (pCheck.rows.length > 0) {
        const result1 = await client.execute('DELETE FROM Payment');
        console.log(`Deleted ${result1.rowsAffected} records from Payment`);
      }

      const pfCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='PaymentFor'"
      );
      if (pfCheck.rows.length > 0) {
        const result2 = await client.execute('DELETE FROM PaymentFor');
        console.log(`Deleted ${result2.rowsAffected} records from PaymentFor`);
      }

      const aleCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='AccountingLedgerEntry'"
      );
      if (aleCheck.rows.length > 0) {
        const result3 = await client.execute(
          "DELETE FROM AccountingLedgerEntry WHERE referenceType = 'Payment'"
        );
        console.log(
          `Deleted ${result3.rowsAffected} records from AccountingLedgerEntry`
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error clearing Payments in ${dbPath}: ${message}`);
    } finally {
      client.close();
    }
  }
}

deletePayments();
