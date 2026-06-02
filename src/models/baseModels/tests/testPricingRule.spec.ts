import { ModelNameEnum } from 'models/types';
import { describe, expect, test } from 'vite-plus/test';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { SalesInvoice } from '../SalesInvoice/SalesInvoice';
import { getItem, getStockMovement } from 'models/inventory/tests/helpers';
import { PricingRule } from '../PricingRule/PricingRule';
import { MovementTypeEnum } from 'models/inventory/types';

const fyo = getTestFyo();

describe('Pricing Rule', () => {
  setupTestFyoBeforeAll(fyo);

  const itemMap = {
    Jacket: {
      name: 'Jacket',
      rate: 1000,
      unit: 'Unit',
    },
    Cap: {
      name: 'Cap',
      rate: 100,
      unit: 'Unit',
    },
    Pen: {
      name: 'Pen',
      rate: 700,
      unit: 'Unit',
    },
  };

  const partyMap = {
    partyOne: {
      name: 'Daisy',
      email: 'daisy@alien.com',
    },
  };

  const pricingRuleMap = [
    {
      name: 'PRLE-1001',
      isEnabled: false,
      title: 'JKT PDR Offer',
      appliedItems: [{ item: itemMap.Jacket.name }],
      discountType: 'Price Discount',
      priceDiscountType: 'rate',
      discountRate: 800,
      minQuantity: 4,
      maxQuantity: 6,
      minAmount: 4000,
      maxAmount: 6000,
      priority: '1',
    },
    {
      name: 'PRLE-1002',
      title: 'CAP PDR Offer',
      appliedItems: [{ item: itemMap.Cap.name }],
      discountType: 'Product Discount',
      freeItem: 'Pen',
      freeItemQuantity: 1,
      freeItemUnit: 'Unit',
      freeItemRate: 0,
      minQuantity: 4,
      maxQuantity: 6,
      minAmount: 200,
      maxAmount: 1000,
      validFrom: '2024-02-01',
      validTo: '2024-02-29',
      priority: '1',
    },
  ];

  const locationMap = {
    LocationOne: 'LocationOne',
  };

  test('Pricing Rule: create dummy item, party, pricing rules, free items, locations', async () => {
    // Create Items
    for (const { name, rate } of Object.values(itemMap)) {
      const item = getItem(name, rate, false);
      await fyo.doc.getNewDoc(ModelNameEnum.Item, item).sync();
      expect(await fyo.db.exists(ModelNameEnum.Item, name)).toBe(true);
    }

    // Create Party
    await fyo.doc.getNewDoc(ModelNameEnum.Party, partyMap.partyOne).sync();
    expect(
      await fyo.db.exists(ModelNameEnum.Party, partyMap.partyOne.name)
    ).toBe(true);

    // Create Pricing Rules
    for (const pricingRule of Object.values(pricingRuleMap)) {
      const prule: any = { ...pricingRule };
      if (typeof prule.minAmount === 'number')
        prule.minAmount = fyo.pesa(prule.minAmount);
      if (typeof prule.maxAmount === 'number')
        prule.maxAmount = fyo.pesa(prule.maxAmount);

      await fyo.doc.getNewDoc(ModelNameEnum.PricingRule, prule).sync();
      expect(
        await fyo.db.exists(ModelNameEnum.PricingRule, pricingRule.name)
      ).toBe(true);
    }

    // Create Locations
    for (const name of Object.values(locationMap)) {
      await fyo.doc.getNewDoc(ModelNameEnum.Location, { name }).sync();
      expect(await fyo.db.exists(ModelNameEnum.Location, name)).toBe(true);
    }

    // create MaterialReceipt
    const stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialReceipt,
      new Date('2022-11-03T09:57:04.528'),
      [
        {
          item: itemMap.Pen.name,
          to: locationMap.LocationOne,
          quantity: 25,
          rate: 500,
        },
      ],
      fyo
    );
    await (await stockMovement.sync()).submit();
    expect(
      await fyo.db.getStockQuantity(
        itemMap.Pen.name,
        locationMap.LocationOne,
        undefined,
        undefined
      )
    ).toBe(25);

    await fyo.singles.AccountingSettings?.setAndSync('enablePricingRule', true);
    expect(fyo.singles.AccountingSettings?.enablePricingRule).toBe(true);
  });

  test('disabled pricing rule is not applied', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: new Date(),
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', { item: itemMap.Jacket.name, quantity: 5 });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length).toBeUndefined();
  });

  test('pricing rule is applied when filtered by min and max qty', async () => {
    const pruleDoc = (await fyo.doc.getDoc(
      ModelNameEnum.PricingRule,
      pricingRuleMap[0].name
    )) as PricingRule;

    await pruleDoc.set('isEnabled', true);
    await pruleDoc.sync();

    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: new Date(),
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Jacket.name,
      quantity: 5,
      rate: itemMap.Jacket.rate,
    });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail![0].referenceName).toBe(
      pricingRuleMap[0].name
    );
    expect(sinv.items![0].rate!.float).toBe(pricingRuleMap[0].discountRate!);
  });

  test('pricing rule is not applied when item qty is < min qty', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: new Date(),
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', { item: itemMap.Jacket.name, quantity: 3 });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length).toBeUndefined();
  });

  test('pricing rule is not applied when item qty is > max qty', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: new Date(),
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', { item: itemMap.Jacket.name, quantity: 10 });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length).toBeUndefined();
  });

  test('pricing rule is applied when filtered by min and max amount', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: new Date(),
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Jacket.name,
      quantity: 5,
      rate: itemMap.Jacket.rate,
    });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail![0].referenceName).toBe(
      pricingRuleMap[0].name
    );
    expect(sinv.items![0].rate!.float).toBe(pricingRuleMap[0].discountRate!);
  });

  test('Pricing Rule is not applied when item amount is < min amount', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: new Date(),
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Jacket.name,
      quantity: 2,
      rate: itemMap.Jacket.rate,
    });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length).toBeUndefined();
  });

  test('Pricing Rule is not applied when item amount is > max amount', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: new Date(),
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Jacket.name,
      quantity: 7,
      rate: itemMap.Jacket.rate,
    });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length).toBeUndefined();
  });

  test('Pricing Rule is not applied when sinvDate < validFrom date', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-01-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Cap.name,
      quantity: 5,
      rate: itemMap.Cap.rate,
    });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length).toBeUndefined();
  });

  test('Pricing Rule is not applied when sinvDate > validTo date', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-03-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Cap.name,
      quantity: 5,
      rate: itemMap.Cap.rate,
    });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length).toBeUndefined();
  });

  test('Pricing Rule is applied when filtered by qty, amount and dates', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-02-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Cap.name,
      quantity: 5,
      rate: itemMap.Cap.rate,
    });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail![0].referenceName).toBe(
      pricingRuleMap[1].name
    );
  });

  test('Pricing Rule is not applied when qty condition is false, rest is true', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-02-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Cap.name,
      quantity: 7,
      rate: itemMap.Cap.rate,
    });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length).toBeUndefined();
  });

  test('Pricing Rule is not applied when amount condition is false, rest is true', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-02-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Cap.name,
      quantity: 11,
      rate: 250,
    });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length).toBeUndefined();
  });

  test('Highest priority pricing rule is applied', async () => {
    const newPricingRuleDoc = fyo.doc.getNewDoc(ModelNameEnum.PricingRule, {
      ...pricingRuleMap[1],
      name: 'PRLE-1003',
      priority: '2',
      appliedItems: [{ item: itemMap.Cap.name }],
    });

    await newPricingRuleDoc.runFormulas();
    await newPricingRuleDoc.sync();

    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-02-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Cap.name,
      quantity: 5,
      rate: itemMap.Cap.rate,
    });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail![0].referenceName).toBe('PRLE-1003');
  });

  test('Pricing Rule is not applied due to two docs having same priority', async () => {
    const pricingRuleDoc = (await fyo.doc.getDoc(
      ModelNameEnum.PricingRule,
      'PRLE-1003'
    )) as PricingRule;

    await pricingRuleDoc.set('priority', '1');
    await pricingRuleDoc.sync();

    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-02-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Cap.name,
      quantity: 5,
      rate: itemMap.Cap.rate,
    });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length || 0).toBe(0);
  });

  test('create a price discount of type rate, discounted rate should apply', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-02-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Jacket.name,
      quantity: 5,
      rate: itemMap.Jacket.rate,
    });
    await sinv.runFormulas();

    expect(sinv.items![0].rate?.float).toBe(pricingRuleMap[0].discountRate);
  });

  test('create a price discount of type percent, discount percent should apply', async () => {
    const pricingRuleDoc = (await fyo.doc.getDoc(
      ModelNameEnum.PricingRule,
      pricingRuleMap[0].name
    )) as PricingRule;

    await pricingRuleDoc.setMultiple({
      priceDiscountType: 'percentage',
      discountPercentage: 69,
    });

    await pricingRuleDoc.sync();

    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-02-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Jacket.name,
      quantity: 5,
      rate: itemMap.Jacket.rate,
    });
    await sinv.runFormulas();

    expect(sinv.items![0].itemDiscountPercent).toBe(69);
  });

  test('create a price discount of type amount, discount amount should apply', async () => {
    const pricingRuleDoc = (await fyo.doc.getDoc(
      ModelNameEnum.PricingRule,
      pricingRuleMap[0].name
    )) as PricingRule;

    await pricingRuleDoc.setMultiple({
      priceDiscountType: 'amount',
      discountAmount: 500,
    });

    await pricingRuleDoc.sync();

    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-02-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Jacket.name,
      quantity: 5,
      rate: itemMap.Jacket.rate,
    });
    await sinv.runFormulas();

    expect(sinv.items![0].itemDiscountAmount!.float).toBe(500);
  });

  test('create a product discount giving 1 free item', async () => {
    const prle1003 = (await fyo.doc.getDoc(
      ModelNameEnum.PricingRule,
      'PRLE-1003'
    )) as PricingRule;
    await prle1003.setAndSync('isEnabled', false);

    const pricingRuleDoc = (await fyo.doc.getDoc(
      ModelNameEnum.PricingRule,
      'PRLE-1002'
    )) as PricingRule;

    await pricingRuleDoc.set('isEnabled', true);
    await pricingRuleDoc.sync();

    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      account: 'Debtors',
      date: '2024-02-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Cap.name,
      quantity: 5,
      rate: itemMap.Cap.rate,
    });
    await sinv.runFormulas();
    await sinv.sync();

    expect(sinv.items![1].isFreeItem).toBe(true);
    expect(sinv.items![1].rate!.float).toBe(pricingRuleMap[1].freeItemRate!);
    expect(sinv.items![1].quantity).toBe(pricingRuleMap[1].freeItemQuantity);
  });

  test('create a product discount, recurse 2', async () => {
    const pricingRuleDoc = (await fyo.doc.getDoc(
      ModelNameEnum.PricingRule,
      'PRLE-1002'
    )) as PricingRule;

    await pricingRuleDoc.set('isRecursive', true);
    await pricingRuleDoc.set('recurseEvery', 2);
    await pricingRuleDoc.set('roundFreeItemQty', true);
    await pricingRuleDoc.sync();

    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      account: 'Debtors',
      date: '2024-02-01',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Cap.name,
      quantity: 5,
      rate: itemMap.Cap.rate,
    });
    await sinv.runFormulas();
    await sinv.sync();

    expect(sinv.items![1].isFreeItem).toBe(true);
    expect(sinv.items![1].rate!.float).toBe(pricingRuleMap[1].freeItemRate!);
    expect(sinv.items![1].quantity).toBe(2); // floor(5/2) = 2
  });

  closeTestFyoAfterAll(fyo);
});
