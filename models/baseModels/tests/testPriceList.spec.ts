import { ModelNameEnum } from 'models/types';
import { describe, expect, test } from 'vitest';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { getItem } from 'models/inventory/tests/helpers';
import { SalesInvoice } from '../SalesInvoice/SalesInvoice';

const fyo = getTestFyo();

describe('Price List', () => {
  setupTestFyoBeforeAll(fyo);

  const itemMap = {
    Pen: {
      name: 'Pen',
      rate: 100,
      unit: 'Unit',
    },
  };

  const partyMap = {
    partyOne: {
      name: 'John Whoe',
      email: 'john@whoe.com',
    },
  };

  const priceListMap = {
    PL_SELL: {
      name: 'PL_SELL',
      isSales: true,
      priceListItem: [
        {
          item: itemMap.Pen.name,
          rate: 101,
        },
      ],
    },
  };

  test('Price List: create dummy item, party, price lists', async () => {
    // Create Items
    for (const { name, rate } of Object.values(itemMap)) {
      const item = getItem(name, rate, false);
      await fyo.doc.getNewDoc(ModelNameEnum.Item, item).sync();
      expect(await fyo.db.exists(ModelNameEnum.Item, name)).toBe(true);
    }

    // Create Parties
    for (const { name, email } of Object.values(partyMap)) {
      await fyo.doc.getNewDoc(ModelNameEnum.Party, { name, email }).sync();
      expect(await fyo.db.exists(ModelNameEnum.Party, name)).toBe(true);
    }

    for (const priceList of Object.values(priceListMap)) {
      await fyo.doc.getNewDoc(ModelNameEnum.PriceList, priceList).sync();
      expect(await fyo.db.exists(ModelNameEnum.PriceList, priceList.name)).toBe(
        true
      );
    }

    await fyo.singles.AccountingSettings?.setAndSync('enablePriceList', true);
  });

  test('Check if InvoiceItem rate fetched from PriceList', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: new Date('2023-01-01'),
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.set('priceList', priceListMap.PL_SELL.name);
    await sinv.append('items', {});
    await sinv.items?.[0].set('item', itemMap.Pen.name);

    expect(sinv.items?.[0].rate?.float).toBe(
      priceListMap.PL_SELL.priceListItem[0].rate
    );
  });

  closeTestFyoAfterAll(fyo);
});
