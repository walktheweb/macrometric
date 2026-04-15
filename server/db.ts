import pg from 'pg';
import { DATABASE_SCHEMA_SQL } from './schema.js';
import { now } from './lib.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://macrometric:macrometric@127.0.0.1:5432/macrometric',
});

export async function initDatabase(): Promise<void> {
  await pool.query(DATABASE_SCHEMA_SQL);
  await pool.query(`ALTER TABLE checkins ADD COLUMN IF NOT EXISTS vitals JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await migrateLegacyFastingData();
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function migrateLegacyFastingData(): Promise<void> {
  await pool.query(`
    INSERT INTO fasting_sessions (
      id, user_id, date, start_time, end_time, source_checkin_id, created_at, updated_at
    )
    SELECT
      'legacy-' || id,
      user_id,
      date,
      fast_start_time,
      first_meal_time,
      id,
      created_at,
      $1
    FROM checkins
    WHERE fast_start_time IS NOT NULL
    ON CONFLICT (source_checkin_id) DO UPDATE SET
      date = EXCLUDED.date,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      updated_at = EXCLUDED.updated_at
  `, [now()]);
}
