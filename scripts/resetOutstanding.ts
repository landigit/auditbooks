import BetterSQLite3 from 'better-sqlite3';

function resetOutstanding() {
  const dbPath =
    process.env.DB_PATH ||
    require('path').join(process.cwd(), '..', 'GRVEP', 'GRVe Printers.db');
  const db = new BetterSQLite3(dbPath);

  console.log(
    'Resetting outstandingAmount to grandTotal on all Invoices/Bills...'
  );

  const updateSales = db
    .prepare('UPDATE SalesInvoice SET outstandingAmount = grandTotal')
    .run();
  console.log(
    `Reset outstandingAmount for ${updateSales.changes} Sales Invoices.`
  );

  const updatePurchase = db
    .prepare('UPDATE PurchaseInvoice SET outstandingAmount = grandTotal')
    .run();
  console.log(
    `Reset outstandingAmount for ${updatePurchase.changes} Purchase Invoices (Bills).`
  );

  db.close();
}

resetOutstanding();
