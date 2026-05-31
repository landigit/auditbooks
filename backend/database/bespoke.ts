import { Cashflow, TopExpenses, TotalCreditAndDebit } from 'utils/db/types';
import { ModelNameEnum } from '../../models/types';
import DatabaseCore from './core';
import { BespokeFunction } from './types';
import { DocItem, ReturnDocItem } from 'models/inventory/types';
import { safeParseFloat } from 'utils/index';

import {
  account,
  accountingLedgerEntry,
  salesInvoice,
  payment,
  paymentFor,
  stockLedgerEntry,
} from '../../drizzle/db/schema';
import { eq, and, inArray, between, sql, desc, SQL } from 'drizzle-orm';
import { getTable } from '../../drizzle/db/operations';

export class BespokeQueries {
  [key: string]: BespokeFunction;

  static async getLastInserted(
    db: DatabaseCore,
    schemaName: string
  ): Promise<number> {
    if (!db.client) {
      return 0;
    }
    const lastInserted = await db.client.execute({
      sql: `select cast(name as int) as num from "${schemaName}" order by num desc limit 1`,
      args: [],
    });

    const num = lastInserted.rows[0]?.num;
    if (num === undefined || num === null) {
      return 0;
    }
    return Number(num);
  }

  static async getTopExpenses(
    db: DatabaseCore,
    fromDate: string,
    toDate: string
  ) {
    if (!db.drizzleDb) {
      return [] as any;
    }
    const expenseAccountsQuery = db.drizzleDb
      .select({ name: account.name })
      .from(account)
      .where(eq(account.rootType, 'Expense'));

    const topExpenses = await db.drizzleDb
      .select({
        account: accountingLedgerEntry.account,
        total:
          sql<number>`sum(cast(${accountingLedgerEntry.debit} as real) - cast(${accountingLedgerEntry.credit} as real))`.as(
            'total'
          ),
      })
      .from(accountingLedgerEntry)
      .where(
        and(
          eq(accountingLedgerEntry.reverted, '0'),
          inArray(accountingLedgerEntry.account, expenseAccountsQuery),
          between(accountingLedgerEntry.date, fromDate, toDate)
        )
      )
      .groupBy(accountingLedgerEntry.account)
      .orderBy(desc(sql`total`))
      .limit(5);

    return topExpenses as TopExpenses;
  }

  static async getTotalOutstanding(
    db: DatabaseCore,
    schemaName: string,
    fromDate: string,
    toDate: string
  ) {
    if (!db.drizzleDb) {
      return {} as any;
    }
    const table = getTable(schemaName);
    const result = await db.drizzleDb
      .select({
        total: sql<number>`sum(cast(${table.baseGrandTotal} as real))`,
        outstanding: sql<number>`sum(cast(${table.outstandingAmount} as real))`,
      })
      .from(table)
      .where(
        and(
          eq(table.submitted, true),
          eq(table.cancelled, false),
          between(table.date, fromDate, toDate)
        )
      )
      .limit(1);

    return result[0] || {};
  }

  static async getCashflow(db: DatabaseCore, fromDate: string, toDate: string) {
    if (!db.drizzleDb) {
      return [] as any;
    }
    const cashAndBankAccounts = db.drizzleDb
      .select({ name: account.name })
      .from(account)
      .where(
        and(
          inArray(account.accountType, ['Cash', 'Bank']),
          eq(account.isGroup, '0')
        )
      );

    const dateAsMonthYear = sql`strftime('%Y-%m', ${accountingLedgerEntry.date})`;

    return (await db.drizzleDb
      .select({
        yearmonth: dateAsMonthYear.as('yearmonth'),
        inflow: sql<number>`sum(cast(${accountingLedgerEntry.debit} as real))`,
        outflow: sql<number>`sum(cast(${accountingLedgerEntry.credit} as real))`,
      })
      .from(accountingLedgerEntry)
      .where(
        and(
          eq(accountingLedgerEntry.reverted, '0'),
          inArray(accountingLedgerEntry.account, cashAndBankAccounts),
          between(accountingLedgerEntry.date, fromDate, toDate)
        )
      )
      .groupBy(dateAsMonthYear)) as Cashflow;
  }

