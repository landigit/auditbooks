import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import * as relations from './relations';

// Initialize the LibSQL client pointing to our local SQLite database.
const client = createClient({
  url: 'file:demo6.db',
});

// Create the Drizzle database instance with pre-registered schemas and relationships.
export const db = drizzle(client, {
  schema: { ...schema, ...relations },
});

export type DbType = typeof db;
export * as schema from './schema';
export * as relations from './relations';
