import { ModelNameEnum } from 'models/types';
import { describe, expect, test } from 'vitest';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { Party } from '../Party/Party';
import { SalesInvoice } from '../SalesInvoice/SalesInvoice';
import { getLoyaltyProgramTier } from 'models/helpers';
import { CollectionRulesItems } from '../CollectionRulesItems/CollectionRulesItems';

const fyo = getTestFyo();

describe('Loyalty Program', () => {
  setupTestFyoBeforeAll(fyo);

  const accountData = {
    name: 'Loyalty Point Redemption',
    rootType: 'Liability',
    parentAccount: 'Accounts Payable',
    isGroup: false,
  };

  const itemData = {
    name: 'Pen',
    rate: 4000,
    for: 'Both',
  };

  const partyData = {
    name: 'John Whoe',
    email: 'john@whoe.com',
  };

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 10);

  const toDate = new Date(today);
  toDate.setDate(today.getDate() + 20);

  const loyaltyProgramData = {
    name: 'program',
    fromDate: fromDate,
    toDate: toDate,
    email: 'sample@gmail.com',
    mobile: '1234567890',
    expenseAccount: accountData.name,
  };

  const collectionRulesData = [
    {
      tierName: 'Silver',
      collectionFactor: 0.5,
      minimumTotalSpent: 2000,
    },
    { tierName: 'Gold', collectionFactor: 0.5, minimumTotalSpent: 3000 },
  ];

  test('create test docs', async () => {
    await fyo.doc.getNewDoc(ModelNameEnum.Item, itemData).sync();
    expect(await fyo.db.exists(ModelNameEnum.Item, itemData.name)).toBe(true);

    await fyo.doc.getNewDoc(ModelNameEnum.Party, partyData).sync();
    expect(await fyo.db.exists(ModelNameEnum.Party, partyData.name)).toBe(true);

    await fyo.doc.getNewDoc(ModelNameEnum.Account, accountData).sync();
    expect(await fyo.db.exists(ModelNameEnum.Account, accountData.name)).toBe(true);
  });

  test('create a Loyalty Program document', async () => {
    const loyaltyProgramDoc = fyo.doc.getNewDoc(
      ModelNameEnum.LoyaltyProgram,
      loyaltyProgramData
    );

    await loyaltyProgramDoc.append('collectionRules', collectionRulesData[0]);
    await loyaltyProgramDoc.append('collectionRules', collectionRulesData[1]);

    await loyaltyProgramDoc.sync();

    expect(await fyo.db.exists(ModelNameEnum.LoyaltyProgram, loyaltyProgramData.name)).toBe(true);

    const partyDoc = (await fyo.doc.getDoc(
      ModelNameEnum.Party,
      partyData.name
    )) as Party;

    await partyDoc.setAndSync('loyaltyProgram', loyaltyProgramData.name);
    expect(partyDoc.loyaltyProgram).toBe(loyaltyProgramData.name);
  });

  async function loyaltyPointEntryDoc(sinvName: string) {
    const loyaltyPointEntryData = (await fyo.db.getAll(
      ModelNameEnum.LoyaltyPointEntry,
      {
        fields: ['name', 'customer', 'loyaltyPoints', 'loyaltyProgramTier'],
        filters: { invoice: sinvName! },
      }
    )) as {
      name?: string;
      customer?: string;
      loyaltyPoints?: number;
      loyaltyProgramTier?: string;
    }[];

    if (loyaltyPointEntryData && loyaltyPointEntryData.length > 0) {
      return loyaltyPointEntryData[0];
    }
  }

  async function createSalesInvoice(invoiceDate?: Date) {
    const sinvDoc = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      account: 'Debtors',
      party: partyData.name,
      date: invoiceDate || new Date(),
      items: [
        {
          item: itemData.name,
          rate: itemData.rate,
          quantity: 1,
        },
      ],
    }) as SalesInvoice;

    return sinvDoc;
  }

  test('create Sales Invoice and verify loyalty points are created correctly', async () => {
    const sinvDoc = await createSalesInvoice();

    await sinvDoc.sync();
    await sinvDoc.submit();

    expect(await fyo.db.exists(ModelNameEnum.SalesInvoice, sinvDoc.name)).toBe(true);
    expect(sinvDoc.loyaltyProgram).toBe(loyaltyProgramData.name);

    const loyaltyPointEntryData = await loyaltyPointEntryDoc(
      sinvDoc.name as string
    );

    const loyaltyProgramDoc = (await fyo.doc.getDoc(
      ModelNameEnum.LoyaltyProgram,
      sinvDoc.loyaltyProgram as string
    )) as Party;

    const selectedTier: CollectionRulesItems | undefined = getLoyaltyProgramTier(
      loyaltyProgramDoc,
      fyo.pesa(itemData.rate)
    );

    expect(loyaltyPointEntryData?.loyaltyProgramTier).toBe(selectedTier?.tierName);

    const tierData = collectionRulesData.find((rule) => {
      return rule.tierName === loyaltyPointEntryData?.loyaltyProgramTier;
    });

    expect(loyaltyPointEntryData?.loyaltyPoints).toBe(itemData.rate * (tierData?.collectionFactor as number));
  });

  test('create SINV with future date and verify loyalty points are not created', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const sinvDoc = await createSalesInvoice(futureDate);

    await sinvDoc.sync();
    await sinvDoc.submit();

    expect(await fyo.db.exists(ModelNameEnum.SalesInvoice, sinvDoc.name)).toBe(true);

    const loyaltyPointEntryData = await loyaltyPointEntryDoc(
      sinvDoc.name as string
    );
    expect(loyaltyPointEntryData).toBeUndefined();
  });

  test('redeem loyalty points and verify a new loyalty point entry doc is created', async () => {
    const sinvDoc = await createSalesInvoice();

    sinvDoc.redeemLoyaltyPoints = true;
    sinvDoc.loyaltyPoints = 1000;

    await sinvDoc.sync();
    await sinvDoc.submit();

    expect(await fyo.db.exists(ModelNameEnum.SalesInvoice, sinvDoc.name)).toBe(true);

    const loyaltyPointEntryData = await loyaltyPointEntryDoc(
      sinvDoc.name as string
    );

    expect(await fyo.db.exists(
      ModelNameEnum.LoyaltyPointEntry,
      loyaltyPointEntryData?.name as string
    )).toBe(true);

    expect(loyaltyPointEntryData?.loyaltyPoints).toBe(-1000);

    const partyDoc = (await fyo.doc.getDoc(
      ModelNameEnum.Party,
      partyData.name
    )) as Party;

    const totalPoints = await partyDoc._getTotalLoyaltyPoints();
    expect(totalPoints).toBe(itemData.rate * collectionRulesData[1].collectionFactor + -1000);
  });

  closeTestFyoAfterAll(fyo);
});
