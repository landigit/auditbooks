import Database from 'libsql';

function main() {
  const db = new Database('E:/misc/demo3.db');

  try {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE name='SalesInvoiceItem';").get() as { sql: string };
    console.log("SalesInvoiceItem Schema:");
    console.log(row.sql);
  } catch (err) {
    console.error("Error query:", err);
  } finally {
    db.close();
  }
}

main();
