import sql from 'mssql';

const config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  port: parseInt(process.env.SQL_PORT || '1433', 10),
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise = null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectWithRetry(retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const pool = await new sql.ConnectionPool(config).connect();
      console.log(`Connected to MS SQL Server pool (attempt ${attempt})`);

      pool.on('error', async (err) => {
        console.error('SQL Pool error — tentando reconectar:', err.message);
        poolPromise = null;
        getDbPool();
      });

      return pool;
    } catch (err) {
      console.error(`Database connection failed (attempt ${attempt}/${retries}):`, err.message);
      if (attempt < retries) {
        await sleep(delay * attempt);
      } else {
        poolPromise = null;
        throw err;
      }
    }
  }
}

export async function getDbPool() {
  if (!poolPromise || !poolPromise.then) {
    poolPromise = connectWithRetry()
      .catch(err => {
        poolPromise = null;
        console.error('All connection retries exhausted:', err.message);
        throw err;
      });
  }

  try {
    const pool = await poolPromise;
    return pool;
  } catch (err) {
    poolPromise = null;
    throw err;
  }
}

export { sql };
