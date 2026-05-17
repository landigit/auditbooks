import { DatabaseManager } from '../../database/manager';

async function execute(dm: DatabaseManager) {
  if (!dm.db || !dm.db.client) {
    return;
  }

  const sourceTables = [
    "PurchaseInvoice", 
    "SalesInvoice", 
    "JournalEntry",
    "Payment", 
    "StockMovement", 
    "StockTransfer"
  ];

  const entriesRes = await dm.db.client.execute(`SELECT name, date, referenceName FROM AccountingLedgerEntry`);
  const entries = entriesRes.rows;

  for (const entry of entries) {
    for (const table of sourceTables) {
      const respRes = await dm.db.client.execute({
        sql: `SELECT date FROM "${table}" WHERE name = ? LIMIT 1`,
        args: [entry.referenceName as string]
      });
      const resp = respRes.rows;
      if (resp.length !== 0) {
        const dateTimeValue = new Date(resp[0].date as string);
        await dm.db.client.execute({
          sql: `UPDATE AccountingLedgerEntry SET date = ? WHERE name = ?`,
          args: [dateTimeValue.toISOString(), entry.name as string]
        });
      }
    }
  }
}

export default { execute, beforeMigrate: true };