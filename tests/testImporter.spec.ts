import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertDoesNotThrow } from 'backend/database/tests/helpers';
import { ModelNameEnum } from 'models/types';
import { Importer } from 'src/importer';
import { describe, it, expect } from 'vitest';
import { closeTestFyo, getTestFyo, setupTestFyo } from './helpers';

const fyo = getTestFyo();

describe('importer', () => {
  setupTestFyo(fyo);
  closeTestFyo(fyo);

  it('importer init', () => {
    const importer = new Importer(ModelNameEnum.SalesInvoice, fyo);
    expect(typeof importer.getCSVTemplate()).toBe('string');
  });

  it('import Items', async () => {
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

  it('import Party', async () => {
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

  it('import SalesInvoices', async () => {
    const importer = new Importer(ModelNameEnum.SalesInvoice, fyo);
    const csvPath = join(__dirname, 'sales_invoices.csv');
    const data = readFileSync(csvPath, { encoding: 'utf-8' });

    expect(importer.selectFile(data)).toBe(true);
    const missingLinks = await importer.checkLinks();
    if (missingLinks.length > 0) {
      console.log('Missing links:', JSON.stringify(missingLinks, null, 2));
    }
    expect(missingLinks.length).toBe(0);
    expect(() => importer.populateDocs()).not.toThrow();

    const names: string[] = [];
    for (const doc of importer.docs.slice(0, 2)) {
      await assertDoesNotThrow(async () => await doc.sync());
      names.push(doc.name ?? '');
    }

    expect(names.every((n) => n?.startsWith('SINV-'))).toBe(true);
  });
});
