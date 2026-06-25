import { sql } from 'kysely';
import { DatabaseManager } from '../database/manager';

/**
 * Creates the AuditLog table for existing databases.
 * For new databases this happens automatically via migrate().
 */
async function execute(dm: DatabaseManager) {
  const kysely = dm.db?.kysely;
  if (!kysely) return;

  const result = await sql<{ name: string }>`
    select name from sqlite_schema
    where type='table' and name='AuditLog'
  `.execute(kysely);
  const tableExists = result.rows.length > 0;
  if (tableExists) return;

  await kysely.schema
    .createTable('AuditLog')
    .addColumn('name', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('timestamp', 'text', (col) => col.notNull())
    .addColumn('action', 'text', (col) => col.notNull())
    .addColumn('documentType', 'text', (col) => col.notNull())
    .addColumn('documentName', 'text', (col) => col.notNull())
    .addColumn('user', 'text')
    .addColumn('ipAddress', 'text')
    .addColumn('sessionId', 'text')
    .addColumn('changes', 'text')
    .addColumn('checksum', 'text')
    .addColumn('created', 'text')
    .addColumn('modified', 'text')
    .addColumn('createdBy', 'text')
    .addColumn('modifiedBy', 'text')
    .execute();

  await kysely.schema
    .createIndex('AuditLog_timestamp_idx')
    .on('AuditLog')
    .columns(['timestamp'])
    .execute();

  await kysely.schema
    .createIndex('AuditLog_doc_idx')
    .on('AuditLog')
    .columns(['documentType', 'documentName'])
    .execute();

  await kysely.schema
    .createIndex('AuditLog_action_idx')
    .on('AuditLog')
    .columns(['action'])
    .execute();
}

export default { execute };
