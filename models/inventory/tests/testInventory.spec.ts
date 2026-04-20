import {
  assertDoesNotThrow,
  assertThrows,
} from 'backend/database/tests/helpers';
import { ModelNameEnum } from 'models/types';
import { describe, expect, test } from 'vitest';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { StockMovement } from '../StockMovement';
import { MovementTypeEnum } from '../types';
import { getItem, getSLEs, getStockMovement } from './helpers';

const fyo = getTestFyo();

describe('Inventory', () => {
  setupTestFyoBeforeAll(fyo);

  const itemMap = {
    Pen: {
      name: 'Pen',
      rate: 700,
    },
    Ink: {
      name: 'Ink',
      rate: 50,
    },
  };

  const locationMap = {
    LocationOne: 'LocationOne',
    LocationTwo: 'LocationTwo',
  };

  test('create dummy items & locations', async () => {
    // Create Items
    for (const { name, rate } of Object.values(itemMap)) {
      const item = getItem(name, rate);
      await fyo.doc.getNewDoc(ModelNameEnum.Item, item).sync();
      expect(await fyo.db.exists(ModelNameEnum.Item, name)).toBe(true);
    }

    // Create Locations
    for (const name of Object.values(locationMap)) {
      await fyo.doc.getNewDoc(ModelNameEnum.Location, { name }).sync();
      expect(await fyo.db.exists(ModelNameEnum.Location, name)).toBe(true);
    }
  });

  test('create stock movement, material receipt', async () => {
    const { rate } = itemMap.Ink;
    const quantity = 2;
    const amount = rate * quantity;
    const stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialReceipt,
      new Date('2022-11-03T09:57:04.528'),
      [
        {
          item: itemMap.Ink.name,
          to: locationMap.LocationOne,
          quantity,
          rate,
        },
      ],
      fyo
    );

    await (await stockMovement.sync()).submit();
    expect(stockMovement.name?.startsWith('SMOV-')).toBe(true);
    expect(stockMovement.amount?.float).toBe(amount);
    expect(stockMovement.items?.[0].amount?.float).toBe(amount);

    const name = stockMovement.name!;

    const sles = await getSLEs(name, ModelNameEnum.StockMovement, fyo);
    expect(sles.length).toBe(1);

    const sle = sles[0];
    expect(new Date(sle.date).toString()).not.toBe('Invalid Date');
    expect(parseInt(sle.name)).toBe(1);
    expect(sle.item).toBe(itemMap.Ink.name);
    expect(parseFloat(sle.rate)).toBe(rate);
    expect(sle.quantity).toBe(quantity);
    expect(sle.location).toBe(locationMap.LocationOne);
    expect(await fyo.db.getStockQuantity(itemMap.Ink.name)).toBe(quantity);
  });

  test('create stock movement, material transfer', async () => {
    const { rate } = itemMap.Ink;
    const quantity = 2;

    const stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialTransfer,
      new Date('2022-11-03T09:58:04.528'),
      [
        {
          item: itemMap.Ink.name,
          from: locationMap.LocationOne,
          to: locationMap.LocationTwo,
          quantity,
          rate,
        },
      ],
      fyo
    );

    await (await stockMovement.sync()).submit();
    const name = stockMovement.name!;

    const sles = await getSLEs(name, ModelNameEnum.StockMovement, fyo);
    expect(sles.length).toBe(2);

    for (const sle of sles) {
      expect(new Date(sle.date).toString()).not.toBe('Invalid Date');
      expect(sle.item).toBe(itemMap.Ink.name);
      expect(parseFloat(sle.rate)).toBe(rate);

      if (sle.location === locationMap.LocationOne) {
        expect(sle.quantity).toBe(-quantity);
      } else if (sle.location === locationMap.LocationTwo) {
        expect(sle.quantity).toBe(quantity);
      } else {
        throw new Error('Unexpected location in SLE');
      }
    }

    expect(
      await fyo.db.getStockQuantity(itemMap.Ink.name, locationMap.LocationOne)
    ).toBe(0);
    expect(await fyo.db.getStockQuantity(itemMap.Ink.name)).toBe(quantity);
  });

  test('create stock movement, material issue', async () => {
    const { rate } = itemMap.Ink;
    const quantity = 2;

    const stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialIssue,
      new Date('2022-11-03T09:59:04.528'),
      [
        {
          item: itemMap.Ink.name,
          from: locationMap.LocationTwo,
          quantity,
          rate,
        },
      ],
      fyo
    );

    await (await stockMovement.sync()).submit();
    const name = stockMovement.name!;

    const sles = await getSLEs(name, ModelNameEnum.StockMovement, fyo);
    expect(sles.length).toBe(1);

    const sle = sles[0];
    expect(new Date(sle.date).toString()).not.toBe('Invalid Date');
    expect(sle.item).toBe(itemMap.Ink.name);
    expect(parseFloat(sle.rate)).toBe(rate);
    expect(sle.quantity).toBe(-quantity);
    expect(sle.location).toBe(locationMap.LocationTwo);
    expect(await fyo.db.getStockQuantity(itemMap.Ink.name)).toBe(0);
  });

  test('cancel stock movement', async () => {
    const names = (await fyo.db.getAllRaw(ModelNameEnum.StockMovement)) as {
      name: string;
    }[];

    for (const { name } of names) {
      const slesBefore = await getSLEs(name, ModelNameEnum.StockMovement, fyo);
      const doc = (await fyo.doc.getDoc(
        ModelNameEnum.StockMovement,
        name
      )) as StockMovement;

      if (doc.movementType === MovementTypeEnum.MaterialTransfer) {
        expect(slesBefore.length).toBe((doc.items?.length || 0) * 2);
      } else {
        expect(slesBefore.length).toBe(doc.items?.length || 0);
      }

      await doc.cancel();
      const slesAfter = await getSLEs(name, ModelNameEnum.StockMovement, fyo);
      expect(slesAfter.length).toBe(0);
    }

    expect(await fyo.db.getStockQuantity(itemMap.Ink.name)).toBeNull();
  });

  async function runEntries(
    item: string,
    entries: {
      type: MovementTypeEnum;
      date: Date;
      valid: boolean;
      postQuantity: number;
      items: {
        item: string;
        to?: string;
        from?: string;
        quantity: number;
        rate: number;
      }[];
    }[]
  ) {
    for (const { type, date, items, valid, postQuantity } of entries) {
      const stockMovement = await getStockMovement(type, date, items, fyo);
      await stockMovement.sync();

      if (valid) {
        await assertDoesNotThrow(async () => await stockMovement.submit());
      } else {
        await assertThrows(async () => await stockMovement.submit());
      }

      expect(await fyo.db.getStockQuantity(item)).toBe(postQuantity);
    }
  }

  test('create stock movements, invalid entries, in sequence', async () => {
    const { name: item, rate } = itemMap.Pen;
    const quantity = 10;
    await runEntries(
      item,
      [
        {
          type: MovementTypeEnum.MaterialReceipt,
          date: new Date('2022-11-03T09:58:04.528'),
          valid: true,
          postQuantity: quantity,
          items: [
            {
              item,
              to: locationMap.LocationOne,
              quantity,
              rate,
            },
          ],
        },
        {
          type: MovementTypeEnum.MaterialTransfer,
          date: new Date('2022-11-03T09:58:05.528'),
          valid: false,
          postQuantity: quantity,
          items: [
            {
              item,
              from: locationMap.LocationOne,
              to: locationMap.LocationTwo,
              quantity: quantity + 1,
              rate,
            },
          ],
        },
        {
          type: MovementTypeEnum.MaterialIssue,
          date: new Date('2022-11-03T09:58:06.528'),
          valid: false,
          postQuantity: quantity,
          items: [
            {
              item,
              from: locationMap.LocationOne,
              quantity: quantity + 1,
              rate,
            },
          ],
        },
        {
          type: MovementTypeEnum.MaterialTransfer,
          date: new Date('2022-11-03T09:58:07.528'),
          valid: true,
          postQuantity: quantity,
          items: [
            {
              item,
              from: locationMap.LocationOne,
              to: locationMap.LocationTwo,
              quantity,
              rate,
            },
          ],
        },
        {
          type: MovementTypeEnum.MaterialIssue,
          date: new Date('2022-11-03T09:58:08.528'),
          valid: true,
          postQuantity: 0,
          items: [
            {
              item,
              from: locationMap.LocationTwo,
              quantity,
              rate,
            },
          ],
        },
      ]
    );
  });

  test('create stock movements, invalid entries, out of sequence', async () => {
    const { name: item, rate } = itemMap.Ink;
    const quantity = 10;
    await runEntries(
      item,
      [
        {
          type: MovementTypeEnum.MaterialReceipt,
          date: new Date('2022-11-15'),
          valid: true,
          postQuantity: quantity,
          items: [
            {
              item,
              to: locationMap.LocationOne,
              quantity,
              rate,
            },
          ],
        },
        {
          type: MovementTypeEnum.MaterialIssue,
          date: new Date('2022-11-17'),
          valid: true,
          postQuantity: quantity - 5,
          items: [
            {
              item,
              from: locationMap.LocationOne,
              quantity: quantity - 5,
              rate,
            },
          ],
        },
        {
          type: MovementTypeEnum.MaterialTransfer,
          date: new Date('2022-11-16'),
          valid: false,
          postQuantity: quantity - 5,
          items: [
            {
              item,
              from: locationMap.LocationOne,
              to: locationMap.LocationTwo,
              quantity,
              rate,
            },
          ],
        },
      ]
    );
  });

  closeTestFyoAfterAll(fyo);
});
