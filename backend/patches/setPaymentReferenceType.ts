import type { DB } from 'src/types/db';
import type { DatabaseManager } from '../database/manager';

async function execute(dm: DatabaseManager) {
  if (!dm.db?.db) return;

  await dm.db.db
    .updateTable('Payment' as keyof DB)
    .set({ referenceType: 'PurchaseInvoice' })
    .where('referenceType', 'is', null)
    .where('paymentType', '=', 'Pay')
    .execute();

  await dm.db.db
    .updateTable('Payment' as keyof DB)
    .set({ referenceType: 'SalesInvoice' })
    .where('referenceType', 'is', null)
    .where('paymentType', '=', 'Receive')
    .execute();
}

export default { execute, beforeMigrate: true };
