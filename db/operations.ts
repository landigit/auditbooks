import { db } from './client';
import * as schema from './schema';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { eq, and, desc, asc, SQL } from 'drizzle-orm';

// Pre-build a case-insensitive map of table names (both camelCase and PascalCase) to Drizzle table objects.
const tables: Record<string, any> = {};

for (const [key, val] of Object.entries(schema)) {
  if (val && typeof val === 'object') {
    try {
      const config = getTableConfig(val as any);
      if (config && config.name) {
        tables[config.name.toLowerCase()] = val;
        tables[key.toLowerCase()] = val;
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
  const table = tables[name.toLowerCase()];
  if (!table) {
    throw new Error(`Table "${name}" not found in Drizzle schema.`);
  }
  return table;
}

/**
 * Fetches a single row by its primary key ("name").
 */
export async function getRow(tableName: string, name: string) {
  const table = getTable(tableName);
  // In this system, all schemas have 'name' as their primary key
  const results = await db.select().from(table).where(eq(table.name, name)).limit(1);
  return results[0] || null;
}

/**
 * Inserts a single row.
 */
export async function insertRow(tableName: string, data: any) {
  const table = getTable(tableName);
  const result = await db.insert(table).values(data).returning();
  return (result as any)[0];
}

/**
 * Updates a single row by its primary key ("name").
 */
export async function updateRow(tableName: string, name: string, data: any) {
  const table = getTable(tableName);
  const result = await db.update(table).set(data).where(eq(table.name, name)).returning();
  return (result as any)[0];
}

/**
 * Deletes a single row by its primary key ("name").
 */
export async function deleteRow(tableName: string, name: string) {
  const table = getTable(tableName);
  const result = await db.delete(table).where(eq(table.name, name)).returning();
  return (result as any)[0];
}

/**
 * Fetches multiple rows with filters, ordering, limit, and offset.
 */
export async function listRows(tableName: string, options: {
  filters?: Record<string, any>;
  orderBy?: { column: string; direction: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
} = {}) {
  const table = getTable(tableName);
  let query = db.select().from(table);
  
  // Dynamically apply filters
  const conditions: SQL[] = [];
  if (options.filters) {
    for (const [colName, val] of Object.entries(options.filters)) {
      if (colName in table) {
        conditions.push(eq(table[colName], val));
      }
    }
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  // Dynamically apply sorting
  if (options.orderBy) {
    const { column, direction } = options.orderBy;
    if (column in table) {
      const orderFn = direction === 'desc' ? desc : asc;
      query = query.orderBy(orderFn(table[column])) as any;
    }
  }
  
  // Apply pagination
  if (options.limit !== undefined) {
    query = query.limit(options.limit) as any;
  }
  if (options.offset !== undefined) {
    query = query.offset(options.offset) as any;
  }
  
  return await query;
}

/**
 * Gets all child rows linked to a parent table record.
 * Typically child rows have 'parent', 'parentSchemaName', and 'parentFieldname' columns.
 */
export async function getChildRows(childTableName: string, parentName: string, parentSchemaName?: string) {
  const table = getTable(childTableName);
  const conditions: SQL[] = [eq(table.parent, parentName)];
  
  if (parentSchemaName && 'parentSchemaName' in table) {
    conditions.push(eq(table.parentSchemaName, parentSchemaName));
  }
  
  return await db.select().from(table).where(and(...conditions));
}
