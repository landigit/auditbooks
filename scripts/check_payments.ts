import BetterSQLite3 from 'better-sqlite3';
const dbPath =
  process.env.DB_PATH ||
  require('path').join(process.cwd(), '..', 'GRVEP', 'GRVe Printers.db');
const db = new BetterSQLite3(dbPath);

const checkTable = (name: string) => {
  const check = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
    )
    .get();
  if (!check) return { total: 0, submitted: 0 };
  const total = db.prepare(`SELECT count(*) as count FROM ${name}`).get() as {
    count: number;
  };
  const sub = db
    .prepare(`SELECT count(*) as count FROM ${name} WHERE submitted = 1`)
    .get() as { count: number };
  return { total: total.count, submitted: sub.count };
};

console.log('=== FINAL DATABASE INTEGRITY CHECK ===');
console.log('SalesInvoice:      ', checkTable('SalesInvoice'));
console.log('PurchaseInvoice:   ', checkTable('PurchaseInvoice'));
console.log('Payment:           ', checkTable('Payment'));
console.log('JournalEntry:      ', checkTable('JournalEntry'));

const ledger = db
  .prepare('SELECT count(*) as count FROM AccountingLedgerEntry')
  .get() as { count: number };
console.log('Accounting Ledger Entries: ', ledger.count);

db.close();
