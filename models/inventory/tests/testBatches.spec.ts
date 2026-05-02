import { assertThrows } from 'backend/database/tests/helpers';
import { ModelNameEnum } from 'models/types';
import { describe, expect, test } from 'vitest';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { MovementTypeEnum } from '../types';
import { getItem, getStockMovement } from './helpers';

const fyo = getTestFyo();

describe('Batches', () => {
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

  const batchMap = {
    batchOne: {
      name: 'PN-AB001',
      manufactureDate: '2022-11-03T09:57:04.528',
    },
    batchTwo: {
      name: 'PN-AB002',
      manufactureDate: '2022-10-03T09:57:04.528',
    },
    batchThree: {
      name: 'PN-AB003',
      manufactureDate: '2022-10-03T09:57:04.528',
    },
  };

  test('create dummy items, locations & batches', async () => {
    // Create Items
    for (const { name, rate } of Object.values(itemMap)) {
      const item = getItem(name, rate, true);
      await fyo.doc.getNewDoc(ModelNameEnum.Item, item).sync();
    }

    // Create Locations
    for (const name of Object.values(locationMap)) {
      await fyo.doc.getNewDoc(ModelNameEnum.Location, { name }).sync();
    }

    // Create Batches
    for (const batch of Object.values(batchMap)) {
      const doc = fyo.doc.getNewDoc(ModelNameEnum.Batch, batch);
      await doc.sync();

      expect(await fyo.db.exists(ModelNameEnum.Batch, batch.name)).toBe(true);
    }
  });

  test('batched item, create stock movement, material receipt', async () => {
    const { rate } = itemMap.Pen;
    const stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialReceipt,
      new Date('2022-11-03T09:57:04.528'),
      [
        {
          item: itemMap.Pen.name,
          to: locationMap.LocationOne,
          quantity: 2,
          batch: batchMap.batchOne.name,
          rate,
        },
        {
          item: itemMap.Pen.name,
          to: locationMap.LocationOne,
          quantity: 1,
          batch: batchMap.batchTwo.name,
          rate,
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
        undefined,
        batchMap.batchOne.name
      )
    ).toBe(2);

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Pen.name,
        locationMap.LocationOne,
        undefined,
        undefined,
        batchMap.batchTwo.name
      )
    ).toBe(1);

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Pen.name,
        locationMap.LocationOne,
        undefined,
        undefined,
        batchMap.batchThree.name
      )
    ).toBeNull();

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Ink.name,
        locationMap.LocationOne,
        undefined,
        undefined,
        batchMap.batchOne.name
      )
    ).toBeNull();
  });

  test('batched item, create stock movement, material issue', async () => {
    const { rate } = itemMap.Pen;
    const quantity = 2;
    const batch = batchMap.batchOne.name;

    const stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialIssue,
      new Date('2022-11-03T10:00:00.528'),
      [
        {
          item: itemMap.Pen.name,
          from: locationMap.LocationOne,
          batch,
          quantity,
          rate,
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
        undefined,
        batch
      )
    ).toBe(0);

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Pen.name,
        locationMap.LocationOne,
        undefined,
        undefined,
        batchMap.batchTwo.name
      )
    ).toBe(1);
  });

  test('batched item, create stock movement, material transfer', async () => {
    const { rate } = itemMap.Pen;
    const quantity = 1;
    const batch = batchMap.batchTwo.name;

    const stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialTransfer,
      new Date('2022-11-03T09:58:04.528'),
      [
        {
          item: itemMap.Pen.name,
          from: locationMap.LocationOne,
          to: locationMap.LocationTwo,
          batch,
          quantity,
          rate,
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
        undefined,
        batch
      )
    ).toBe(0);

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Pen.name,
        locationMap.LocationTwo,
        undefined,
        undefined,
        batch
      )
    ).toBe(quantity);
  });

  test('batched item, create invalid stock movements', async () => {
    const { name, rate } = itemMap.Pen;
    const quantity = (await fyo.db.getStockQuantity(
      itemMap.Pen.name,
      locationMap.LocationTwo,
      undefined,
      undefined,
      batchMap.batchTwo.name
    )) as number;

    expect(quantity).toBe(1);

    let stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialIssue,
      new Date('2022-11-03T09:59:04.528'),
      [
        {
          item: itemMap.Pen.name,
          from: locationMap.LocationTwo,
          batch: batchMap.batchOne.name,
          quantity,
          rate,
        },
      ],
      fyo
    );

    await assertThrows(async () => (await stockMovement.sync()).submit());

    stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialIssue,
      new Date('2022-11-03T09:59:04.528'),
      [
        {
          item: itemMap.Pen.name,
          from: locationMap.LocationTwo,
          quantity,
          rate,
        },
      ],
      fyo
    );

    await assertThrows(async () => (await stockMovement.sync()).submit());
    expect(await fyo.db.getStockQuantity(name)).toBe(1);
  });

  closeTestFyoAfterAll(fyo);
});
