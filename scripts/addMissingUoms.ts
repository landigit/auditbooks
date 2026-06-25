import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';
import BetterSQLite3 from 'better-sqlite3';
import { parseCSV } from '../utils/csvParser';

function addMissingUoms() {
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
    console.error(`Error: Converted items CSV file not found`);
    return;
  }

  // Parse Item_converted.csv to find unique unit values
  console.log(`Reading converted items from: ${itemConvertedPath}`);
  const csvContent = readFileSync(itemConvertedPath, 'utf8');
  const rows = parseCSV(csvContent);

  if (rows.length < 4) {
    console.log('No data rows found in converted items CSV.');
    return;
  }

  // Row index 2 contains field keys like "Item.unit"
  const fieldKeys = rows[2];
  const unitIndex = fieldKeys.indexOf('Item.unit');
  if (unitIndex === -1) {
    console.error('Error: Could not find "Item.unit" column in converted CSV.');
    return;
  }

  const units = new Set<string>();
  // Data starts at row 3
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[unitIndex]) {
      units.add(row[unitIndex].trim());
    }
  }

  if (units.size === 0) {
    console.log('No unit values found in CSV.');
    return;
  }

  console.log(`Found unique units in CSV: ${Array.from(units).join(', ')}`);

  // Read config.json to find database files
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
    if (!existsSync(dbPath)) {
      console.log(`Database file does not exist, skipping: ${dbPath}`);
      continue;
    }

    console.log(`\nConnecting to database: ${dbPath}`);
    try {
      const db = new BetterSQLite3(dbPath);

      // Check if UOM table exists
      const tableCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='UOM'"
        )
        .get();
      if (!tableCheck) {
        console.log(`UOM table does not exist in ${dbPath}, skipping.`);
        db.close();
        continue;
      }

      // Clean up case-variant duplicate UOMs first
      const cleanupStmt = db.prepare(`
        DELETE FROM UOM 
        WHERE name IN ('NOS', 'pcs', 'BUN', 'BOOK', 'PKT', 'BOX', 'box', 'ft')
      `);
      const cleanupResult = cleanupStmt.run();
      if (cleanupResult.changes > 0) {
        console.log(
          `Cleaned up ${cleanupResult.changes} legacy duplicate UOM(s) from database.`
        );
      }

      // Get existing UOMs after cleanup
      const existingRows = db.prepare('SELECT name FROM UOM').all() as {
        name: string;
      }[];
      const existingNames = new Set(
        existingRows.map((r) => r.name.toLowerCase())
      );

      const now = new Date().toISOString();
      const insertStmt = db.prepare(`
        INSERT INTO UOM (name, isWhole, createdBy, modifiedBy, created, modified)
        VALUES (?, 0, '__SYSTEM__', '__SYSTEM__', ?, ?)
      `);

      let insertedCount = 0;
      for (const unit of units) {
        if (!existingNames.has(unit.toLowerCase())) {
          insertStmt.run(unit, now, now);
          console.log(`Inserted missing UOM: "${unit}"`);
          insertedCount++;
        }
      }

      console.log(
        `Database ${dbPath} updated: inserted ${insertedCount} missing UOM(s).`
      );

      // Ensure required Accounts exist for Journal imports
      const accountTableCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='Account'"
        )
        .get();
      if (accountTableCheck) {
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

        const existingAccounts = db
          .prepare('SELECT name FROM Account')
          .all() as { name: string }[];
        const existingAccountNames = new Set(
          existingAccounts.map((r) => r.name.toLowerCase())
        );

        const insertAccountStmt = db.prepare(`
          INSERT INTO Account (name, rootType, parentAccount, accountType, isGroup, createdBy, modifiedBy, created, modified, lft, rgt)
          VALUES (?, ?, ?, ?, ?, '__SYSTEM__', '__SYSTEM__', ?, ?, 0, 0)
        `);

        for (const acc of accountsToEnsure) {
          if (!existingAccountNames.has(acc.name.toLowerCase())) {
            insertAccountStmt.run(
              acc.name,
              acc.rootType,
              acc.parentAccount,
              acc.accountType,
              acc.isGroup,
              now,
              now
            );
            console.log(`Inserted missing Account: "${acc.name}"`);
          }
        }

        // Check dynamic missing accounts from Expense_converted.csv and Journal_converted.csv
        const dynamicAccounts = new Set<string>();

        const loadCSVAccounts = (csvPath: string) => {
          if (!existsSync(csvPath)) return;
          const content = readFileSync(csvPath, 'utf8');
          const rows = parseCSV(content);
          if (rows.length < 4) return;
          const fieldKeys = rows[2];
          const accIndex = fieldKeys.indexOf('JournalEntryAccount.account');
          if (accIndex === -1) return;
          for (let i = 3; i < rows.length; i++) {
            if (rows[i] && rows[i][accIndex]) {
              dynamicAccounts.add(rows[i][accIndex].trim());
            }
          }
        };

        const expenseConvPath = join(
          process.cwd(),
          '..',
          'GRVEP',
          'Expense_converted.csv'
        );
        const journalConvPath = join(
          process.cwd(),
          '..',
          'GRVEP',
          'Journal_converted.csv'
        );
        loadCSVAccounts(expenseConvPath);
        loadCSVAccounts(journalConvPath);

        const currentAccounts = db
          .prepare('SELECT name FROM Account')
          .all() as { name: string }[];
        const currentAccountNames = new Set(
          currentAccounts.map((r) => r.name.toLowerCase())
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

            insertAccountStmt.run(
              accName,
              rootType,
              parentAccount,
              accountType,
              0,
              now,
              now
            );
            console.log(
              `Inserted missing dynamic Account: "${accName}" (${rootType} -> ${parentAccount})`
            );
          }
        }
      }

      // Ensure "Services" item exists
      const itemTableCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='Item'"
        )
        .get();
      if (itemTableCheck) {
        const existingServices = db
          .prepare("SELECT name FROM Item WHERE name = 'Services'")
          .get();
        if (!existingServices) {
          const insertItemStmt = db.prepare(`
            INSERT INTO Item (name, itemCode, \`for\`, itemType, unit, rate, description, incomeAccount, expenseAccount, tax, hsnCode, trackItem, createdBy, modifiedBy, created, modified)
            VALUES ('Services', 'SERVICES', 'Both', 'Service', 'Unit', '0.00', 'Default service item for missing item names', 'Sales', 'Cost of Goods Sold', 'GST-18', '', 0, '__SYSTEM__', '__SYSTEM__', ?, ?)
          `);
          insertItemStmt.run(now, now);
          console.log(`Inserted missing Item: "Services"`);
        }
      }

      // Ensure required NumberSeries exist
      const nsTableCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='NumberSeries'"
        )
        .get();
      if (nsTableCheck) {
        const seriesToEnsure = [
          { name: 'VPAY-', referenceType: 'Payment' },
          { name: 'CPAY-', referenceType: 'Payment' },
        ];

        const insertNsStmt = db.prepare(`
          INSERT INTO NumberSeries (name, referenceType, padZeros, start, current, createdBy, modifiedBy, created, modified)
          VALUES (?, ?, 4, 1, 0, '__SYSTEM__', '__SYSTEM__', ?, ?)
        `);

        for (const series of seriesToEnsure) {
          const exists = db
            .prepare('SELECT name FROM NumberSeries WHERE name = ?')
            .get(series.name);
          if (!exists) {
            insertNsStmt.run(series.name, series.referenceType, now, now);
            console.log(`Inserted missing NumberSeries: "${series.name}"`);
          }
        }
      }

      // Ensure required PaymentMethods exist
      const pmTableCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='PaymentMethod'"
        )
        .get();
      if (pmTableCheck) {
        const methodsToEnsure = [
          { name: 'Cash', type: 'Cash', account: 'Petty Cash' },
          { name: 'UPI', type: 'Bank', account: 'GRVE PRINTERS HDFC' },
          {
            name: 'Bank Transfer',
            type: 'Bank',
            account: 'GRVE PRINTERS HDFC',
          },
        ];

        const insertPmStmt = db.prepare(`
          INSERT INTO PaymentMethod (name, type, account, createdBy, modifiedBy, created, modified)
          VALUES (?, ?, ?, '__SYSTEM__', '__SYSTEM__', ?, ?)
        `);

        for (const method of methodsToEnsure) {
          const exists = db
            .prepare('SELECT name FROM PaymentMethod WHERE name = ?')
            .get(method.name);
          if (!exists) {
            insertPmStmt.run(
              method.name,
              method.type,
              method.account,
              now,
              now
            );
            console.log(`Inserted missing PaymentMethod: "${method.name}"`);
          }
        }
      }

      // Ensure enablePartialPayment is enabled in AccountingSettings
      const singleValueTableCheck = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='SingleValue'"
        )
        .get();
      if (singleValueTableCheck) {
        const exists = db
          .prepare(
            "SELECT name FROM SingleValue WHERE parent = 'AccountingSettings' AND fieldname = 'enablePartialPayment'"
          )
          .get();
        if (exists) {
          db.prepare(
            "UPDATE SingleValue SET value = '1' WHERE parent = 'AccountingSettings' AND fieldname = 'enablePartialPayment'"
          ).run();
          console.log(
            `Updated enablePartialPayment to '1' in AccountingSettings`
          );
        } else {
          const randomName = Math.random().toString(16).substring(2, 12);
          db.prepare(
            `
            INSERT INTO SingleValue (name, parent, fieldname, value, createdBy, modifiedBy, created, modified)
            VALUES (?, 'AccountingSettings', 'enablePartialPayment', '1', '__SYSTEM__', '__SYSTEM__', ?, ?)
          `
          ).run(randomName, now, now);
          console.log(
            `Inserted and enabled enablePartialPayment in AccountingSettings`
          );
        }
      }

      db.close();
    } catch (err: any) {
      console.error(`Error processing database ${dbPath}: ${err.message}`);
    }
  }
}

addMissingUoms();
