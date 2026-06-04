import pg from "pg";
import type { AppConfig } from "./config.js";

export type RsvpRow = {
  id: string;
  phone_hash: string;
  phone_number: string;
  browser_token_hash: string | null;
  name: string;
  name_key: string;
  email: string | null;
  attendance: string;
  guest_count: number;
  message: string | null;
  created_at: Date;
  updated_at: Date;
};

export function createPool(config: AppConfig) {
  return new pg.Pool({
    connectionString: config.databaseUrl,
  });
}

export async function migrate(pool: pg.Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rsvp_responses (
      id uuid PRIMARY KEY,
      phone_hash text NOT NULL UNIQUE,
      phone_number text NOT NULL,
      browser_token_hash text UNIQUE,
      name text NOT NULL,
      name_key text NOT NULL,
      email text,
      attendance text NOT NULL,
      guest_count integer NOT NULL CHECK (guest_count >= 0 AND guest_count <= 10),
      message text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    ALTER TABLE rsvp_responses
    ADD COLUMN IF NOT EXISTS phone_number text
  `);
  await pool.query(`
    ALTER TABLE rsvp_responses
    DROP COLUMN IF EXISTS phone_encrypted
  `);
  await pool.query(`
    ALTER TABLE rsvp_responses
    DROP COLUMN IF EXISTS phone_last4
  `);
  await pool.query(`
    ALTER TABLE rsvp_responses
    ADD COLUMN IF NOT EXISTS name_key text
  `);
  await pool.query(`
    UPDATE rsvp_responses
    SET name_key = lower(regexp_replace(trim(name), '\\s+', '', 'g'))
    WHERE name_key IS NULL OR name_key = ''
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS rsvp_responses_name_key_idx
    ON rsvp_responses (name_key)
  `);
  await pool.query(`
    ALTER TABLE rsvp_responses
    ALTER COLUMN name_key SET NOT NULL
  `);
}
