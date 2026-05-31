import { assertDoesNotThrow } from 'backend/database/tests/helpers';
import { readFileSync } from 'fs';
import { ModelNameEnum } from 'models/types';
import { join } from 'path';
import { Importer } from 'src/importer';
import { describe, expect, test } from 'bun:test';
import { closeTestFyo, getTestFyo, setupTestFyo } from './helpers';

describe('Importer Tests', () => {
  const fyo = getTestFyo();

  setupTestFyo(fyo, __filename);

  test('importer init', () => {
    const importer = new Importer(ModelNameEnum.SalesInvoice, fyo);
    expect(typeof importer.getCSVTemplate()).toBe('string');
  });

  test('import Items', async () => {
    const importer = new Importer(ModelNameEnum.Item, fyo);
    const csvPath = join(__dirname, 'items.csv');
    const data = readFileSync(csvPath, { encoding: 'utf-8' });
    expect(importer.selectFile(data)).toBe(true);
    expect((await importer.checkLinks()).length).toBe(0);
    expect(() => importer.populateDocs()).not.toThrow();
    for (const doc of importer.docs) {
      await assertDoesNotThrow(async () => await doc.sync());
    }
  });

  test('import Party', async () => {
    const importer = new Importer(ModelNameEnum.Party, fyo);
    const csvPath = join(__dirname, 'parties.csv');
    const data = readFileSync(csvPath, { encoding: 'utf-8' });
    expect(importer.selectFile(data)).toBe(true);
    expect((await importer.checkLinks()).length).toBe(0);
    expect(() => importer.populateDocs()).not.toThrow();
    for (const doc of importer.docs) {
      await assertDoesNotThrow(async () => await doc.sync());
    }
  });

  test('import SalesInvoices', async () => {
    const importer = new Importer(ModelNameEnum.SalesInvoice, fyo);
    const csvPath = join(__dirname, 'sales_invoices.csv');
    const data = readFileSync(csvPath, { encoding: 'utf-8' });

    expect(importer.selectFile(data)).toBe(true);
    expect((await importer.checkLinks()).length).toBe(0);
    expect(() => importer.populateDocs()).not.toThrow();

    const names = [];
    for (const doc of importer.docs.slice(0, 2)) {
      await assertDoesNotThrow(async () => await doc.sync());
      names.push(doc.name);
    }

    expect(names.every((n) => n?.startsWith('SINV-'))).toBe(true);
  });

  closeTestFyo(fyo, __filename);
});
