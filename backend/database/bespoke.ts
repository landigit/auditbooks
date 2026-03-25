import { sql } from 'kysely';
import type { DocItem, ReturnDocItem } from 'models/inventory/types';
import type {
  Cashflow,
  IncomeExpense,
  TopExpenses,
  TotalCreditAndDebit,
  TotalOutstanding,
} from 'utils/db/types';
import { safeParseFloat } from 'utils/index';
import { ModelNameEnum } from '../../models/types';
import type { DB } from '../../src/types/db';
import type DatabaseCore from './core';
import type { BespokeFunction } from './types';

export class BespokeQueries {
  [key: string]: BespokeFunction;

  static async getLastInserted(
    db: DatabaseCore,
    schemaName: string
  ): Promise<number> {
    if (!db.db) return 0;
    const result = await sql<{ num: number }>`
      select cast(name as int) as num from ${sql.table(schemaName)}
      order by num desc limit 1
    `.execute(db.db);

    const num = result.rows?.[0]?.num;
    return num ?? 0;
  }

  static async getTopExpenses(
    db: DatabaseCore,
    fromDate: string,
    toDate: string
  ) {
    if (!db.db) return [];

    const expenseAccounts = db.db
      .selectFrom('Account')
      .select('name')
      .where('rootType', '=', 'Expense');

    const topExpenses = await db.db
      .selectFrom('AccountingLedgerEntry')
      .select((eb) => [
        'account',
        eb.fn
          .sum(sql<number>`cast(debit as real) - cast(credit as real)`)
          .as('total'),
      ])
      .where('reverted', '=', 0)
      .where('account', 'in', expenseAccounts)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .groupBy('account')
      .orderBy('total', 'desc')
      .limit(5)
      .execute();

    return topExpenses as unknown as TopExpenses;
  }

  static async getTotalOutstanding(
    db: DatabaseCore,
    schemaName: string,
    fromDate: string,
    toDate: string
  ): Promise<TotalOutstanding> {
    if (!db.db) return { total: 0, outstanding: 0 };

    const result = await db.db
      .selectFrom(schemaName as keyof DB)
      .select((eb) => [
        eb.fn.sum('baseGrandTotal').as('total'),
        eb.fn.sum('outstandingAmount').as('outstanding'),
      ])
      .where('submitted', '=', 1)
      .where('cancelled', '=', 0)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .executeTakeFirst();

    return {
      total: Number(result?.total || 0),
      outstanding: Number(result?.outstanding || 0),
    };
  }

  static async getCashflow(
    db: DatabaseCore,
    fromDate: string,
    toDate: string
  ): Promise<Cashflow> {
    if (!db.db) return [];

    const cashAndBankAccounts = db.db
      .selectFrom('Account')
      .select('name')
      .where('accountType', 'in', ['Cash', 'Bank'])
      .where('isGroup', '=', 0);

    const result = await db.db
      .selectFrom('AccountingLedgerEntry')
      .where('reverted', '=', 0)
      .select((eb) => [
        eb.fn.sum('debit').as('inflow'),
        eb.fn.sum('credit').as('outflow'),
        sql<string>`strftime('%Y-%m', date)`.as('yearmonth'),
      ])
      .where('account', 'in', cashAndBankAccounts)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .groupBy(sql`yearmonth`)
      .execute();

    return result as unknown as Cashflow;
  }

  static async getIncomeAndExpenses(
    db: DatabaseCore,
    fromDate: string,
    toDate: string
  ): Promise<IncomeExpense> {
    if (!db.db) return { income: [], expense: [] };

    const income = await sql<{ balance: number; yearmonth: string }>`
      select sum(cast(credit as real) - cast(debit as real)) as balance, strftime('%Y-%m', date) as yearmonth
      from AccountingLedgerEntry
      where
        reverted = 0 and
        date between date(${fromDate}) and date(${toDate}) and
        account in (
          select name
          from Account
          where rootType = 'Income'
        )
      group by yearmonth
    `.execute(db.db);

    const expense = await sql<{ balance: number; yearmonth: string }>`
      select sum(cast(debit as real) - cast(credit as real)) as balance, strftime('%Y-%m', date) as yearmonth
      from AccountingLedgerEntry
      where
        reverted = 0 and
        date between date(${fromDate}) and date(${toDate}) and
        account in (
          select name
          from Account
          where rootType = 'Expense'
        )
      group by yearmonth
    `.execute(db.db);

    return {
      income: income.rows,
      expense: expense.rows,
    };
  }

