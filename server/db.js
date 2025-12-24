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
    // For local development on Windows
    const clientLibDir = process.env.ORACLE_CLIENT_LIB_DIR || 'C:\\oracle\\instantclient_21_3';
    
    if (clientLibDir) {
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
          console.warn('💡 Set ORACLE_CLIENT_LIB_DIR environment variable to your Oracle Instant Client path');
          throw initError; // Throw original error
        }
      }
    } else {
      // Try to initialize without explicit path
      try {
        oracledb.initOracleClient();
        console.log('✅ Oracle Instant Client initialized from system PATH');
      } catch (pathError) {
        console.warn('⚠️  Could not initialize Oracle Instant Client. Make sure it\'s installed and in PATH.');
        throw pathError;
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
  
  try {
    connection = await getConnection();
    
    const executeOptions = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: options.autoCommit !== false,
      fetchAsString: [oracledb.CLOB],
      ...options
    };
    
    const result = await connection.execute(sql, binds, executeOptions);
    return result.rows || [];
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
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

