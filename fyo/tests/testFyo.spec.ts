import { getRegionalModels, models } from 'models';
import { getSchemas } from 'schemas';
import { describe, expect, test } from '@rstest/core';
import { getTestFyo } from 'tests/helpers';

describe('Fyo Core Tests', () => {
  test('Fyo Init', async () => {
    const fyo = getTestFyo();
    expect(Object.keys(fyo.schemaMap).length).toBe(0);

    await fyo.db.createNewDatabase(':memory:', 'in');
    await fyo.initializeAndRegister({}, {});

    expect(Object.keys(fyo.schemaMap).length > 0).toBe(true);
    await fyo.close();
  });

  test('Fyo Docs', async () => {
    const countryCode = 'in';
    const fyo = getTestFyo();
    const schemaMap = getSchemas(countryCode, []);
    const regionalModels = await getRegionalModels(countryCode);
    await fyo.db.createNewDatabase(':memory:', countryCode);
    await fyo.initializeAndRegister(models, regionalModels);

    for (const schemaName in schemaMap) {
      const schema = schemaMap[schemaName];
      if (schema?.isSingle) {
        continue;
      }

      const doc = fyo.doc.getNewDoc(schemaName);
      expect(doc.schemaName).toBe(schemaName);
    }

    await fyo.close();
  });
});
