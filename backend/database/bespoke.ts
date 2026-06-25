import {
  Cashflow,
  IncomeExpense,
  TopExpenses,
  TotalCreditAndDebit,
  TotalOutstanding,
} from 'utils/db/types';
import { ModelNameEnum } from '../../models/types';
import DatabaseCore from './core';
import { BespokeFunction } from './types';
import { DocItem, ReturnDocItem } from 'models/inventory/types';
import { safeParseFloat } from 'utils/index';
import { Kysely, sql } from 'kysely';
export class BespokeQueries {
  [key: string]: BespokeFunction;

  static async getLastInserted(
    db: DatabaseCore,
    schemaName: string
  ): Promise<number> {
    const result = await sql<{ num: number }>`
      select cast(name as int) as num from ${sql.table(schemaName)} order by num desc limit 1
    `.execute(db.kysely!);

    const num = result.rows?.[0]?.num;
    if (num === undefined) {
      return 0;
    }
    return num;
  }

  static async getTopExpenses(
    db: DatabaseCore,
    fromDate: string,
    toDate: string
  ) {
    const expenseAccountsQuery = db
      .kysely!.selectFrom('Account')
      .select('name')
      .where('rootType', '=', 'Expense');

    const topExpenses = await db
      .kysely!.selectFrom('AccountingLedgerEntry')
      .select([
        'account',
        sql<number>`sum(cast(debit as real) - cast(credit as real))`.as(
          'total'
        ),
      ])
      .where('reverted', '=', 0)
      .where('account', 'in', expenseAccountsQuery)
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
  ) {
    // Cast database to record representation for dynamic tables
    const kyselyDb = db.kysely as unknown as Kysely<
      Record<string, Record<string, unknown>>
    >;
    return (await kyselyDb
      .selectFrom(schemaName)
      .select([
        sql<number>`sum(baseGrandTotal)`.as('total'),
        sql<number>`sum(outstandingAmount)`.as('outstanding'),
      ])
      .where('submitted', '=', 1)
      .where('cancelled', '=', 0)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .executeTakeFirst()) as unknown as TotalOutstanding;
  }

  static async getCashflow(db: DatabaseCore, fromDate: string, toDate: string) {
    const cashAndBankAccounts = db
      .kysely!.selectFrom('Account')
      .select('name')
      .where('accountType', 'in', ['Cash', 'Bank'])
      .where('isGroup', '=', 0);

    const result = await db
      .kysely!.selectFrom('AccountingLedgerEntry')
      .select([
        sql<string>`strftime('%Y-%m', date)`.as('yearmonth'),
        sql<number>`sum(debit)`.as('inflow'),
        sql<number>`sum(credit)`.as('outflow'),
      ])
      .where('reverted', '=', 0)
      .where('account', 'in', cashAndBankAccounts)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .groupBy(sql`strftime('%Y-%m', date)`)
      .execute();
    return result as unknown as Cashflow;
  }

  static async getIncomeAndExpenses(
    db: DatabaseCore,
    fromDate: string,
    toDate: string
  ) {
    const incomeResult = await sql<IncomeExpense['income'][0]>`
      select sum(cast(credit as real) - cast(debit as real)) as balance, strftime('%Y-%m', date) as yearmonth
      from AccountingLedgerEntry
      where
        reverted = false and
        date between date(${fromDate}) and date(${toDate}) and
        account in (
          select name
          from Account
          where rootType = 'Income'
        )
      group by yearmonth
    `.execute(db.kysely!);

    const expenseResult = await sql<IncomeExpense['expense'][0]>`
      select sum(cast(debit as real) - cast(credit as real)) as balance, strftime('%Y-%m', date) as yearmonth
      from AccountingLedgerEntry
      where
        reverted = false and
        date between date(${fromDate}) and date(${toDate}) and
        account in (
          select name
          from Account
          where rootType = 'Expense'
        )
      group by yearmonth
    `.execute(db.kysely!);

    return { income: incomeResult.rows, expense: expenseResult.rows };
  }

