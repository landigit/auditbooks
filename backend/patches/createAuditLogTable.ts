import { DatabaseManager } from '../database/manager';

/**
 * Creates the AuditLog table for existing databases.
 * For new databases this happens automatically via migrate().
 */
async function execute(dm: DatabaseManager) {
  const knex = dm.db?.knex;
  if (!knex) return;

  const tableExists = await knex.schema.hasTable('AuditLog');
  if (tableExists) return;

  await knex.schema.createTable('AuditLog', (table) => {
    table.increments('name').primary();
    table.datetime('timestamp').notNullable();
    table.text('action').notNullable();
    table.text('documentType').notNullable();
    table.text('documentName').notNullable();
    table.text('user').nullable();
    table.text('ipAddress').nullable();
    table.text('sessionId').nullable();
    table.text('changes').nullable();
    table.text('checksum').nullable();
    // standard meta fields
    table.datetime('created').nullable();
    table.datetime('modified').nullable();
    table.text('createdBy').nullable();
    table.text('modifiedBy').nullable();

    // indexes for fast filtering
    table.index(['timestamp']);
    table.index(['documentType', 'documentName']);
    table.index(['action']);
  });
}

export default { execute };
