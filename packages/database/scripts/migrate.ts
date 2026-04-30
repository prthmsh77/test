/**
 * Simple sequential migration runner.
 * Migrations are numbered SQL files in /migrations — they run in filename order.
 * Each migration is recorded in the schema_migrations table so it only runs once.
 */
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'shikhar',
  user: process.env.POSTGRES_USER || 'shikhar',
  password: process.env.POSTGRES_PASSWORD || 'shikhar_dev',
});

async function migrate() {
  const client = await pool.connect();

  try {
    // Create migration tracking table if it doesn't exist.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    VARCHAR(255) PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file],
      );

      if (rows.length > 0) {
        console.log(`[migrate] Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`[migrate] Applying ${file}...`);
      const sql = await readFile(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        console.log(`[migrate] ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] ✗ ${file}:`, err);
        throw err;
      }
    }

    console.log('[migrate] All migrations applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('[migrate] Fatal error:', err);
  process.exit(1);
});
