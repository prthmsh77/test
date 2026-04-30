import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';

export const DB_POOL = 'DB_POOL';

/**
 * Global database module — provides the Postgres connection pool to all modules.
 * Marked @Global so no module needs to import it explicitly.
 */
@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      useFactory: () => {
        const pool = new Pool({
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
          database: process.env.POSTGRES_DB || 'shikhar',
          user: process.env.POSTGRES_USER || 'shikhar',
          password: process.env.POSTGRES_PASSWORD || 'shikhar_dev',
          max: parseInt(process.env.POSTGRES_POOL_MAX || '20', 10),
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        });

        pool.on('error', (err) => {
          console.error('[DB] Pool error:', err.message);
        });

        return pool;
      },
    },
  ],
  exports: [DB_POOL],
})
export class DatabaseModule {}
