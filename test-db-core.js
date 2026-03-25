import DatabaseCore from './backend/database/core.ts';
import { Fyo } from 'fyo';
import { DatabaseManager } from './backend/database/manager.ts';
import { DummyAuthDemux } from 'fyo/tests/helpers';

async function run() {
  const fyo = new Fyo({
    DatabaseDemux: DatabaseManager,
    AuthDemux: DummyAuthDemux,
    isTest: true,
    isElectron: false,
  });

  const db = new DatabaseCore(':memory:');
  await db.connect();
  console.log('Connected');

  try {
    // Manually set schemas from the manager to avoid complex setup
    // fyo.db is a DatabaseHandler which contains the demux
    // But we are using DatabaseCore directly here for testing
    
    // We need some schemas to test getAll
    const { getSchemas } = await import('./schemas/index.ts');
    const schemas = getSchemas('in', []);
    db.setSchemaMap(schemas);
    console.log('Schemas set');

    console.log('Starting migration...');
    await db.migrate();
    console.log('Migrated');

    console.log('Testing getAll...');
    const result = await db.getAll('Account', { fields: ['*'], filters: { name: 'Test' } });
    console.log('Result:', result);
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await db.close();
  }
}

run().catch(console.error);
