import { join } from 'path';
import { createClient } from '@libsql/client';

async function resetOutstanding() {
  const dbPath =
    process.env['DB_PATH'] ||
    join(process.cwd(), '..', 'GRVEP', 'GRVe Printers.db');

  const client = createClient({ url: `file:${dbPath}` });

  console.log(
    'Resetting outstandingAmount to grandTotal on all Invoices/Bills...'
  );

  try {
    const updateSales = await client.execute(
      'UPDATE SalesInvoice SET outstandingAmount = grandTotal'
    );
    console.log(
      `Reset outstandingAmount for ${updateSales.rowsAffected} Sales Invoices.`
    );

    const updatePurchase = await client.execute(
      'UPDATE PurchaseInvoice SET outstandingAmount = grandTotal'
    );
    console.log(
      `Reset outstandingAmount for ${updatePurchase.rowsAffected} Purchase Invoices (Bills).`
    );
  } finally {
    client.close();
  }
}

resetOutstanding();