  static async getTotalCreditAndDebit(db: DatabaseCore) {
    const result = await sql<TotalCreditAndDebit>`
      select 
	    account, 
        sum(cast(credit as real)) as totalCredit, 
        sum(cast(debit as real)) as totalDebit
      from AccountingLedgerEntry
      group by account
    `.execute(db.kysely!);
    return result.rows as unknown as TotalCreditAndDebit[];
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
    let query = db
      .kysely!.selectFrom('StockLedgerEntry')
      .select(sql<number>`sum(quantity)`.as('total'))
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

    const value = await query.executeTakeFirst();
    if (!value || value.total === null) {
      return null;
    }

    return Number(value.total);
  }

  static async getReturnBalanceItemsQty(
    db: DatabaseCore,
    schemaName: ModelNameEnum,
    docName: string
  ): Promise<Record<string, ReturnDocItem> | undefined> {
    // Cast database representation to support dynamic tables
    const kyselyDb = db.kysely as unknown as Kysely<
      Record<string, Record<string, unknown>>
    >;

    const returnDocNames = (
      await kyselyDb
        .selectFrom(schemaName)
        .select('name')
        .where('returnAgainst', '=', docName)
        .where('submitted', '=', 1)
        .where('cancelled', '=', 0)
        .execute()
    ).map((i) => i.name as string);

    if (!returnDocNames.length) {
      return;
    }

    const itemTableName = `${schemaName}Item`;
    let returnedItemsQuery = kyselyDb
      .selectFrom(itemTableName)
      .select(sql<number>`sum(quantity)`.as('quantity'))
      .where('parent', 'in', returnDocNames);

    let docItemsQuery = kyselyDb
      .selectFrom(itemTableName)
      .where('parent', '=', docName)
      .select(sql<number>`sum(quantity)`.as('quantity'));

    if (
      [ModelNameEnum.SalesInvoice, ModelNameEnum.PurchaseInvoice].includes(
        schemaName
      )
    ) {
      returnedItemsQuery = returnedItemsQuery
        .select(['item', 'batch'])
        .groupBy(['item', 'batch']);
      docItemsQuery = docItemsQuery
        .select(['name', 'item', 'batch'])
        .groupBy(['item', 'batch']);
    }

    if (
      [ModelNameEnum.Shipment, ModelNameEnum.PurchaseReceipt].includes(
        schemaName
      )
    ) {
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
      if (!!docItemsMap[item.item]) {
        if (item.batch) {
          let serialNumbers: string[] | undefined;
          if (item.serialNumber) {
            serialNumbers = item.serialNumber.split('\n');
          }

          if (!docItemsMap[item.item].batches![item.batch]) {
            docItemsMap[item.item].batches![item.batch] = {
              quantity: item.quantity,
              serialNumbers,
            };
          } else {
            docItemsMap[item.item].batches![item.batch] = {
              quantity: (docItemsMap[item.item].batches![item.batch].quantity +=
                item.quantity),
              serialNumbers,
            };
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
                itemSerialNumbers.indexOf(serialNumber) == -1
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
    let invoicesQuery = db
      .kysely!.selectFrom('SalesInvoice')
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

    const invoices = await invoicesQuery.execute();

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

    const paymentEntryNames: string[] = (
      await db
        .kysely!.selectFrom('PaymentFor')
        .select(['parent', 'referenceName'])
        .where('referenceName', 'in', sinvNames)
        .execute()
    ).map((doc: { parent: string }) => doc.parent);

    if (!paymentEntryNames.length) {
      return;
    }

    const groupedAmounts = (await db
      .kysely!.selectFrom('Payment')
      .select(['paymentMethod', 'name'])
      .select(sql<number>`sum(amount)`.as('amount'))
      .where('name', 'in', paymentEntryNames)
      .groupBy(['paymentMethod', 'name'])
      .execute()) as unknown as {
      paymentMethod: string;
      name: string;
      amount: number;
    }[];

    const transactedAmounts: Record<string, number> = {};

    for (const row of groupedAmounts) {
      const paymentRefs = await db
        .kysely!.selectFrom('PaymentFor')
        .select('referenceName')
        .where('parent', '=', row.name)
        .execute();

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
