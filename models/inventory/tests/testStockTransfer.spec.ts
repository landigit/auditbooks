import { InventorySettings } from 'models/inventory/InventorySettings';
import { StockTransfer } from 'models/inventory/StockTransfer';
import { ModelNameEnum } from 'models/types';
import { describe, expect, test } from 'vitest';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { getALEs, getItem, getSLEs, getStockTransfer } from './helpers';
import { Invoice } from 'models/baseModels/Invoice/Invoice';
import {
  assertThrows,
  assertDoesNotThrow,
} from 'backend/database/tests/helpers';
import { PurchaseReceipt } from '../PurchaseReceipt';
import { Shipment } from '../Shipment';
import { MovementTypeEnum } from '../types';

const fyo = getTestFyo();

describe('Stock Transfer', () => {
  setupTestFyoBeforeAll(fyo);

  beforeAll(() => {
    console.log('Schemas registered in Fyo:', Object.keys(fyo.schemaMap));
    if (!fyo.schemaMap['Item']) {
      console.log('ITEM SCHEMA MISSING!');
    }
  });

  const item = 'Pen';
  const location = 'Common';
  const party = 'Someone';
  const testDocs = {
    Item: {
      [item]: getItem(item, 100),
    },
    Location: {
      [location]: { name: location },
    },
    Party: { [party]: { name: party, Role: 'Both' } },
  };

  test('insert test docs', async () => {
    for (const schemaName of Object.keys(testDocs)) {
      const docs = (testDocs as any)[schemaName];
      for (const name in docs) {
        await fyo.doc.getNewDoc(schemaName, docs[name]).sync();
      }
    }

    expect(await fyo.db.exists(ModelNameEnum.Party, party)).toBe(true);
    expect(await fyo.db.exists(ModelNameEnum.Location, location)).toBe(true);
    expect(await fyo.db.exists(ModelNameEnum.Item, item)).toBe(true);
  });

  test('inventory settings', async () => {
    const doc = (await fyo.doc.getDoc(
      ModelNameEnum.InventorySettings
    )) as InventorySettings;

    expect(doc.stockInHand).toBeDefined();
    expect(doc.stockReceivedButNotBilled).toBeDefined();

    // Debugging MandatoryError
    if (!doc.stockReceivedButNotBilled) {
      const accounts = await fyo.db.getAllRaw('Account', {
        filters: {
          accountType: 'Stock Received But Not Billed',
          isGroup: false,
        },
      });
      console.log(
        'Accounts with type "Stock Received But Not Billed":',
        accounts
      );
    }
  });

  test('PurchaseReceipt, create inward stock movement', async () => {
    const date = new Date('2022-01-01');
    const rate = (testDocs['Item'][item].rate as number) ?? 0;
    const quantity = 10;
    const doc = await getStockTransfer(
      ModelNameEnum.PurchaseReceipt,
      party,
      date,
      [
        {
          item,
          location,
          quantity,
          rate,
        },
      ],
      fyo
    );

    await doc.sync();
    const grandTotal = quantity * rate;
    expect(doc.grandTotal?.float).toBe(grandTotal);

    await doc.submit();

    expect((await fyo.db.getAllRaw(ModelNameEnum.PurchaseReceipt)).length).toBe(
      1
    );
    expect((await getSLEs(doc.name!, doc.schemaName, fyo)).length).toBe(1);
    expect(await fyo.db.getStockQuantity(item, location)).toBe(quantity);
    expect(doc.name?.startsWith('PREC-')).toBe(true);

    const ales = await getALEs(doc.name!, doc.schemaName, fyo);
    for (const ale of ales) {
      expect(ale.party).toBe(party);
      if (ale.account === 'Stock Received But Not Billed') {
        expect(parseFloat(ale.debit)).toBe(0);
        expect(parseFloat(ale.credit)).toBe(grandTotal);
      } else {
        expect(parseFloat(ale.credit)).toBe(0);
        expect(parseFloat(ale.debit)).toBe(grandTotal);
      }
    }
  });

  test('Shipment, create outward stock movement', async () => {
    const date = new Date('2022-01-02');
    const rate = (testDocs['Item'][item].rate as number) ?? 0;
    const quantity = 5;
    const doc = await getStockTransfer(
      ModelNameEnum.Shipment,
      party,
      date,
      [
        {
          item,
          location,
          quantity,
          rate,
        },
      ],
      fyo
    );

    await doc.sync();
    const grandTotal = quantity * rate;
    expect(doc.grandTotal?.float).toBe(grandTotal);

    await doc.submit();

    expect((await fyo.db.getAllRaw(ModelNameEnum.Shipment)).length).toBe(1);
    expect((await getSLEs(doc.name!, doc.schemaName, fyo)).length).toBe(1);
    expect(await fyo.db.getStockQuantity(item, location)).toBe(10 - quantity);
    expect(doc.name?.startsWith('SHPM-')).toBe(true);

    const ales = await getALEs(doc.name!, doc.schemaName, fyo);
    for (const ale of ales) {
      expect(ale.party).toBe(party);
      if (ale.account === 'Cost of Goods Sold') {
        expect(parseFloat(ale.debit)).toBe(grandTotal);
        expect(parseFloat(ale.credit)).toBe(0);
      } else {
        expect(parseFloat(ale.debit)).toBe(0);
        expect(parseFloat(ale.credit)).toBe(grandTotal);
      }
    }
  });

  test('Shipment, invalid', async () => {
    const date = new Date('2022-01-03');
    const rate = (testDocs['Item'][item].rate as number) ?? 0;
    const quantity = 10;
    const doc = await getStockTransfer(
      ModelNameEnum.Shipment,
      party,
      date,
      [
        {
          item,
          location,
          quantity,
          rate,
        },
      ],
      fyo
    );

    await doc.sync();
    const grandTotal = quantity * rate;

    expect(await fyo.db.getStockQuantity(item, location)).toBe(5);
    expect(doc.grandTotal?.float).toBe(grandTotal);
    await assertThrows(async () => await doc.submit());

    expect((await getSLEs(doc.name!, doc.schemaName, fyo)).length).toBe(0);
    expect((await getALEs(doc.name!, doc.schemaName, fyo)).length).toBe(0);
  });

  test('Stock Transfer, invalid cancellation', async () => {
    const receipts = (await fyo.db.getAllRaw(
      ModelNameEnum.PurchaseReceipt
    )) as { name: string }[];
    const { name } = receipts[0] ?? {};

    expect(name?.startsWith('PREC-')).toBe(true);
    const doc = (await fyo.doc.getDoc(
      ModelNameEnum.PurchaseReceipt,
      name
    )) as StockTransfer;
    await assertThrows(async () => await doc.cancel());
    expect(await fyo.db.getStockQuantity(item, location)).toBe(5);
    expect((await getSLEs(name, doc.schemaName, fyo)).length).toBe(1);
    const ales = await getALEs(name, doc.schemaName, fyo);
    expect(ales.every((i) => !i.reverted) && ales.length === 2).toBe(true);
  });

  test('Shipment, cancel and delete', async () => {
    const shipments = (await fyo.db.getAllRaw(ModelNameEnum.Shipment, {
      order: 'asc',
    })) as { name: string }[];
    const { name } = shipments[0] ?? {};

    expect(name?.startsWith('SHPM-')).toBe(true);
    const doc = (await fyo.doc.getDoc(
      ModelNameEnum.Shipment,
      name
    )) as StockTransfer;
    expect(doc.isSubmitted).toBe(true);
    await assertDoesNotThrow(async () => await doc.cancel());
    expect(doc.isCancelled).toBe(true);

    expect(await fyo.db.getStockQuantity(item, location)).toBe(10);
    expect((await getSLEs(name, doc.schemaName, fyo)).length).toBe(0);
    const ales = await getALEs(name, doc.schemaName, fyo);
    expect(ales.every((i) => !!i.reverted) && ales.length === 4).toBe(true);

    await doc.delete();
    expect((await getALEs(name, doc.schemaName, fyo)).length).toBe(0);
    const exists = await fyo.db.exists(ModelNameEnum.Shipment, name);
    expect(exists).toBe(false);
  });

  test('Purchase Receipt, cancel and delete', async () => {
    const receipts = (await fyo.db.getAllRaw(ModelNameEnum.PurchaseReceipt, {
      order: 'asc',
    })) as { name: string }[];
    const { name } = receipts[0] ?? {};

    expect(name?.startsWith('PREC-')).toBe(true);
    const doc = (await fyo.doc.getDoc(
      ModelNameEnum.PurchaseReceipt,
      name
    )) as StockTransfer;
    expect(doc.isSubmitted).toBe(true);
    await assertDoesNotThrow(async () => await doc.cancel());
    expect(doc.isCancelled).toBe(true);

    expect(await fyo.db.getStockQuantity(item, location)).toBe(null);
    expect((await getSLEs(name, doc.schemaName, fyo)).length).toBe(0);
    const ales = await getALEs(name, doc.schemaName, fyo);
    expect(ales.every((i) => !!i.reverted) && ales.length === 4).toBe(true);

    await doc.delete();
    expect((await getALEs(name, doc.schemaName, fyo)).length).toBe(0);
    const exists = await fyo.db.exists(ModelNameEnum.PurchaseReceipt, name);
    expect(exists).toBe(false);
  });

  test('Purchase Invoice then Purchase Receipt', async () => {
    const rate = testDocs.Item[item].rate as number;
    const quantity = 3;
    const pinv = fyo.doc.getNewDoc(ModelNameEnum.PurchaseInvoice) as Invoice;

    const date = new Date('2022-01-04');
    await pinv.set({
      date,
      party,
      account: 'Creditors',
    });
    await pinv.append('items', { item, quantity, rate });
    await pinv.sync();
    await pinv.submit();

    expect(pinv.name).toBe('PINV-1001');
    expect(pinv.stockNotTransferred).toBe(quantity);
    const prec = await pinv.getStockTransfer();
    expect(prec).not.toBeNull();

    if (prec) {
      prec.date = new Date('2022-01-05');
      expect(prec.schemaName).toBe(ModelNameEnum.PurchaseReceipt);
      expect(prec.backReference).toBe(pinv.name);
      expect(prec.items?.[0].quantity).toBe(quantity);

      await assertDoesNotThrow(async () => await prec.sync());
      await assertDoesNotThrow(async () => await prec.submit());

      expect(prec.name).toBe('PREC-1002');
      expect(pinv.stockNotTransferred).toBe(0);
      expect(pinv.items?.[0].stockNotTransferred).toBe(0);
    }
  });

  test('Back Ref Purchase Receipt cancel', async () => {
    const prec = (await fyo.doc.getDoc(
      ModelNameEnum.PurchaseReceipt,
      'PREC-1002'
    )) as StockTransfer;

    expect(prec.backReference).toBe('PINV-1001');
    await assertDoesNotThrow(async () => {
      await prec.cancel();
    });

    const pinv = (await fyo.doc.getDoc(
      ModelNameEnum.PurchaseInvoice,
      'PINV-1001'
    )) as Invoice;

    expect(pinv.stockNotTransferred).toBe(3);
    expect(pinv.items?.[0].stockNotTransferred).toBe(3);
  });

  test('Cancel Purchase Invoice after Purchase Receipt is created', async () => {
    const pinv = (await fyo.doc.getDoc(
      ModelNameEnum.PurchaseInvoice,
      'PINV-1001'
    )) as Invoice;

    const prec = await pinv.getStockTransfer();
    expect(prec).not.toBeNull();

    if (prec) {
      prec.date = new Date('2022-01-05');
      await prec.sync();
      await prec.submit();

      expect(prec.name).toBe('PREC-1003');
      expect(prec.backReference).toBe('PINV-1001');

      await assertThrows(async () => {
        await pinv.cancel();
      });

      const ales = await fyo.db.getAllRaw(ModelNameEnum.AccountingLedgerEntry, {
        fields: ['name', 'reverted'],
        filters: { referenceName: pinv.name!, reverted: true },
      });

      expect(ales.length).toBe(0);
    }
  });

  test('Sales Invoice then partial Shipment', async () => {
    const rate = testDocs.Item[item].rate as number;
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice) as Invoice;

    await sinv.set({
      party,
      date: new Date('2022-01-06'),
      account: 'Debtors',
    });
    await sinv.append('items', { item, quantity: 3, rate });
    await sinv.sync();
    await sinv.submit();

    expect(sinv.name).toBe('SINV-1001');
    expect(sinv.stockNotTransferred).toBe(3);

    const shpm = await sinv.getStockTransfer();
    expect(shpm).not.toBeNull();

    if (shpm) {
      shpm.date = new Date('2022-01-07');
      await shpm.items?.[0].set('quantity', 1);

      await assertDoesNotThrow(async () => await shpm.sync());
      await assertDoesNotThrow(async () => await shpm.submit());

      expect(shpm.schemaName).toBe(ModelNameEnum.Shipment);
      expect(shpm.backReference).toBe(sinv.name);
      expect(shpm.items?.[0].quantity).toBe(1);

      expect(shpm.name).toBe('SHPM-1003');
      expect(sinv.stockNotTransferred).toBe(2);
      expect(sinv.items?.[0].stockNotTransferred).toBe(2);
    }
  });

  test('Sales Invoice then another Shipment', async () => {
    const sinv = (await fyo.doc.getDoc(
      ModelNameEnum.SalesInvoice,
      'SINV-1001'
    )) as Invoice;

    const shpm = await sinv.getStockTransfer();
    expect(shpm).not.toBeNull();

    if (shpm) {
      await assertDoesNotThrow(async () => await shpm.sync());
      await assertDoesNotThrow(async () => await shpm.submit());

      expect(shpm.name).toBe('SHPM-1004');
      expect(shpm.items?.[0].quantity).toBe(2);
      expect(sinv.stockNotTransferred).toBe(0);
      expect(sinv.items?.[0].stockNotTransferred).toBe(0);
      expect(await sinv.getStockTransfer()).toBeNull();
    }
  });

  test('Cancel Sales Invoice after Shipment is created', async () => {
    const sinv = (await fyo.doc.getDoc(
      ModelNameEnum.SalesInvoice,
      'SINV-1001'
    )) as Invoice;
    await assertThrows(async () => await sinv.cancel());

    const ales = await fyo.db.getAllRaw(ModelNameEnum.AccountingLedgerEntry, {
      fields: ['name', 'reverted'],
      filters: { referenceName: sinv.name!, reverted: true },
    });

    expect(ales.length).toBe(0);
  });

  test('Cancel partial Shipment', async () => {
    let shpm = (await fyo.doc.getDoc(
      ModelNameEnum.Shipment,
      'SHPM-1003'
    )) as StockTransfer;

    expect(shpm.backReference).toBe('SINV-1001');
    expect(shpm.items?.[0].quantity).toBe(1);

    await assertDoesNotThrow(async () => await shpm.cancel());
    expect(shpm.isCancelled).toBe(true);

    const sinv = (await fyo.doc.getDoc(
      ModelNameEnum.SalesInvoice,
      'SINV-1001'
    )) as Invoice;
    expect(sinv.stockNotTransferred).toBe(1);

    shpm = (await fyo.doc.getDoc(
      ModelNameEnum.Shipment,
      'SHPM-1004'
    )) as StockTransfer;

    expect(shpm.backReference).toBe('SINV-1001');
    expect(shpm.items?.[0].quantity).toBe(2);

    await assertDoesNotThrow(async () => await shpm.cancel());
    expect(shpm.isCancelled).toBe(true);

    expect(sinv.stockNotTransferred).toBe(3);
  });

  test('Duplicate Shipment, backref unset', async () => {
    const shpm = (await fyo.doc.getDoc(
      ModelNameEnum.Shipment,
      'SHPM-1003'
    )) as StockTransfer;

    expect(shpm.backReference).toBeDefined();

    const doc = shpm.duplicate() as StockTransfer;
    expect(doc.backReference).toBeUndefined();
  });

  test('Cancel and Delete Sales Invoice with cancelled Shipments', async () => {
    const sinv = (await fyo.doc.getDoc(
      ModelNameEnum.SalesInvoice,
      'SINV-1001'
    )) as Invoice;

    await assertDoesNotThrow(async () => await sinv.cancel());
    expect(sinv.isCancelled).toBe(true);

    const transfers = (await fyo.db.getAllRaw(ModelNameEnum.Shipment, {
      fields: ['name'],
      filters: { backReference: 'SINV-1001' },
    })) as { name: string }[];

    await assertDoesNotThrow(async () => await sinv.delete());
    expect(await fyo.db.exists(ModelNameEnum.SalesInvoice, 'SINV-1001')).toBe(
      false
    );

    for (const { name } of transfers) {
      expect(await fyo.db.exists(ModelNameEnum.Shipment, name)).toBe(false);
    }
  });

  test('Create Shipment from manually set Back Ref', async () => {
    const rate = (testDocs['Item'][item].rate as number) ?? 0;
    const totalQuantity = 10;
    const prec = await getStockTransfer(
      ModelNameEnum.PurchaseReceipt,
      party,
      new Date('2022-01-08'),
      [
        {
          item,
          location,
          quantity: totalQuantity,
          rate,
        },
      ],
      fyo
    );
    await (await prec.sync()).submit();

    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice) as Invoice;
    const quantity = 5;
    await sinv.set({
      party,
      date: new Date('2022-01-09'),
      account: 'Debtors',
    });
    await sinv.append('items', { item, quantity, rate });
    await (await sinv.sync()).submit();

    expect(sinv.stockNotTransferred).toBe(quantity);

    const shpm = fyo.doc.getNewDoc(ModelNameEnum.Shipment) as Shipment;
    await shpm.set('backReference', sinv.name);
    await shpm.set('date', new Date('2022-01-10'));
    shpm.items?.[0].set('location', location);

    expect(shpm.party).toBe(sinv.party);

    await (await shpm.sync()).submit();
    expect(await fyo.db.getStockQuantity(item, location)).toBe(
      totalQuantity - quantity
    );
    expect(sinv.stockNotTransferred).toBe(0);
  });

  test('Create Shipment then create return against it', async (_t) => {
    const rate = testDocs.Item[item].rate as number;
    const shpm = fyo.doc.getNewDoc(ModelNameEnum.Shipment) as Shipment;

    await shpm.set({
      party,
      date: new Date('2023-05-18'),
      items: [{ item, quantity: 3, rate }],
    });
    await shpm.sync();
    await shpm.submit();

    expect(shpm.name).toBe('SHPM-1006');

    const shpmReturn = (await shpm.getReturnDoc()) as Shipment;
    await shpmReturn.sync();
    await shpmReturn.submit();

    expect(shpmReturn.name).toBe('SHPM-1007');
    expect(shpmReturn.grandTotal?.isNegative()).toBe(true);

    const returnShpmAles = (await fyo.db.getAllRaw(
      ModelNameEnum.AccountingLedgerEntry,
      {
        fields: ['name', 'account', 'credit', 'debit'],
        filters: { referenceName: shpmReturn.name! },
      }
    )) as { account: string; credit: string; debit: string }[];

    for (const ale of returnShpmAles) {
      if (ale.account === 'Stock In Hand') {
        expect(fyo.pesa(ale.debit as string).float).toBe(
          shpmReturn.grandTotal?.float
        );
      }

      if (ale.account === 'Cost of Goods Sold') {
        expect(fyo.pesa(ale.credit as string).float).toBe(
          shpmReturn.grandTotal?.float
        );
      }
    }
  });

  test('Create Shipment return of batched item', async () => {
    const itemName = 'Jacket-B';
    const rate = fyo.pesa(100);
    const itemData = {
      name: itemName,
      rate,
      trackItem: true,
      hasBatch: true,
    };

    const newItemDoc = fyo.doc.getNewDoc(ModelNameEnum.Item, itemData);
    await newItemDoc.sync();
    await newItemDoc.submit();

    expect(await fyo.db.exists(ModelNameEnum.Item, itemName)).toBe(true);

    const batches = [
      {
        name: 'JKT-A-2',
        expiryDate: new Date('2023-07-27T18:30:00.435Z'),
        manufactureDate: new Date('2023-07-27T18:30:00.435Z'),
      },
      {
        name: 'JKT-B-2',
        expiryDate: new Date('2023-07-27T18:30:00.435Z'),
        manufactureDate: new Date('2023-07-27T18:30:00.435Z'),
      },
    ];

    for (const batch of batches) {
      const batchDoc = fyo.doc.getNewDoc(ModelNameEnum.Batch, batch);
      await batchDoc.sync();
      expect(await fyo.db.exists(ModelNameEnum.Batch, batch.name)).toBe(true);
    }

    const smovDoc = fyo.doc.getNewDoc(ModelNameEnum.StockMovement, {
      date: new Date('2023-07-27T18:30:00.435Z'),
      movementType: MovementTypeEnum.MaterialReceipt,
    });

    await smovDoc.append('items', {
      item: itemName,
      quantity: 4,
      rate,
      toLocation: 'Stores',
      batch: batches[0].name,
    });

    await smovDoc.append('items', {
      item: itemName,
      quantity: 8,
      rate,
      toLocation: 'Stores',
      batch: batches[1].name,
    });

    await smovDoc.sync();
    await smovDoc.submit();

    expect(smovDoc.name).toBe('SMOV-1001');

    const shipmentDoc = fyo.doc.getNewDoc(ModelNameEnum.Shipment) as Shipment;
    await shipmentDoc.set({
      party,
      date: new Date(),
      items: [
        { item: itemName, quantity: 4, rate, batch: batches[0].name },
        { item: itemName, quantity: 8, rate, batch: batches[1].name },
      ],
    });

    await shipmentDoc.sync();
    await shipmentDoc.submit();

    expect(shipmentDoc.name).toBe('SHPM-1008');

    const shpmReturnDoc = fyo.doc.getNewDoc(ModelNameEnum.Shipment) as Shipment;

    await shpmReturnDoc.set({
      date: new Date(),
      party,
      returnAgainst: shipmentDoc.name,
      items: [
        { item: itemName, quantity: 2, rate, batch: batches[0].name },
        { item: itemName, quantity: 4, rate, batch: batches[1].name },
      ],
    });
    await shpmReturnDoc.sync();
    await shpmReturnDoc.submit();

    expect(shpmReturnDoc.name).toBe('SHPM-1009');

    const secondReturnDoc = (await shipmentDoc.getReturnDoc()) as Shipment;

    for (const itemRow of secondReturnDoc.items!) {
      if (itemRow.batch == batches[0].name) {
        const docItemQty = shipmentDoc.items![0].quantity as number;
        const retItemQty = shpmReturnDoc.items![0].quantity as number;
        const balanceQty = retItemQty - docItemQty;

        expect(itemRow.quantity).toBe(balanceQty);
      }

      if (itemRow.batch == batches[1].name) {
        const docItemQty = shipmentDoc.items![1].quantity as number;
        const retItemQty = shpmReturnDoc.items![1].quantity as number;
        const balanceQty = retItemQty - docItemQty;

        expect(itemRow.quantity).toBe(balanceQty);
      }
    }
  });

  test('Create Purchase Reciept then create return against it', async () => {
    const rate = testDocs.Item[item].rate as number;
    const prec = fyo.doc.getNewDoc(
      ModelNameEnum.PurchaseReceipt
    ) as PurchaseReceipt;

    await prec.set({
      party,
      date: new Date('2023-05-18'),
      items: [{ item, quantity: 3, rate }],
    });
    await prec.sync();
    await prec.submit();

    expect(prec.name).toBe('PREC-1005');

    const precReturn = (await prec.getReturnDoc()) as PurchaseReceipt;
    await precReturn.sync();
    await precReturn.submit();

    expect(precReturn.name).toBe('PREC-1006');
    expect(precReturn.grandTotal?.isNegative()).toBe(true);

    const returnPrecAles = (await fyo.db.getAllRaw(
      ModelNameEnum.AccountingLedgerEntry,
      {
        fields: ['name', 'account', 'credit', 'debit'],
        filters: { referenceName: precReturn.name! },
      }
    )) as { account: string; credit: string; debit: string }[];

    for (const ale of returnPrecAles) {
      if (ale.account === 'Stock In Hand') {
        expect(fyo.pesa(ale.credit as string).float).toBe(
          precReturn.grandTotal?.float
        );
      }

      if (ale.account === 'Stock Received But Not Billed') {
        expect(fyo.pesa(ale.debit as string).float).toBe(
          precReturn.grandTotal?.float
        );
      }
    }
  });

  test('Create Purchase Reciept return of serialized item', async () => {
    const itemName = 'Jacket-S';
    const rate = fyo.pesa(100);
    const itemData = {
      name: itemName,
      rate,
      trackItem: true,
      hasSerialNumber: true,
    };
    const serialNumbers = {
      row1: ['JKT-S-A-001', 'JKT-S-A-002'],
      row2: ['JKT-S-B-001', 'JKT-S-B-002'],
    };

    const newItemDoc = fyo.doc.getNewDoc(ModelNameEnum.Item, itemData);
    await newItemDoc.sync();
    await newItemDoc.submit();

    expect(await fyo.db.exists(ModelNameEnum.Item, itemName)).toBe(true);

    const precDoc = fyo.doc.getNewDoc(ModelNameEnum.PurchaseReceipt, {
      date: new Date('2023-07-27T18:30:00.435Z'),
      party,
    }) as PurchaseReceipt;

    await precDoc.append('items', {
      item: itemName,
      quantity: 2,
      rate,
      toLocation: 'Stores',
      serialNumber: serialNumbers.row1.join('\n'),
    });

    await precDoc.append('items', {
      item: itemName,
      quantity: 2,
      rate,
      toLocation: 'Stores',
      serialNumber: serialNumbers.row2.join('\n'),
    });

    await precDoc.sync();
    await precDoc.submit();

    expect(precDoc.name).toBe('PREC-1007');

    const returnPrecDoc = fyo.doc.getNewDoc(ModelNameEnum.PurchaseReceipt, {
      date: new Date('2023-07-27T18:30:00.435Z'),
      party,
      returnAgainst: precDoc.name,
    }) as PurchaseReceipt;

    await returnPrecDoc.append('items', {
      item: itemName,
      quantity: 1,
      rate,
      toLocation: 'Stores',
      serialNumber: serialNumbers.row1[0],
    });

    await returnPrecDoc.append('items', {
      item: itemName,
      quantity: 1,
      rate,
      toLocation: 'Stores',
      serialNumber: serialNumbers.row2[0],
    });

    await returnPrecDoc.sync();
    await returnPrecDoc.submit();

    expect(returnPrecDoc.name).toBe('PREC-1008');

    const secondPrecReturnDoc =
      (await precDoc.getReturnDoc()) as PurchaseReceipt;
    const returnBalSerialNumbers = secondPrecReturnDoc.items
      ?.map((item) => item.serialNumber?.split('\n'))
      .flat();

    expect(returnBalSerialNumbers?.length).toBe(2);

    const returnedSerialNumbers = [
      returnPrecDoc.items![0].serialNumber,
      returnPrecDoc.items![1].serialNumber,
    ];

    for (const serialNumber of returnedSerialNumbers) {
      const status = await fyo.getValue(
        ModelNameEnum.SerialNumber,
        serialNumber as string,
        'status'
      );

      expect(status).toBe('Delivered');
    }

    for (const serialNumber of returnBalSerialNumbers!) {
      const status = await fyo.getValue(
        ModelNameEnum.SerialNumber,
        serialNumber as string,
        'status'
      );

      expect(status).toBe('Active');
    }
  });

  closeTestFyoAfterAll(fyo);
});
