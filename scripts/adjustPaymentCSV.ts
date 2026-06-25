import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import BetterSQLite3 from 'better-sqlite3';
import { parseCSV, generateCSV } from '../utils/csvParser.js';

function adjustPayments() {
  const dbPath =
    process.env.DB_PATH ||
    join(process.cwd(), '..', 'GRVEP', 'GRVe Printers.db');
  if (!existsSync(dbPath)) {
    console.error(`Database not found at: ${dbPath}`);
    return;
  }

  const db = new BetterSQLite3(dbPath);

  const adjustFile = (csvPath: string, isSales: boolean) => {
    if (!existsSync(csvPath)) {
      console.log(`CSV not found: ${csvPath}`);
      return;
    }

    console.log(`Adjusting payment amounts in: ${csvPath}`);
    const content = readFileSync(csvPath, 'utf8');
    const rows = parseCSV(content);
    if (rows.length < 4) return;

    const schemaLabels = rows[0];
    const fieldLabels = rows[1];
    const fieldKeys = rows[2];
    const dataRows = rows.slice(3);

    const nameIdx = fieldKeys.indexOf('Payment.name');
    const amtIdx = fieldKeys.indexOf('Payment.amount');
    const refTypeIdx = fieldKeys.indexOf('PaymentFor.referenceType');
    const refNameIdx = fieldKeys.indexOf('PaymentFor.referenceName');
    const allocAmtIdx = fieldKeys.indexOf('PaymentFor.amount');

    const tableName = isSales ? 'SalesInvoice' : 'PurchaseInvoice';
    const query = db.prepare(
      `SELECT outstandingAmount FROM ${tableName} WHERE name = ?`
    );

    const adjustedRows = [schemaLabels, fieldLabels, fieldKeys];
    let adjustCount = 0;

    // Group rows by payment name to handle total amount calculation
    const paymentGroups: Record<string, any[]> = {};
    for (const row of dataRows) {
      if (!row || row.length === 0) continue;
      const pName = row[nameIdx];
      if (!paymentGroups[pName]) {
        paymentGroups[pName] = [];
      }
      paymentGroups[pName].push(row);
    }

    for (const pName in paymentGroups) {
      const groupRows = paymentGroups[pName];
      let totalAdjustedParentAmount = 0;

      // Adjust individual reference allocations first
      for (const row of groupRows) {
        const refName = row[refNameIdx]?.trim();
        let allocAmt = parseFloat(row[allocAmtIdx] || '0');

        if (refName) {
          const inv = query.get(refName) as
            | { outstandingAmount: string }
            | undefined;
          if (inv && inv.outstandingAmount) {
            const outstanding = Math.abs(parseFloat(inv.outstandingAmount));
            if (
              allocAmt > outstanding ||
              Math.abs(allocAmt - outstanding) < 0.1
            ) {
              console.log(
                `[${pName}] Adjusting allocation for ${refName} from ${allocAmt.toFixed(2)} to match exact outstanding: ${outstanding.toFixed(4)}`
              );
              allocAmt = outstanding;
              row[allocAmtIdx] = allocAmt.toFixed(4);
              adjustCount++;
            }
          }
        }
        totalAdjustedParentAmount += allocAmt;
      }

      // Update parent Payment.amount for all rows in this group
      for (const row of groupRows) {
        row[amtIdx] = totalAdjustedParentAmount.toFixed(4);
        adjustedRows.push(row);
      }
    }

    writeFileSync(csvPath, generateCSV(adjustedRows), 'utf8');
    console.log(
      `Finished adjusting ${csvPath}. Total adjustments made: ${adjustCount}\n`
    );
  };

  adjustFile(
    join(process.cwd(), '..', 'GRVEP', 'Customer_Payment_converted.csv'),
    true
  );
  adjustFile(
    join(process.cwd(), '..', 'GRVEP', 'Vendor_Payment_converted.csv'),
    false
  );

  db.close();
}

adjustPayments();
