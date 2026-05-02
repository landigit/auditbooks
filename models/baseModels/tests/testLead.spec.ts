import { ModelNameEnum } from 'models/types';
import { describe, expect, test } from 'vitest';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { Lead } from '../Lead/Lead';
import { Party } from '../Party/Party';

const fyo = getTestFyo();

describe('Lead', () => {
  setupTestFyoBeforeAll(fyo);

  const leadData = {
    name: 'name2',
    status: 'Open',
    email: 'sample@gmail.com',
    mobile: '1234567890',
  };

  const itemData: { name: string; rate: number } = {
    name: 'Pen',
    rate: 100,
  };

  test('create test docs for Lead', async () => {
    await fyo.doc.getNewDoc(ModelNameEnum.Item, itemData).sync();
    expect(await fyo.db.exists(ModelNameEnum.Item, itemData.name)).toBe(true);
  });

  test('create a Lead doc', async () => {
    await fyo.doc.getNewDoc(ModelNameEnum.Lead, leadData).sync();
    expect(await fyo.db.exists(ModelNameEnum.Lead, leadData.name)).toBe(true);
  });

  test('create Customer from Lead', async () => {
    const leadDoc = (await fyo.doc.getDoc(ModelNameEnum.Lead, 'name2')) as Lead;
    const newCustomer = leadDoc.createCustomer();

    expect(leadDoc.status).toBe('Open');

    await newCustomer.sync();

    expect(leadDoc.status).toBe('Converted');
    expect(await fyo.db.exists(ModelNameEnum.Party, newCustomer.name)).toBe(
      true
    );
  });

  test('create SalesQuote', async () => {
    const leadDoc = (await fyo.doc.getDoc(ModelNameEnum.Lead, 'name2')) as Lead;
    const newSalesQuote = leadDoc.createSalesQuote();

    newSalesQuote.items = [];
    await newSalesQuote.append('items', {
      item: itemData.name,
      quantity: 1,
      rate: itemData.rate,
    });

    expect(leadDoc.status).toBe('Converted');

    await newSalesQuote.sync();
    await newSalesQuote.submit();

    expect(leadDoc.status).toBe('Quotation');
    expect(
      await fyo.db.exists(ModelNameEnum.SalesQuote, newSalesQuote.name)
    ).toBe(true);
  });

  test('delete Customer then lead status changes to Interested', async () => {
    const partyDoc = (await fyo.doc.getDoc(
      ModelNameEnum.Party,
      'name2'
    )) as Party;

    await partyDoc.delete();

    expect(await fyo.db.exists(ModelNameEnum.Party, 'name2')).toBe(false);

    const leadDoc = (await fyo.doc.getDoc(ModelNameEnum.Lead, 'name2')) as Lead;
    expect(leadDoc.status).toBe('Interested');
  });

  closeTestFyoAfterAll(fyo);
});