  static async getIncomeAndExpenses(
    db: DatabaseCore,
    fromDate: string,
    toDate: string
  ) {
    if (!db.client) {
      return { income: [], expense: [] };
    }
    const incomeRes = await db.client.execute({
      sql: `
        select sum(cast(credit as real) - cast(debit as real)) as balance, strftime('%Y-%m', date) as yearmonth
        from AccountingLedgerEntry
        where
          reverted = 0 and
          date between date(?) and date(?) and
          account in (
            select name
            from Account
            where rootType = 'Income'
          )
        group by yearmonth`,
      args: [fromDate, toDate],
    });

    const expenseRes = await db.client.execute({
      sql: `
        select sum(cast(debit as real) - cast(credit as real)) as balance, strftime('%Y-%m', date) as yearmonth
        from AccountingLedgerEntry
        where
          reverted = 0 and
          date between date(?) and date(?) and
          account in (
            select name
            from Account
            where rootType = 'Expense'
          )
        group by yearmonth`,
      args: [fromDate, toDate],
    });

    return { income: incomeRes.rows, expense: expenseRes.rows };
  }

  static async getTotalCreditAndDebit(db: DatabaseCore) {
    if (!db.client) {
      return [] as any;
    }
    const res = await db.client.execute(`
      select 
        account, 
        sum(cast(credit as real)) as totalCredit, 
        sum(cast(debit as real)) as totalDebit
      from AccountingLedgerEntry
      group by account
    `);
    return res.rows as unknown as TotalCreditAndDebit;
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
    if (!db.drizzleDb) {
      return null;
    }
    const conditions: SQL[] = [eq(stockLedgerEntry.item, item)];

    if (location) {
      conditions.push(eq(stockLedgerEntry.location, location));
    }

    if (batch) {
      conditions.push(eq(stockLedgerEntry.batch, batch));
    }

    if (serialNumbers?.length) {
      conditions.push(inArray(stockLedgerEntry.serialNumber, serialNumbers));
    }

    if (fromDate) {
      conditions.push(
        sql`datetime(${stockLedgerEntry.date}) > datetime(${fromDate})`
      );
    }

    if (toDate) {
      conditions.push(
        sql`datetime(${stockLedgerEntry.date}) < datetime(${toDate})`
      );
    }

    const res = await db.drizzleDb
      .select({
        total: sql<number>`sum(cast(${stockLedgerEntry.quantity} as real))`,
      })
      .from(stockLedgerEntry)
      .where(and(...conditions));

    if (!res.length || res[0].total === null) {
      return null;
    }

    return Number(res[0].total);
  }