  static async getTotalCreditAndDebit(
    db: DatabaseCore
  ): Promise<TotalCreditAndDebit[]> {
    if (!db.db) return [];
    const result = await sql<TotalCreditAndDebit>`
      select 
        account, 
        sum(cast(credit as real)) as totalCredit, 
        sum(cast(debit as real)) as totalDebit
      from AccountingLedgerEntry
      group by account
    `.execute(db.db);
    return result.rows;
  }

  static async getStockQuantity(
    db: DatabaseCore,
    item: string,
    location?: string,
    fromDate?: string,
    toDate?: string,
    batch?: string,
    serialNumbers?: string[]
  ): Promise<number | null> {
    if (!db.db) return null;

    let query = db.db
      .selectFrom(ModelNameEnum.StockLedgerEntry as keyof DB)
      .select((eb) => eb.fn.sum('quantity').as('quantity'))
      .where('item', '=', item);

    if (location) {
      query = query.where('location', '=', location);
    }
    if (batch) {
      query = query.where('batch', '=', batch);
    }
    if (serialNumbers?.length) {
      query = query.where('serialNumber', 'in', serialNumbers);
    }
    if (fromDate) {
      query = query.where(sql`datetime(date)`, '>', sql`datetime(${fromDate})`);
    }
    if (toDate) {
      query = query.where(sql`datetime(date)`, '<', sql`datetime(${toDate})`);
    }

    const result = await query.executeTakeFirst();
    return result?.quantity ? Number(result.quantity) : null;
  }

