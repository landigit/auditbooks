import { ModelNameEnum } from 'models/types';
import { describe, expect, test } from '@rstest/core';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { getItem, getStockMovement } from 'models/inventory/tests/helpers';
import { SalesInvoice } from '../SalesInvoice/SalesInvoice';
import { assertThrows } from 'backend/database/tests/helpers';
import { MovementTypeEnum } from 'models/inventory/types';

const fyo = getTestFyo();

describe('Coupon Codes', () => {
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
      account: 'Debtors',
    },
  };

  const pricingRuleMap = [
    {
      name: 'PRLE-1001',
      title: 'JKT PDR Offer',
      isCouponCodeBased: true,
      appliedItems: [{ item: itemMap.Jacket.name }],
      discountType: 'Price Discount',
      priceDiscountType: 'rate',
      discountRate: 800,
      minQuantity: 4,
      maxQuantity: 6,
      minAmount: 4000,
      maxAmount: 6000,
      validFrom: '2024-02-01',
      validTo: '2024-02-29',
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

  const couponCodesMap = [
    {
      name: 'COUPON1',
      isEnabled: true,
      couponName: 'coupon1',
      pricingRule: pricingRuleMap[0].name,
      maximumUse: 5,
      used: 0,
      minAmount: 4000,
      maxAmount: 6000,
      validFrom: '2024-02-01',
      validTo: '2024-02-29',
    },
    {
      name: 'COUPON2',
      couponName: 'coupon2',
      pricingRule: pricingRuleMap[1].name,
      maximumUse: 1,
      used: 0,
      minAmount: 200,
      maxAmount: 1000,
      validFrom: '2024-02-01',
      validTo: '2024-02-29',
    },
  ];

  const locationMap = {
    LocationOne: 'LocationOne',
  };

  test('Coupon Codes: create dummy item, party, pricing rules, coupon codes', async () => {
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

    await fyo.singles.AccountingSettings?.setAndSync('enablePricingRule', true);
    expect(fyo.singles.AccountingSettings?.enablePricingRule).toBe(true);

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

    // Create Coupon Codes
    for (const couponCode of Object.values(couponCodesMap)) {
      const ccode: any = { ...couponCode };
      if (typeof ccode.minAmount === 'number')
        ccode.minAmount = fyo.pesa(ccode.minAmount);
      if (typeof ccode.maxAmount === 'number')
        ccode.maxAmount = fyo.pesa(ccode.maxAmount);

      await fyo.doc.getNewDoc(ModelNameEnum.CouponCode, ccode).sync();
      expect(
        await fyo.db.exists(ModelNameEnum.CouponCode, couponCode.name)
      ).toBe(true);
    }

    await fyo.singles.AccountingSettings?.setAndSync('enableCouponCode', true);
    expect(fyo.singles.AccountingSettings?.enableCouponCode).toBe(true);
  });

  test('disabled coupon codes is not applied', async () => {
    // First disable the coupon
    const ccode = await fyo.doc.getDoc(
      ModelNameEnum.CouponCode,
      couponCodesMap[0].name
    );
    await ccode.setAndSync('isEnabled', false);

    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-02-10',
      party: partyMap.partyOne.name,
      account: partyMap.partyOne.account,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Jacket.name,
      quantity: 5,
      rate: itemMap.Jacket.rate,
    });

    await sinv.append('coupons', {
      coupons: couponCodesMap[0].name,
    });

    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length || 0).toBe(0);

    // Re-enable for subsequent tests
    await ccode.setAndSync('isEnabled', true);
  });

  test('Coupon code not created: coupons min amount must be lesser than coupons max.', async () => {
    const data = { ...couponCodesMap[0], minAmount: fyo.pesa(7000) };
    const ccodeDoc = fyo.doc.getNewDoc(ModelNameEnum.CouponCode, data);

    await assertThrows(async () => await ccodeDoc.sync());
  });

  test('Coupon code not created: pricing rules max amount is lower than the coupons min.', async () => {
    const data = { ...couponCodesMap[0], minAmount: fyo.pesa(3000) };
    const ccodeDoc = fyo.doc.getNewDoc(ModelNameEnum.CouponCode, data);

    await assertThrows(async () => await ccodeDoc.sync());
  });

  test('apply coupon code', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-02-10',
      party: partyMap.partyOne.name,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Jacket.name,
      quantity: 5,
      rate: itemMap.Jacket.rate,
    });

    await sinv.append('coupons', { coupons: couponCodesMap[0].name });
    await sinv.runFormulas();

    expect(sinv.pricingRuleDetail?.length).toBe(1);
    expect(sinv.pricingRuleDetail![0].referenceName).toBe(
      pricingRuleMap[0].name
    );
  });

  test('Coupon not applied: incorrect items added.', async () => {
    const sinv = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      date: '2024-02-10',
      party: partyMap.partyOne.name,
      account: partyMap.partyOne.account,
    }) as SalesInvoice;

    await sinv.append('items', {
      item: itemMap.Cap.name,
      quantity: 5,
      rate: itemMap.Cap.rate,
    });

    await sinv.append('coupons', { coupons: couponCodesMap[0].name });

    await sinv.runFormulas();
    await sinv.sync();
    expect(sinv.coupons?.length || 0).toBe(0);
  });

  closeTestFyoAfterAll(fyo);
});
