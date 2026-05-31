import { assertDoesNotThrow } from 'backend/database/tests/helpers';
import dayjs from 'dayjs';
import setupInstance from 'src/setup/setupInstance';
import { describe, expect, test, afterAll } from 'bun:test';
import { getValueMapFromList } from 'utils';
import {
  getTestDbPath,
  getTestFyo,
  getTestSetupWizardOptions,
} from './helpers';

describe('Setup Instance Tests', () => {
  const dbPath = getTestDbPath();
  const setupOptions = getTestSetupWizardOptions();
  const fyo = getTestFyo();

  test('setupInstance', async () => {
    await assertDoesNotThrow(async () => {
      await setupInstance(dbPath, setupOptions, fyo);
    }, 'setup instance failed');
  });

  test('check setup Singles', async () => {
    const setupFields = [
      'companyName',
      'country',
      'fullname',
      'email',
      'bankName',
      'fiscalYearStart',
      'fiscalYearEnd',
      'currency',
    ];

    const setupSingles = await fyo.db.getSingleValues(...setupFields);
    const singlesMap = getValueMapFromList(setupSingles, 'fieldname', 'value');

    for (const field of setupFields) {
      let dbValue = Reflect.get(singlesMap, field);
      const optionsValue = Reflect.get(setupOptions, field);

      if (dbValue instanceof Date) {
        dbValue = dayjs(dbValue).format('YYYY-MM-DD');
      }

      expect(dbValue).toBe(optionsValue);
    }
  });

  test('check null singles', async () => {
    const nullFields = ['gstin', 'logo', 'phone', 'address'];
    const nullSingles = await fyo.db.getSingleValues(...nullFields);

    expect(nullSingles.length).toBe(0);
  });

  afterAll(async () => {
    await fyo.close();
  });
});
