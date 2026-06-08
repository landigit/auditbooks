import Database from 'libsql';

const db = new Database('E:/misc/demo3.db');

try {
  console.log('--- All SalesInvoiceItem Rows ---');
  console.log(db.prepare('SELECT * FROM SalesInvoiceItem').all());

  console.log('--- All PaymentFor Rows ---');
  console.log(db.prepare('SELECT * FROM PaymentFor').all());
} catch (err) {
  console.error(err);
} finally {
  db.close();
}