  static async getReturnBalanceItemsQty(
    db: DatabaseCore,
    schemaName: ModelNameEnum,
    docName: string
  ): Promise<Record<string, ReturnDocItem> | undefined> {
    if (!db.drizzleDb) {
      return;
    }
    const docTable = getTable(schemaName);
    const itemTable = getTable(`${schemaName}Item`);

    const returnDocNamesRes = await db.drizzleDb
      .select({ name: docTable.name })
      .from(docTable)
      .where(
        and(
          eq(docTable.returnAgainst, docName),
          eq(docTable.submitted, true),
          eq(docTable.cancelled, false)
        )
      );
    const returnDocNames = returnDocNamesRes.map((i) => i.name as string);

    if (!returnDocNames.length) {
      return;
    }

    const isInvoice = [
      ModelNameEnum.SalesInvoice,
      ModelNameEnum.PurchaseInvoice,
    ].includes(schemaName);
    const selectFields: any = {
      quantity: sql<number>`sum(cast(${itemTable.quantity} as real))`,
      item: itemTable.item,
      batch: itemTable.batch,
    };
    const groupByFields: any[] = [itemTable.item, itemTable.batch];

    if (!isInvoice && 'serialNumber' in itemTable) {
      selectFields.serialNumber = itemTable.serialNumber;
      groupByFields.push(itemTable.serialNumber);
    }

    const returnedItems = (await db.drizzleDb
      .select(selectFields)
      .from(itemTable)
      .where(inArray(itemTable.parent, returnDocNames))
      .groupBy(...groupByFields)) as unknown as DocItem[];

    if (!returnedItems.length) {
      return;
    }

    const docItemsSelectFields: any = {
      name: itemTable.name,
      quantity: sql<number>`sum(cast(${itemTable.quantity} as real))`,
      item: itemTable.item,
      batch: itemTable.batch,
    };

    if (!isInvoice && 'serialNumber' in itemTable) {
      docItemsSelectFields.serialNumber = itemTable.serialNumber;
    }

    const docItems = (await db.drizzleDb
      .select(docItemsSelectFields)
      .from(itemTable)
      .where(eq(itemTable.parent, docName))
      .groupBy(...groupByFields)) as unknown as DocItem[];

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
      const existingDocItem = Reflect.get(docItemsMap, item.item);
      if (existingDocItem) {
        if (item.batch) {
          let serialNumbers: string[] | undefined;

          const batches = existingDocItem.batches!;
          const batchInfo = Reflect.get(batches, item.batch);
          if (!batchInfo) {
            Reflect.set(batches, item.batch, {
              quantity: item.quantity,
              serialNumbers,
            });
          } else {
            batchInfo.quantity += item.quantity;
            Reflect.set(batches, item.batch, {
              quantity: batchInfo.quantity,
              serialNumbers,
            });
          }
        } else {
          existingDocItem.quantity += item.quantity;
        }

        if (item.serialNumber) {
          const serialNumbers: string[] = [];

          if (existingDocItem.serialNumbers) {
            serialNumbers.push(...(existingDocItem.serialNumbers ?? []));
          }

          serialNumbers.push(...item.serialNumber.split('\n'));
          existingDocItem.serialNumbers = serialNumbers;
        }
        continue;
      }

      if (item.batch) {
        let serialNumbers: string[] | undefined = undefined;
        if (item.serialNumber) {
          serialNumbers = item.serialNumber.split('\n');
        }

        Reflect.set(batchesMap, item.batch, {
          serialNumbers,
          quantity: item.quantity,
        });
      }

      let serialNumbers: string[] | undefined = undefined;

      if (!item.batch && item.serialNumber) {
        serialNumbers = item.serialNumber.split('\n');
      }

      Reflect.set(docItemsMap, item.item, {
        serialNumbers,
        batches: batchesMap,
        quantity: item.quantity,
      });
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
      let balanceQty = safeParseFloat(-Reflect.get(docItemsMap, row).quantity);
      const docItem = Reflect.get(docItemsMap, row);
      const returnedDocItem = Reflect.get(returnedItemsMap, row);
      const docItemHasBatch = !!Object.keys(docItem.batches ?? {}).length;

      if (returnedItemsMap) {
        for (const item in returnedItemsMap) {
          if (docItemHasBatch && item !== row) {
            continue;
          }

          balanceQty = -(
            Math.abs(balanceQty) + Reflect.get(returnedItemsMap, item).quantity
          );

          const returnedItem = Reflect.get(returnedItemsMap, item);

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
          const docItemSerialNumbers = Reflect.get(
            docItem.batches,
            batch
          ).serialNumbers;
          const itemSerialNumbers = Reflect.get(
            docItem.batches,
            batch
          ).serialNumbers;
          let balanceSerialNumbers: string[] | undefined;

          if (docItemSerialNumbers && itemSerialNumbers) {
            balanceSerialNumbers = docItemSerialNumbers.filter(
              (serialNumber: string) =>
                itemSerialNumbers.indexOf(serialNumber) == -1
            );
          }

          const ItemQty = Math.abs(
            Reflect.get(docItem.batches, batch).quantity
          );
          let balanceQty = safeParseFloat(-ItemQty);

          if (!returnedDocItem || !returnedDocItem?.batches) {
            continue;
          }

          const returnedItem = Reflect.get(returnedDocItem?.batches, batch);

          if (!returnedItem) {
            Reflect.set(balanceBatchQtyMap, batch, {
              quantity: balanceQty,
              serialNumbers: balanceSerialNumbers,
            });
            continue;
          }

          balanceQty = -(
            Math.abs(safeParseFloat(-ItemQty)) -
            Math.abs(Reflect.get(returnedDocItem.batches, batch).quantity)
          );

          Reflect.set(balanceBatchQtyMap, batch, {
            quantity: balanceQty,
            serialNumbers: balanceSerialNumbers,
          });
        }
      }

      Reflect.set(returnBalanceItems, row, {
        quantity: balanceQty,
        batches: balanceBatchQtyMap,
        serialNumbers: balanceSerialNumbersMap,
      });
    }

