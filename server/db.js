/**
 * Oracle Database Connection Module
 * 
 * Handles database connection and provides connection pool management
 * 
 * @version 1.0.0
 */

const oracledb = require('oracledb');

// Database configuration from environment variables
const dbConfig = {
  user: process.env.DB_USER || 'unievents',
  password: process.env.DB_PASSWORD || 'password',
  connectString: process.env.DB_CONNECTION_STRING || 'localhost:1521/XEPDB1',
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1,
  poolTimeout: 60
};

let pool = null;

/**
 * Initialize database connection pool
 */
async function initializePool() {
  try {
    // Set Oracle client directory if needed (for Oracle Instant Client)
    // Try to initialize with the path from environment variable or use default
    const clientLibDir = process.env.ORACLE_CLIENT_LIB_DIR || 'C:\\oracle\\instantclient_21_3\\instantclient_23_0';
    
    try {
      oracledb.initOracleClient({ libDir: clientLibDir });
      console.log('✅ Oracle Instant Client initialized from:', clientLibDir);
    } catch (initError) {
      // If init fails, try without explicit path (might be in system PATH)
      console.log('⚠️  Could not initialize with explicit path, trying system PATH...');
      try {
        oracledb.initOracleClient();
        console.log('✅ Oracle Instant Client initialized from system PATH');
      } catch (pathError) {
        console.warn('⚠️  Could not initialize Oracle Instant Client. Make sure it\'s installed and in PATH.');
        throw initError; // Throw original error
      }
    }
    
    // Configure pool with LOB settings for better BLOB handling
    const poolConfig = {
      ...dbConfig,
      lobPrefetchSize: 16384 // Prefetch LOBs in 16KB chunks
    };
    
    pool = await oracledb.createPool(poolConfig);
    console.log('✅ Oracle database connection pool created successfully');
    return pool;
  } catch (error) {
    console.error('❌ Error creating Oracle connection pool:', error);
    throw error;
  }
}

/**
 * Get a connection from the pool
 */
async function getConnection() {
  try {
    if (!pool) {
      await initializePool();
    }
    return await pool.getConnection();
  } catch (error) {
    console.error('❌ Error getting database connection:', error);
    throw error;
  }
}

/**
 * Execute a query and return results
 * @param {string} sql - SQL query string
 * @param {object} binds - Query parameters
 * @param {object} options - Query options
 */
async function executeQuery(sql, binds = {}, options = {}) {
  let connection;
  const queryStart = Date.now();
  
  try {
    console.log('[DB] executeQuery: Getting connection...', { sql: sql.substring(0, 100) + '...' });
    connection = await getConnection();
    console.log('[DB] executeQuery: Connection obtained, executing query...');
    
    const executeOptions = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: options.autoCommit !== false, // Default to true
      // Automatically convert CLOBs to strings so we don't need to read LOBs manually
      fetchAsString: [oracledb.CLOB],
      ...options
    };
    
    console.log('[DB] executeQuery: Execute options:', { autoCommit: executeOptions.autoCommit });
    console.log('[DB] executeQuery: Binds keys:', Object.keys(binds));
    
    const executeStart = Date.now();
    const result = await connection.execute(sql, binds, executeOptions);
    const executeTime = Date.now() - executeStart;
    
    console.log('[DB] executeQuery: Execute completed in', executeTime, 'ms');
    console.log('[DB] executeQuery: Result:', { 
      rowsAffected: result.rowsAffected,
      hasRows: !!result.rows,
      rowCount: result.rows ? result.rows.length : 0
    });
    
    const queryTime = Date.now() - queryStart;
    console.log('[DB] executeQuery: ✅ Query completed in', queryTime, 'ms');
    return result.rows || [];
  } catch (error) {
    const queryTime = Date.now() - queryStart;
    console.error('[DB] executeQuery: ❌ Error after', queryTime, 'ms');
    console.error('[DB] executeQuery: Error code:', error.errorNum || error.code);
    console.error('[DB] executeQuery: Error message:', error.message);
    console.error('[DB] executeQuery: SQL:', sql.substring(0, 200));
    console.error('[DB] executeQuery: Binds:', Object.keys(binds).reduce((acc, key) => {
      const value = binds[key];
      if (value instanceof Date) {
        acc[key] = value.toISOString();
      } else if (typeof value === 'string' && value.length > 50) {
        acc[key] = value.substring(0, 50) + '...';
      } else {
        acc[key] = value;
      }
      return acc;
    }, {}));
    if (error.stack) {
      console.error('[DB] executeQuery: Error stack:', error.stack);
    }
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('[DB] executeQuery: Connection closed');
      } catch (error) {
        console.error('❌ Error closing connection:', error);
      }
    }
  }
}

/**
 * Execute a query and return a single row
 */
async function executeQueryOne(sql, binds = {}, options = {}) {
  const results = await executeQuery(sql, binds, options);
  return results.length > 0 ? results[0] : null;
}

/**
 * Close the connection pool
 */
async function closePool() {
  try {
    if (pool) {
      await pool.close(10); // Wait up to 10 seconds for connections to close
      console.log('✅ Oracle connection pool closed');
      pool = null;
    }
  } catch (error) {
    console.error('❌ Error closing connection pool:', error);
    throw error;
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

module.exports = {
  initializePool,
  getConnection,
  executeQuery,
  executeQueryOne,
  closePool,
  oracledb
};

