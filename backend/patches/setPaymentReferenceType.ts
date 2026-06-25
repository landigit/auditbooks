import { DatabaseManager } from '../database/manager';

async function execute(dm: DatabaseManager) {
  const kysely = dm.db?.kysely;
  if (!kysely) return;

  await (kysely as any)
    .updateTable('Payment')
    .set({ referenceType: 'PurchaseInvoice' })
    .where('referenceType', 'is', null)
    .where('paymentType', '=', 'Pay')
    .execute();

  await (kysely as any)
    .updateTable('Payment')
    .set({ referenceType: 'SalesInvoice' })
    .where('referenceType', 'is', null)
    .where('paymentType', '=', 'Receive')
    .execute();
}

export default { execute, beforeMigrate: true };
