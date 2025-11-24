/**
 * Database Initialization Script
 * 
 * This script initializes the Oracle database by running schema.sql
 * Run this once when setting up the database for the first time
 * 
 * Usage: node server/init-database.js
 */

const fs = require('fs');
const path = require('path');
const { initializePool, getConnection, closePool } = require('./db');

async function initDatabase() {
  console.log('🚀 Starting database initialization...\n');

  let connection;
  try {
    // Initialize connection pool
    console.log('📡 Connecting to Oracle database...');
    await initializePool();
    connection = await getConnection();
    console.log('✅ Connected successfully!\n');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    console.log('📖 Reading schema file...');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMIT'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Skip very short statements
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await connection.execute(statement);
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      } catch (error) {
        // Ignore "table already exists" errors
        if (error.message && error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1}: Table already exists (skipping)\n`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    // Commit
    await connection.commit();
    console.log('✅ Database initialization completed successfully!\n');

    // Verify tables
    console.log('🔍 Verifying tables...');
    const tables = await connection.execute(`
      SELECT table_name 
      FROM user_tables 
      ORDER BY table_name
    `);
    
    console.log(`✅ Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => {
      console.log(`   - ${row.TABLE_NAME}`);
    });

  } catch (error) {
    console.error('\n❌ Database initialization failed:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        // Ignore
      }
    }
    await closePool();
    console.log('\n✅ Connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };

