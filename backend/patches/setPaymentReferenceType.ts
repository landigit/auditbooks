import { DatabaseManager } from '../database/manager';

async function execute(dm: DatabaseManager) {
  if (!dm.db || !dm.db.client) {
    return;
  }
  await dm.db.client.execute({
    sql: `UPDATE "Payment" SET "referenceType" = 'PurchaseInvoice' WHERE "referenceType" IS NULL AND "paymentType" = 'Pay'`,
    args: []
  });
  await dm.db.client.execute({
    sql: `UPDATE "Payment" SET "referenceType" = 'SalesInvoice' WHERE "referenceType" IS NULL AND "paymentType" = 'Receive'`,
    args: []
  });
}

export default { execute, beforeMigrate: true };