    return returnBalanceItems;
  }

  static async getPOSTransactedAmount(
    db: DatabaseCore,
    fromDate: Date,
    toDate: Date,
    lastShiftClosingDate?: Date
  ): Promise<Record<string, number> | undefined> {
    if (!db.drizzleDb) {
      return;
    }
    const conditions: SQL[] = [
      eq(salesInvoice.isPos, '1'),
      between(salesInvoice.date, fromDate.toISOString(), toDate.toISOString()),
    ];

    if (lastShiftClosingDate) {
      conditions.push(
        sql`${salesInvoice.created} > ${lastShiftClosingDate.toISOString()}`
      );
    }

    const invoices = (await db.drizzleDb
      .select({
        name: salesInvoice.name,
        returnAgainst: salesInvoice.returnAgainst,
      })
      .from(salesInvoice)
      .where(and(...conditions))) as {
      name: string;
      returnAgainst: string | null;
    }[];

    if (!invoices.length) {
      return;
    }

    const sinvNames = invoices.map((row) => row.name);
    const invoiceSignMap = invoices.reduce<Record<string, number>>(
      (map, inv) => {
        Reflect.set(map, inv.name, inv.returnAgainst ? -1 : 1);
        return map;
      },
      {}
    );

    const paymentEntryNamesRes = await db.drizzleDb
      .select({
        parent: paymentFor.parent,
        referenceName: paymentFor.referenceName,
      })
      .from(paymentFor)
      .where(inArray(paymentFor.referenceName, sinvNames));
    const paymentEntryNames = paymentEntryNamesRes.map((doc) => doc.parent);

    if (!paymentEntryNames.length) {
      return;
    }

    const groupedAmounts = (await db.drizzleDb
      .select({
        paymentMethod: payment.paymentMethod,
        name: payment.name,
        amount: sql<number>`sum(cast(${payment.amount} as real))`.as('amount'),
      })
      .from(payment)
      .where(inArray(payment.name, paymentEntryNames))
      .groupBy(payment.paymentMethod, payment.name)) as any[];

    const transactedAmounts: Record<string, number> = {};

    for (const row of groupedAmounts) {
      const paymentRefs = (await db.drizzleDb
        .select({
          referenceName: paymentFor.referenceName,
        })
        .from(paymentFor)
        .where(eq(paymentFor.parent, row.name))) as { referenceName: string }[];

      for (const ref of paymentRefs) {
        const sign = Reflect.get(invoiceSignMap, ref.referenceName) ?? 1;
        const signedAmount = Number(row.amount) * sign;

        Reflect.set(
          transactedAmounts,
          row.paymentMethod,
          (Reflect.get(transactedAmounts, row.paymentMethod) ?? 0) +
            signedAmount
        );
      }
    }

    return transactedAmounts;
  }
}
