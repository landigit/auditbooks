import { ModelNameEnum } from 'models/types';
import { describe, expect, test } from 'vite-plus/test';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { SalesInvoice } from '../SalesInvoice/SalesInvoice';
import { Payment } from '../Payment/Payment';
import { PaymentTypeEnum } from '../Payment/types';
import { assertDoesNotThrow, assertThrows } from 'tests/testHelpers';
import { PurchaseInvoice } from '../PurchaseInvoice/PurchaseInvoice';

const fyo = getTestFyo();

describe('Invoice', () => {
  setupTestFyoBeforeAll(fyo);

  const itemData = {
    name: 'Pen',
    rate: 100,
    unit: 'Unit',
    for: 'Both',
    trackItem: true,
    hasBatch: true,
    hasSerialNumber: true,
  };

  const partyData = {
    name: 'John Whoe',
    email: 'john@whoe.com',
  };

  const batchMap = {
    batchOne: {
      name: 'PN-AB001',
      manufactureDate: '2022-11-03T09:57:04.528',
    },
    batchTwo: {
      name: 'PN-AB002',
      manufactureDate: '2022-10-03T09:57:04.528',
    },
  };

  test('create test docs', async () => {
    await fyo.doc.getNewDoc(ModelNameEnum.Item, itemData).sync();
    expect(await fyo.db.exists(ModelNameEnum.Item, itemData.name)).toBe(true);

    await fyo.doc.getNewDoc(ModelNameEnum.Party, partyData).sync();
    expect(await fyo.db.exists(ModelNameEnum.Party, partyData.name)).toBe(true);

    for (const batch of Object.values(batchMap)) {
      await fyo.doc.getNewDoc(ModelNameEnum.Batch, batch).sync();
      expect(await fyo.db.exists(ModelNameEnum.Batch, batch.name)).toBe(true);
    }
  });

  test('create SINV with batch then create payment against it', async () => {
    const sinvDoc = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      account: 'Debtors',
      party: partyData.name,
      items: [
        {
          item: itemData.name,
          batch: batchMap.batchOne.name,
          rate: itemData.rate,
          quantity: 2,
        },
      ],
    }) as SalesInvoice;

    await sinvDoc.sync();
    await sinvDoc.runFormulas();
    await sinvDoc.submit();

    expect(await fyo.db.exists(ModelNameEnum.SalesInvoice, sinvDoc.name)).toBe(
      true
    );

    const paymentDoc = sinvDoc.getPayment();
    await paymentDoc?.sync();
    await paymentDoc?.submit();

    expect(paymentDoc?.name).toBe('PAY-1001');
  });

  test('create SINV return for one qty', async () => {
    const sinvDoc = (await fyo.doc.getDoc(
      ModelNameEnum.SalesInvoice,
      'SINV-1001'
    )) as SalesInvoice;

    const returnDoc = (await sinvDoc?.getReturnDoc()) as SalesInvoice;

    returnDoc.items = [];
    await returnDoc.append('items', {
      item: itemData.name,
      batch: batchMap.batchOne.name,
      quantity: 1,
      rate: itemData.rate,
    });

    await returnDoc.runFormulas();
    await returnDoc.sync();
    await returnDoc.submit();

    expect(
      await fyo.db.exists(ModelNameEnum.SalesInvoice, returnDoc.name)
    ).toBe(true);
    expect(returnDoc.outstandingAmount?.float).toBe(itemData.rate);

    const returnSinvAles = (await fyo.db.getAllRaw(
      ModelNameEnum.AccountingLedgerEntry,
      {
        fields: ['name', 'account', 'credit', 'debit'],
        filters: { referenceName: returnDoc.name! },
      }
    )) as { account: string; credit: string; debit: string }[];

    for (const ale of returnSinvAles) {
      if (ale.account === 'Sales') {
        expect(fyo.pesa(ale.debit as string).float).toBe(
          fyo.pesa(itemData.rate).float
        );
      }

      if (ale.account === 'Debtors') {
        expect(fyo.pesa(ale.credit as string).float).toBe(
          fyo.pesa(itemData.rate).float
        );
      }
    }

    await assertThrows(async () => await sinvDoc.cancel());
  });

  test('create SINV return for balance qty', async () => {
    const sinvDoc = (await fyo.doc.getDoc(
      ModelNameEnum.SalesInvoice,
      'SINV-1001'
    )) as SalesInvoice;

    const returnDoc = (await sinvDoc?.getReturnDoc()) as SalesInvoice;
    expect(returnDoc.items![0].quantity).toBe(-1);

    await returnDoc.sync();
    await returnDoc.runFormulas();
    await returnDoc.submit();

    expect(
      await fyo.db.exists(ModelNameEnum.SalesInvoice, returnDoc.name)
    ).toBe(true);
    expect(returnDoc.outstandingAmount?.float).toBe(itemData.rate);
  });

  test('create payment for return invoice', async () => {
    const returnDoc = (await fyo.doc.getDoc(
      ModelNameEnum.SalesInvoice,
      'SINV-1002'
    )) as SalesInvoice;

    expect(returnDoc.returnAgainst).toBe('SINV-1001');

    const paymentDoc = returnDoc.getPayment() as Payment;
    expect(paymentDoc.paymentType).toBe(PaymentTypeEnum.Pay);
    expect(paymentDoc.amount?.float).toBe(itemData.rate);

    await paymentDoc.sync();
    expect(await fyo.db.exists(ModelNameEnum.Payment, paymentDoc.name)).toBe(
      true
    );

    await assertDoesNotThrow(async () => await returnDoc.cancel());
  });

  test('creating PINV return when invoice is not paid', async () => {
    const pinvDoc = fyo.doc.getNewDoc(
      ModelNameEnum.PurchaseInvoice
    ) as PurchaseInvoice;

    await pinvDoc.set({
      party: partyData.name,
      account: 'Creditors',
      items: [
        {
          item: itemData.name,
          batch: batchMap.batchOne.name,
          quantity: 2,
          rate: itemData.rate,
        },
      ],
    });
    await pinvDoc.sync();
    await pinvDoc.submit();

    expect(pinvDoc.name).toBe('PINV-1001');

    const returnDoc = (await pinvDoc.getReturnDoc()) as PurchaseInvoice;
    await returnDoc.sync();
    await returnDoc.submit();

    expect(returnDoc?.returnAgainst).toBe(pinvDoc.name);
    expect(returnDoc.items![0].quantity).toBe(-2);

    const returnSinvAles = (await fyo.db.getAllRaw(
      ModelNameEnum.AccountingLedgerEntry,
      {
        fields: ['name', 'account', 'credit', 'debit'],
        filters: { referenceName: returnDoc.name! },
      }
    )) as { account: string; credit: string; debit: string }[];

    for (const ale of returnSinvAles) {
      if (ale.account === 'Creditors') {
        expect(returnDoc.outstandingAmount!.float).toBe(0);
      }

      if (ale.account === 'Cost of Goods Sold') {
        expect(fyo.pesa(ale.credit as string).float).toBe(
          returnDoc.outstandingAmount!.float
        );
      }
    }
  });

  closeTestFyoAfterAll(fyo);
});