  static async getReturnBalanceItemsQty(
    db: DatabaseCore,
    schemaName: ModelNameEnum,
    docName: string
  ): Promise<Record<string, ReturnDocItem> | undefined> {
    if (!db.db) return undefined;

    const returns = await db.db
      .selectFrom(schemaName as keyof DB)
      .select('name')
      .where('returnAgainst', '=', docName)
      .where('submitted', '=', 1)
      .where('cancelled', '=', 0)
      .execute();

    const returnDocNames = returns.map((i) => i.name as string);

    if (!returnDocNames.length) {
      return;
    }

    let returnedItemsQuery = db.db
      .selectFrom(`${schemaName}Item` as keyof DB)
      .select((eb) => eb.fn.sum('quantity').as('quantity'))
      .where('parent', 'in', returnDocNames);

    let docItemsQuery = db.db
      .selectFrom(`${schemaName}Item` as keyof DB)
      .where('parent', '=', docName)
      .select((eb) => eb.fn.sum('quantity').as('quantity'));

    const isInvoice = [
      ModelNameEnum.SalesInvoice,
      ModelNameEnum.PurchaseInvoice,
    ].includes(schemaName);
    const isReceipt = [
      ModelNameEnum.Shipment,
      ModelNameEnum.PurchaseReceipt,
    ].includes(schemaName);

    if (isInvoice) {
      returnedItemsQuery = returnedItemsQuery
        .select(['item', 'batch'])
        .groupBy(['item', 'batch']);
      docItemsQuery = docItemsQuery
        .select(['name', 'item', 'batch'])
        .groupBy(['item', 'batch']);
    }

    if (isReceipt) {
      returnedItemsQuery = returnedItemsQuery
        .select(['item', 'batch', 'serialNumber'])
        .groupBy(['item', 'batch', 'serialNumber']);
      docItemsQuery = docItemsQuery
        .select(['name', 'item', 'batch', 'serialNumber'])
        .groupBy(['item', 'batch', 'serialNumber']);
    }

    const returnedItems =
      (await returnedItemsQuery.execute()) as unknown as DocItem[];
    if (!returnedItems.length) {
      return;
    }
    const docItems = (await docItemsQuery.execute()) as unknown as DocItem[];

    const docItemsMap = BespokeQueries.#getDocItemMap(docItems);
    const returnedItemsMap = BespokeQueries.#getDocItemMap(returnedItems);

    const returnBalanceItems = BespokeQueries.#getReturnBalanceItemQtyMap(
      docItemsMap,
      returnedItemsMap
    );
    return returnBalanceItems;
  }

  static #getDocItemMap(docItems: DocItem[]): Record<string, ReturnDocItem> {
    const docItemsMap: Record<string, ReturnDocItem> = {};
    const batchesMap:
      | Record<
          string,
          { quantity: number; serialNumbers?: string[] | undefined }
        >
      | undefined = {};

    for (const item of docItems) {
      if (docItemsMap[item.item]) {
        if (item.batch) {
          let serialNumbers: string[] | undefined;

          if (!docItemsMap[item.item].batches) {
            docItemsMap[item.item].batches = {};
          }
          const batches = docItemsMap[item.item].batches;
          if (batches) {
            if (!batches[item.batch]) {
              batches[item.batch] = {
                quantity: item.quantity,
                serialNumbers,
              };
            } else {
              const batch = batches[item.batch];
              batch.quantity += item.quantity;
              batch.serialNumbers = serialNumbers;
            }
          }
        } else {
          docItemsMap[item.item].quantity += item.quantity;
        }

        if (item.serialNumber) {
          const serialNumbers: string[] = [];

          if (docItemsMap[item.item].serialNumbers) {
            serialNumbers.push(...(docItemsMap[item.item].serialNumbers ?? []));
          }

          serialNumbers.push(...item.serialNumber.split('\n'));
          docItemsMap[item.item].serialNumbers = serialNumbers;
        }
        continue;
      }

      if (item.batch) {
        let serialNumbers: string[] | undefined = undefined;
        if (item.serialNumber) {
          serialNumbers = item.serialNumber.split('\n');
        }

        batchesMap[item.batch] = {
          serialNumbers,
          quantity: item.quantity,
        };
      }

      let serialNumbers: string[] | undefined = undefined;

      if (!item.batch && item.serialNumber) {
        serialNumbers = item.serialNumber.split('\n');
      }

      docItemsMap[item.item] = {
        serialNumbers,
        batches: batchesMap,
        quantity: item.quantity,
      };
    }
    return docItemsMap;
  }

  static #getReturnBalanceItemQtyMap(
    docItemsMap: Record<string, ReturnDocItem>,
    returnedItemsMap: Record<string, ReturnDocItem>
  ): Record<string, ReturnDocItem> {
    const returnBalanceItems: Record<string, ReturnDocItem> | undefined = {};
    const balanceBatchQtyMap:
      | Record<
          string,
          { quantity: number; serialNumbers: string[] | undefined }
        >
      | undefined = {};

    for (const row in docItemsMap) {
      const balanceSerialNumbersMap: string[] | undefined = [];
      let balanceQty = safeParseFloat(-docItemsMap[row].quantity);
      const docItem = docItemsMap[row];
      const returnedDocItem = returnedItemsMap[row];
      const docItemHasBatch = !!Object.keys(docItem.batches ?? {}).length;

      if (returnedItemsMap) {
        for (const item in returnedItemsMap) {
          if (docItemHasBatch && item !== row) {
            continue;
          }

          balanceQty = -(
            Math.abs(balanceQty) + returnedItemsMap[item].quantity
          );

          const returnedItem = returnedItemsMap[item];

          if (docItem.serialNumbers && returnedItem.serialNumbers) {
            for (const serialNumber of docItem.serialNumbers) {
              if (!returnedItem.serialNumbers.includes(serialNumber)) {
                balanceSerialNumbersMap.push(serialNumber);
              }
            }
          }
        }
      }

      if (docItemHasBatch && docItem.batches) {
        for (const batch in docItem.batches) {
          const docItemSerialNumbers = docItem.batches[batch].serialNumbers;
          const itemSerialNumbers = docItem.batches[batch].serialNumbers;
          let balanceSerialNumbers: string[] | undefined;

          if (docItemSerialNumbers && itemSerialNumbers) {
            balanceSerialNumbers = docItemSerialNumbers.filter(
              (serialNumber: string) =>
                itemSerialNumbers.indexOf(serialNumber) === -1
            );
          }

          const ItemQty = Math.abs(docItem.batches[batch].quantity);
          let balanceQty = safeParseFloat(-ItemQty);

          if (!returnedDocItem || !returnedDocItem?.batches) {
            continue;
          }

          const returnedItem = returnedDocItem?.batches[batch];

          if (!returnedItem) {
            balanceBatchQtyMap[batch] = {
              quantity: balanceQty,
              serialNumbers: balanceSerialNumbers,
            };
            continue;
          }

          balanceQty = -(
            Math.abs(safeParseFloat(-ItemQty)) -
            Math.abs(returnedDocItem.batches[batch].quantity)
          );

          balanceBatchQtyMap[batch] = {
            quantity: balanceQty,
            serialNumbers: balanceSerialNumbers,
          };
        }
      }

      returnBalanceItems[row] = {
        quantity: balanceQty,
        batches: balanceBatchQtyMap,
        serialNumbers: balanceSerialNumbersMap,
      };
    }

    return returnBalanceItems;
  }

  static async getPOSTransactedAmount(
    db: DatabaseCore,
    fromDate: Date,
    toDate: Date,
    lastShiftClosingDate?: Date
  ): Promise<Record<string, number> | undefined> {
    if (!db.db) return undefined;

    let invoicesQuery = db.db
      .selectFrom(ModelNameEnum.SalesInvoice as keyof DB)
      .select(['name', 'returnAgainst'])
      .where('isPOS', '=', 1)
      .where('date', '>=', fromDate.toISOString())
      .where('date', '<=', toDate.toISOString());

    if (lastShiftClosingDate) {
      invoicesQuery = invoicesQuery.where(
        'created',
        '>',
        lastShiftClosingDate.toISOString()
      );
    }

    const invoices = (await invoicesQuery.execute()) as {
      name: string;
      returnAgainst: string | null;
    }[];

    if (!invoices.length) {
      return;
    }

    const sinvNames = invoices.map((row) => row.name);
    const invoiceSignMap = invoices.reduce<Record<string, number>>(
      (map, inv) => {
        map[inv.name] = inv.returnAgainst ? -1 : 1;
        return map;
      },
      {}
    );

    const paymentEntryNames = (
      await db.db
        .selectFrom(ModelNameEnum.PaymentFor as keyof DB)
        .select('parent')
        .where('referenceName', 'in', sinvNames)
        .execute()
    ).map((doc: { parent: string }) => doc.parent);

    if (!paymentEntryNames.length) {
      return;
    }

    const groupedAmounts = (await db.db
      .selectFrom(ModelNameEnum.Payment as keyof DB)
      .select(['paymentMethod', 'name'])
      .select((eb) => eb.fn.sum('amount').as('amount'))
      .where('name', 'in', paymentEntryNames)
      .groupBy(['paymentMethod', 'name'])
      .execute()) as unknown as {
      paymentMethod: string;
      name: string;
      amount: number;
    }[];

    const transactedAmounts: Record<string, number> = {};

    for (const row of groupedAmounts) {
      const paymentRefs = (await db.db
        .selectFrom(ModelNameEnum.PaymentFor as keyof DB)
        .select('referenceName')
        .where('parent', '=', row.name)
        .execute()) as { referenceName: string }[];

      for (const ref of paymentRefs) {
        const sign = invoiceSignMap[ref.referenceName] ?? 1;
        const signedAmount = Number(row.amount) * sign;

        transactedAmounts[row.paymentMethod] =
          (transactedAmounts[row.paymentMethod] ?? 0) + signedAmount;
      }
    }

    return transactedAmounts;
  }
}
