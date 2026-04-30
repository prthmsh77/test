import { Pool, PoolConfig } from 'pg';

/**
 * Single shared connection pool for the entire application.
 * Using a pool (not individual clients) because every request should
 * be served concurrently without connection contention.
 */
const config: PoolConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'shikhar',
  user: process.env.POSTGRES_USER || 'shikhar',
  password: process.env.POSTGRES_PASSWORD || 'shikhar_dev',
  max: parseInt(process.env.POSTGRES_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
};

export const pool = new Pool(config);

pool.on('error', (err) => {
  // Log but don't crash — the pool will attempt reconnection automatically.
  console.error('[DB] Unexpected pool error:', err.message);
});

export async function query<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
