import * as schema from './schema';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { safeGet, safeSet } from '../../utils/index';

// Pre-build a case-insensitive map of table names (both camelCase and PascalCase) to Drizzle table objects.
const tables: Record<string, any> = Object.create(null);

for (const [key, val] of Object.entries(schema)) {
  if (val && typeof val === 'object') {
    try {
      const config = getTableConfig(val as any);
      if (config && config.name) {
        safeSet(tables, config.name.toLowerCase(), val);
        safeSet(tables, key.toLowerCase(), val);
      }
    } catch (e) {
      // Not a Drizzle table object (e.g. relations or other exports), skip
    }
  }
}

/**
 * Gets a Drizzle table object dynamically by its name (case-insensitive).
 * Supports both SQL table name (e.g. "SalesInvoice") and schema export name (e.g. "salesInvoice").
 */
export function getTable(name: string) {
  const table = safeGet(tables, name.toLowerCase());
  if (!table) {
    throw new Error(`Table "${name}" not found in Drizzle schema.`);
  }
  return table;
}
