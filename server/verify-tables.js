/**
 * Verify Database Tables Script
 * 
 * Checks if tables exist and can be queried
 */

require('dotenv').config();
const { initializePool, executeQuery, closePool } = require('./db');

async function verifyTables() {
  console.log('🔍 Verifying database tables...\n');

  try {
    await initializePool();
    console.log('✅ Connected to database\n');

    // Check what user we're connected as
    const currentUser = await executeQuery(`SELECT USER FROM DUAL`);
    console.log(`📋 Connected as user: ${currentUser[0].USER}\n`);

    // List all tables
    console.log('📊 Checking for tables...\n');
    const allTables = await executeQuery(`
      SELECT table_name 
      FROM user_tables 
      ORDER BY table_name
    `);

    if (allTables.length === 0) {
      console.log('❌ No tables found in the current schema!\n');
      console.log('💡 Run: npm run setup-db');
      process.exit(1);
    }

    console.log(`✅ Found ${allTables.length} table(s):`);
    allTables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });

    // Check for required tables
    const requiredTables = ['USERS', 'ADMINS', 'EVENTS', 'BOOKINGS', 'EVENT_REQUESTS'];
    console.log('\n🔍 Checking required tables...\n');
    
    for (const tableName of requiredTables) {
      const exists = allTables.some(t => t.TABLE_NAME === tableName);
      if (exists) {
        // Try to query the table
        try {
          const count = await executeQuery(`SELECT COUNT(*) as cnt FROM ${tableName}`);
          console.log(`✅ ${tableName}: EXISTS (${count[0].CNT} rows)`);
        } catch (error) {
          console.log(`⚠️  ${tableName}: EXISTS but cannot query - ${error.message}`);
        }
      } else {
        console.log(`❌ ${tableName}: MISSING`);
      }
    }

    // Test query with lowercase (how the app uses it)
    console.log('\n🧪 Testing queries with lowercase table names...\n');
    const testTables = ['users', 'admins', 'events', 'bookings', 'event_requests'];
    
    for (const tableName of testTables) {
      try {
        const count = await executeQuery(`SELECT COUNT(*) as cnt FROM ${tableName}`);
        console.log(`✅ SELECT FROM ${tableName}: WORKS (${count[0].CNT} rows)`);
      } catch (error) {
        console.log(`❌ SELECT FROM ${tableName}: FAILED - ${error.message}`);
      }
    }

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('\n❌ Verification failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

verifyTables();

