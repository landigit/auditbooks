import { fyo } from '../src/initFyo';

async function verify() {
  console.log('--- Fyo Deno KV Verification ---');

  try {
    // 1. Initialize
    console.log('Initializing Fyo...');
    await fyo.initializeAndRegister();
    console.log('Initialized!');

    // 2. Insert test record
    console.log('Inserting test record...');
    const record = await fyo.db.insert('User', { 
      name: 'deno_test_user',
      email: 'deno@example.com' 
    });
    console.log('Inserted:', record);

    // 3. Get record
    console.log('Getting record...');
    const fetched = await fyo.db.get('User', 'deno_test_user');
    console.log('Fetched:', fetched);

    // 4. Update record
    console.log('Updating record...');
    await fyo.db.update('User', { name: 'deno_test_user', email: 'updated@example.com' });
    const updated = await fyo.db.get('User', 'deno_test_user');
    console.log('Updated:', updated);

    // 5. Exists
    const exists = await fyo.db.exists('User', 'deno_test_user');
    console.log('Exists:', exists);

    // 6. Delete
    console.log('Deleting record...');
    await fyo.db.delete('User', 'deno_test_user');
    const stillExists = await fyo.db.exists('User', 'deno_test_user');
    console.log('Still exists?', stillExists);

    console.log('\n✅ Verification Success!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  }
}

verify();
