import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { parseCSV } from '../utils/csvParser';

async function tableExists(client: Client, name: string): Promise<boolean> {
  const result = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    args: [name],
  });
  return result.rows.length > 0;
}

async function addMissingUoms() {
  let itemConvertedPath = join(
    process.cwd(),
    '..',
    'GRVEP',
    'Item_converted.csv'
  );
  if (!existsSync(itemConvertedPath)) {
    itemConvertedPath = join(process.cwd(), 'GRVEP', 'Item_converted.csv');
  }
  if (!existsSync(itemConvertedPath)) {
    console.error(`Could not find Item_converted.csv at ${itemConvertedPath}`);
    return;
  }

  console.log(`Reading converted items from: ${itemConvertedPath}`);
  const csvContent = readFileSync(itemConvertedPath, 'utf8');
  const rows = parseCSV(csvContent);

  if (rows.length < 4) {
    console.error('Item_converted.csv has too few rows.');
    return;
  }

  const fieldKeys = rows[2];
  const unitIndex = fieldKeys.indexOf('Item.unit');
  if (unitIndex === -1) {
    console.error("Could not find 'Item.unit' column in Item_converted.csv.");
    return;
  }

  const units = new Set<string>();
  for (let i = 3; i < rows.length; i++) {
    const unit = rows[i]?.[unitIndex]?.trim();
    if (unit) units.add(unit);
  }

  if (units.size === 0) {
    console.log('No units found in CSV.');
    return;
  }

  console.log(`Found unique units in CSV: ${Array.from(units).join(', ')}`);

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
    if (!existsSync(dbPath)) {
      console.log(`Database file does not exist, skipping: ${dbPath}`);
      continue;
    }

    console.log(`\nConnecting to database: ${dbPath}`);
    const client = createClient({ url: `file:${dbPath}` });

    try {
      // UOM table
      if (!(await tableExists(client, 'UOM'))) {
        console.log(`UOM table does not exist in ${dbPath}, skipping.`);
        continue;
      }

      // Clean up legacy duplicates
      const cleanup = await client.execute(
        "DELETE FROM UOM WHERE name IN ('NOS','pcs','BUN','BOOK','PKT','BOX','box','ft')"
      );
      if (cleanup.rowsAffected > 0) {
        console.log(
          `Cleaned up ${cleanup.rowsAffected} legacy duplicate UOM(s) from database.`
        );
      }

      const existingRows = await client.execute('SELECT name FROM UOM');
      const existingNames = new Set(
        existingRows.rows.map((r) => String(r['name'] ?? '').toLowerCase())
      );

      const now = new Date().toISOString();
      let insertedCount = 0;
      for (const unit of units) {
        if (!existingNames.has(unit.toLowerCase())) {
          await client.execute({
            sql: 'INSERT INTO UOM (name, isWhole, createdBy, modifiedBy, created, modified) VALUES (?, 0, ?, ?, ?, ?)',
            args: [unit, '__SYSTEM__', '__SYSTEM__', now, now],
          });
          console.log(`Inserted missing UOM: "${unit}"`);
          insertedCount++;
        }
      }
      console.log(
        `Database ${dbPath} updated: inserted ${insertedCount} missing UOM(s).`
      );

      // Accounts
      if (await tableExists(client, 'Account')) {
        const accountsToEnsure = [
          {
            name: 'Petty Cash',
            rootType: 'Asset',
            parentAccount: 'Cash In Hand',
            accountType: 'Cash',
            isGroup: 0,
          },
          {
            name: 'GRVE PRINTERS HDFC',
            rootType: 'Asset',
            parentAccount: 'Bank Accounts',
            accountType: 'Bank',
            isGroup: 0,
          },
          {
            name: 'GST Payable',
            rootType: 'Liability',
            parentAccount: 'Duties and Taxes',
            accountType: 'Tax',
            isGroup: 1,
          },
          {
            name: 'Input Tax Credits',
            rootType: 'Asset',
            parentAccount: 'Tax Assets',
            accountType: 'Tax',
            isGroup: 1,
          },
        ];

        const existingAccounts = await client.execute(
          'SELECT name FROM Account'
        );
        const existingAccountNames = new Set(
          existingAccounts.rows.map((r) =>
            String(r['name'] ?? '').toLowerCase()
          )
        );

        for (const acc of accountsToEnsure) {
          if (!existingAccountNames.has(acc.name.toLowerCase())) {
            await client.execute({
              sql: 'INSERT INTO Account (name, rootType, parentAccount, accountType, isGroup, createdBy, modifiedBy, created, modified, lft, rgt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)',
              args: [
                acc.name,
                acc.rootType,
                acc.parentAccount,
                acc.accountType,
                acc.isGroup,
                '__SYSTEM__',
                '__SYSTEM__',
                now,
                now,
              ],
            });
            console.log(`Inserted missing Account: "${acc.name}"`);
            existingAccountNames.add(acc.name.toLowerCase());
          }
        }

        // Dynamic accounts from CSV files
        const dynamicAccounts = new Set<string>();
        const loadCSVAccounts = (csvPath: string) => {
          if (!existsSync(csvPath)) return;
          const content = readFileSync(csvPath, 'utf8');
          const csvRows = parseCSV(content);
          if (csvRows.length < 4) return;
          const keys = csvRows[2];
          const accIndex = keys.indexOf('JournalEntryAccount.account');
          if (accIndex === -1) return;
          for (let i = 3; i < csvRows.length; i++) {
            const val = csvRows[i]?.[accIndex]?.trim();
            if (val) dynamicAccounts.add(val);
          }
        };

        loadCSVAccounts(
          join(process.cwd(), '..', 'GRVEP', 'Expense_converted.csv')
        );
        loadCSVAccounts(
          join(process.cwd(), '..', 'GRVEP', 'Journal_converted.csv')
        );

        // Re-fetch current names after static inserts
        const currentAccounts = await client.execute(
          'SELECT name FROM Account'
        );
        const currentAccountNames = new Set(
          currentAccounts.rows.map((r) => String(r['name'] ?? '').toLowerCase())
        );

        for (const accName of dynamicAccounts) {
          if (!currentAccountNames.has(accName.toLowerCase())) {
            const accLower = accName.toLowerCase();
            let rootType = 'Expense';
            let accountType = 'Expense Account';
            let parentAccount = 'Expenses';

            if (accLower.includes('loan') || accLower.includes('payable')) {
              rootType = 'Liability';
              accountType = 'Payable';
              parentAccount = 'Current Liabilities';
            } else if (
              accLower.includes('savings') ||
              accLower.includes('cash') ||
              accLower.includes('bank') ||
              accLower.includes('petty')
            ) {
              rootType = 'Asset';
              accountType = 'Cash';
              parentAccount = 'Cash In Hand';
            }

            await client.execute({
              sql: 'INSERT INTO Account (name, rootType, parentAccount, accountType, isGroup, createdBy, modifiedBy, created, modified, lft, rgt) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 0, 0)',
              args: [
                accName,
                rootType,
                parentAccount,
                accountType,
                '__SYSTEM__',
                '__SYSTEM__',
                now,
                now,
              ],
            });
            console.log(
              `Inserted missing dynamic Account: "${accName}" (${rootType} -> ${parentAccount})`
            );
          }
        }
      }

      // Item "Services"
      if (await tableExists(client, 'Item')) {
        const existingServices = await client.execute({
          sql: "SELECT name FROM Item WHERE name = 'Services'",
          args: [],
        });
        if (existingServices.rows.length === 0) {
          await client.execute({
            sql: "INSERT INTO Item (name, itemCode, `for`, itemType, unit, rate, description, incomeAccount, expenseAccount, tax, hsnCode, trackItem, createdBy, modifiedBy, created, modified) VALUES ('Services', 'SERVICES', 'Both', 'Service', 'Unit', '0.00', 'Default service item for missing item names', 'Sales', 'Cost of Goods Sold', 'GST-18', '', 0, ?, ?, ?, ?)",
            args: ['__SYSTEM__', '__SYSTEM__', now, now],
          });
          console.log(`Inserted missing Item: "Services"`);
        }
      }

      // NumberSeries
      if (await tableExists(client, 'NumberSeries')) {
        const seriesToEnsure = [
          { name: 'VPAY-', referenceType: 'Payment' },
          { name: 'CPAY-', referenceType: 'Payment' },
        ];
        for (const series of seriesToEnsure) {
          const exists = await client.execute({
            sql: 'SELECT name FROM NumberSeries WHERE name = ?',
            args: [series.name],
          });
          if (exists.rows.length === 0) {
            await client.execute({
              sql: 'INSERT INTO NumberSeries (name, referenceType, padZeros, start, current, createdBy, modifiedBy, created, modified) VALUES (?, ?, 4, 1, 0, ?, ?, ?, ?)',
              args: [
                series.name,
                series.referenceType,
                '__SYSTEM__',
                '__SYSTEM__',
                now,
                now,
              ],
            });
            console.log(`Inserted missing NumberSeries: "${series.name}"`);
          }
        }
      }

      // PaymentMethods
      if (await tableExists(client, 'PaymentMethod')) {
        const methodsToEnsure = [
          { name: 'Cash', type: 'Cash', account: 'Petty Cash' },
          { name: 'UPI', type: 'Bank', account: 'GRVE PRINTERS HDFC' },
          {
            name: 'Bank Transfer',
            type: 'Bank',
            account: 'GRVE PRINTERS HDFC',
          },
        ];
        for (const method of methodsToEnsure) {
          const exists = await client.execute({
            sql: 'SELECT name FROM PaymentMethod WHERE name = ?',
            args: [method.name],
          });
          if (exists.rows.length === 0) {
            await client.execute({
              sql: 'INSERT INTO PaymentMethod (name, type, account, createdBy, modifiedBy, created, modified) VALUES (?, ?, ?, ?, ?, ?, ?)',
              args: [
                method.name,
                method.type,
                method.account,
                '__SYSTEM__',
                '__SYSTEM__',
                now,
                now,
              ],
            });
            console.log(`Inserted missing PaymentMethod: "${method.name}"`);
          }
        }
      }

      // enablePartialPayment in AccountingSettings
      if (await tableExists(client, 'SingleValue')) {
        const svExists = await client.execute({
          sql: "SELECT name FROM SingleValue WHERE parent = 'AccountingSettings' AND fieldname = 'enablePartialPayment'",
          args: [],
        });
        if (svExists.rows.length > 0) {
          await client.execute({
            sql: "UPDATE SingleValue SET value = '1' WHERE parent = 'AccountingSettings' AND fieldname = 'enablePartialPayment'",
            args: [],
          });
          console.log(
            `Updated enablePartialPayment to '1' in AccountingSettings`
          );
        } else {
          const randomName = Math.random().toString(16).substring(2, 12);
          await client.execute({
            sql: "INSERT INTO SingleValue (name, parent, fieldname, value, createdBy, modifiedBy, created, modified) VALUES (?, 'AccountingSettings', 'enablePartialPayment', '1', ?, ?, ?, ?)",
            args: [randomName, '__SYSTEM__', '__SYSTEM__', now, now],
          });
          console.log(
            `Inserted and enabled enablePartialPayment in AccountingSettings`
          );
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error processing database ${dbPath}: ${message}`);
    } finally {
      client.close();
    }
  }
}

addMissingUoms();
