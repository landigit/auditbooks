import { ModelNameEnum } from 'models/types';
import { describe, expect, test } from 'vitest';
import { getItem } from './helpers';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { MovementTypeEnum } from '../types';
import {
  assertDoesNotThrow,
  assertThrows,
} from 'backend/database/tests/helpers';
import { StockMovement } from '../StockMovement';

const fyo = getTestFyo();

describe('Stock Movement', () => {
  setupTestFyoBeforeAll(fyo);

  test('check store and create test items', async () => {
    const e = await fyo.db.exists(ModelNameEnum.Location, 'Stores');
    expect(e).toBe(true);

    const items = [
      getItem('RawOne', 100),
      getItem('RawTwo', 100),
      getItem('Final', 200),
    ];

    for (const item of items) {
      await fyo.doc.getNewDoc(ModelNameEnum.Item, item).sync();
      expect(await fyo.db.exists(ModelNameEnum.Item, item.name)).toBe(true);
    }
  });

  test('Stock Movement, Material Receipt', async () => {
    const sm = fyo.doc.getNewDoc(ModelNameEnum.StockMovement);

    await sm.set({
      date: new Date('2022-01-01'),
      movementType: MovementTypeEnum.MaterialReceipt,
    });

    await sm.append('items', {
      item: 'RawOne',
      quantity: 1,
      rate: 100,
      toLocation: 'Stores',
    });

    await sm.append('items', {
      item: 'RawTwo',
      quantity: 1,
      rate: 100,
      toLocation: 'Stores',
    });

    await assertDoesNotThrow(async () => await sm.sync());
    await assertDoesNotThrow(async () => await sm.submit());

    expect(await fyo.db.getStockQuantity('RawOne', 'Stores')).toBe(1);
    expect(await fyo.db.getStockQuantity('RawTwo', 'Stores')).toBe(1);
    expect(await fyo.db.getStockQuantity('Final', 'Stores')).toBeNull();
  });

  test('Stock Movement, Manufacture', async () => {
    const sm = fyo.doc.getNewDoc(ModelNameEnum.StockMovement) as StockMovement;

    await sm.set({
      date: new Date('2022-01-02'),
      movementType: MovementTypeEnum.Manufacture,
    });

    await sm.append('items', {
      item: 'RawOne',
      quantity: 1,
      rate: 100,
    });

    await assertDoesNotThrow(
      async () => await sm.items?.[0].set('fromLocation', 'Stores')
    );
    await assertThrows(
      async () => await sm.items?.[0].set('toLocation', 'Stores')
    );
    expect(sm.items?.[0].to).toBeUndefined();

    await sm.append('items', {
      item: 'RawTwo',
      quantity: 1,
      rate: 100,
      fromLocation: 'Stores',
    });

    await assertThrows(async () => await sm.sync());

    await sm.append('items', {
      item: 'Final',
      quantity: 1,
      rate: 100,
      toLocation: 'Stores',
    });

    await assertDoesNotThrow(async () => await sm.sync());
    await assertDoesNotThrow(async () => await sm.submit());

    expect(await fyo.db.getStockQuantity('RawOne', 'Stores')).toBe(0);
    expect(await fyo.db.getStockQuantity('RawTwo', 'Stores')).toBe(0);
    expect(await fyo.db.getStockQuantity('Final', 'Stores')).toBe(1);
  });

  closeTestFyoAfterAll(fyo);
});
