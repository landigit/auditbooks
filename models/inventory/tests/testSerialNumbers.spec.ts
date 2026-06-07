import { assertThrows } from 'backend/database/tests/helpers';
import { ModelNameEnum } from 'models/types';
import { describe, expect, test } from 'vitest';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { getSerialNumbers } from '../helpers';
import { MovementTypeEnum } from '../types';
import { getItem, getStockMovement } from './helpers';

const fyo = getTestFyo();

describe('Serial Numbers', () => {
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

  const partyMap = {
    partyOne: { name: 'Someone', Role: 'Both' },
  };

  const serialNumberMap = {
    serialOne: {
      name: 'PN-AB001',
      item: itemMap.Pen.name,
    },
    serialTwo: {
      name: 'PN-AB002',
      item: itemMap.Pen.name,
    },
    serialThree: {
      name: 'PN-AB003',
      item: itemMap.Pen.name,
    },
  };

  test('create dummy items, locations, party & serialNumbers', async () => {
    // Create Items
    for (const { name, rate } of Object.values(itemMap)) {
      const item = getItem(name, rate, false, true);
      await fyo.doc.getNewDoc(ModelNameEnum.Item, item).sync();
    }

    // Create Locations
    for (const name of Object.values(locationMap)) {
      await fyo.doc.getNewDoc(ModelNameEnum.Location, { name }).sync();
    }

    // Create Party
    await fyo.doc.getNewDoc(ModelNameEnum.Party, partyMap.partyOne).sync();
    expect(
      await fyo.db.exists(ModelNameEnum.Party, partyMap.partyOne.name)
    ).toBe(true);

    // Create SerialNumbers
    for (const serialNumber of Object.values(serialNumberMap)) {
      const doc = fyo.doc.getNewDoc(ModelNameEnum.SerialNumber, serialNumber);
      await doc.sync();

      const status = await fyo.getValue(
        ModelNameEnum.SerialNumber,
        serialNumber.name,
        'status'
      );

      expect(status).toBe('Inactive');
    }
  });

  test('serialNumber enabled item, create stock movement, material receipt', async () => {
    const { rate } = itemMap.Pen;
    const serialNumber =
      serialNumberMap.serialOne.name + '\n' + serialNumberMap.serialTwo.name;
    const stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialReceipt,
      new Date('2022-11-03T09:57:04.528'),
      [
        {
          item: itemMap.Pen.name,
          to: locationMap.LocationOne,
          quantity: 2,
          serialNumber,
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
        undefined,
        [serialNumberMap.serialOne.name]
      )
    ).toBe(1);

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Pen.name,
        locationMap.LocationOne,
        undefined,
        undefined,
        undefined,
        [serialNumberMap.serialTwo.name]
      )
    ).toBe(1);

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Pen.name,
        locationMap.LocationOne,
        undefined,
        undefined,
        undefined,
        [serialNumberMap.serialThree.name]
      )
    ).toBeNull();

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Ink.name,
        locationMap.LocationOne,
        undefined,
        undefined,
        undefined,
        [serialNumberMap.serialOne.name]
      )
    ).toBeNull();

    const statusOne = await fyo.getValue(
      ModelNameEnum.SerialNumber,
      serialNumberMap.serialOne.name,
      'status'
    );
    expect(statusOne).toBe('Active');

    const statusTwo = await fyo.getValue(
      ModelNameEnum.SerialNumber,
      serialNumberMap.serialTwo.name,
      'status'
    );
    expect(statusTwo).toBe('Active');
  });

  test('serialNumber enabled item, create stock movement, material issue', async () => {
    const { rate } = itemMap.Pen;
    const quantity = 1;

    const stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialIssue,
      new Date('2022-11-03T10:00:00.528'),
      [
        {
          item: itemMap.Pen.name,
          from: locationMap.LocationOne,
          serialNumber: serialNumberMap.serialOne.name,
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
        undefined,
        [serialNumberMap.serialOne.name]
      )
    ).toBe(0);

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Pen.name,
        locationMap.LocationOne,
        undefined,
        undefined,
        undefined,
        [serialNumberMap.serialTwo.name]
      )
    ).toBe(1);
  });

  test('serialNumber enabled item, create stock movement, material transfer', async () => {
    const { rate } = itemMap.Pen;
    const quantity = 1;
    const serialNumber = serialNumberMap.serialTwo.name;

    const stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialTransfer,
      new Date('2022-11-03T09:58:04.528'),
      [
        {
          item: itemMap.Pen.name,
          from: locationMap.LocationOne,
          to: locationMap.LocationTwo,
          serialNumber,
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
        undefined,
        [serialNumber]
      )
    ).toBe(0);

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Pen.name,
        locationMap.LocationTwo,
        undefined,
        undefined,
        undefined,
        [serialNumber]
      )
    ).toBe(quantity);
  });

  test('serialNumber enabled item, create invalid stock movements', async () => {
    const { name, rate } = itemMap.Pen;
    const quantity = (await fyo.db.getStockQuantity(
      itemMap.Pen.name,
      locationMap.LocationTwo,
      undefined,
      undefined,
      undefined,
      [serialNumberMap.serialTwo.name]
    )) as number;

    expect(quantity).toBe(1);

    let stockMovement = await getStockMovement(
      MovementTypeEnum.MaterialIssue,
      new Date('2022-11-03T09:59:04.528'),
      [
        {
          item: itemMap.Pen.name,
          from: locationMap.LocationTwo,
          serialNumber: serialNumberMap.serialOne.name,
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

  test('Material Receipt, auto creation of Serial Number', async () => {
    const serialNumber = `001\n002\n003`;
    const serialNumbers = getSerialNumbers(serialNumber);
    for (const sn of serialNumbers) {
      expect(await fyo.db.exists(ModelNameEnum.SerialNumber, sn)).toBe(false);
    }

    const doc = await getStockMovement(
      MovementTypeEnum.MaterialReceipt,
      new Date('2022-11-04T09:59:04.528'),
      [
        {
          item: itemMap.Pen.name,
          to: locationMap.LocationOne,
          quantity: 3,
          rate: 100,
          serialNumber,
        },
      ],
      fyo
    );

    await (await doc.sync()).submit();
    for (const sn of serialNumbers) {
      const sndoc = await fyo.doc.getDoc(ModelNameEnum.SerialNumber, sn);
      expect(sndoc.status).toBe('Active');
    }

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Pen.name,
        locationMap.LocationOne,
        undefined,
        undefined,
        undefined,
        serialNumbers
      )
    ).toBe(3);
  });

  test('Material Issue, status change of Serial Number', async () => {
    const serialNumber = `001\n002\n003`;
    const serialNumbers = getSerialNumbers(serialNumber);
    for (const sn of serialNumbers) {
      expect(await fyo.db.exists(ModelNameEnum.SerialNumber, sn)).toBe(true);
    }

    const doc = await getStockMovement(
      MovementTypeEnum.MaterialIssue,
      new Date('2022-11-05T09:59:04.528'),
      [
        {
          item: itemMap.Pen.name,
          from: locationMap.LocationOne,
          quantity: 3,
          rate: 100,
          serialNumber,
        },
      ],
      fyo
    );

    await (await doc.sync()).submit();
    for (const sn of serialNumbers) {
      const status = await fyo.getValue(
        ModelNameEnum.SerialNumber,
        sn,
        'status'
      );
      expect(status).toBe('Delivered');
    }

    expect(
      await fyo.db.getStockQuantity(
        itemMap.Pen.name,
        locationMap.LocationOne,
        undefined,
        undefined,
        undefined,
        serialNumbers
      )
    ).toBe(0);

    await doc.cancel();
    for (const sn of serialNumbers) {
      const status = await fyo.getValue(
        ModelNameEnum.SerialNumber,
        sn,
        'status'
      );
      expect(status).toBe('Active');
    }
  });

  test('Material Receipt cancellation, Serial Number status update', async () => {
    const serialNumber = `004\n005\n006`;
    const serialNumbers = getSerialNumbers(serialNumber);
    const doc = await getStockMovement(
      MovementTypeEnum.MaterialReceipt,
      new Date('2022-11-04T09:59:04.528'),
      [
        {
          item: itemMap.Pen.name,
          to: locationMap.LocationOne,
          quantity: 3,
          rate: 100,
          serialNumber,
        },
      ],
      fyo
    );

    await (await doc.sync()).submit();
    for (const sn of serialNumbers) {
      const status = await fyo.getValue(
        ModelNameEnum.SerialNumber,
        sn,
        'status'
      );
      expect(status).toBe('Active');
    }

    await doc.cancel();
    for (const sn of serialNumbers) {
      const status = await fyo.getValue(
        ModelNameEnum.SerialNumber,
        sn,
        'status'
      );
      expect(status).toBe('Inactive');
    }
  });

  closeTestFyoAfterAll(fyo);
});
