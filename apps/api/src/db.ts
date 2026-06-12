import { readFileSync } from "node:fs";
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
  identity: string | null;
  attendance: string;
  ceremony_attendance: string | null;
  guest_count: number;
  message: string | null;
  created_at: Date;
  updated_at: Date;
};

export type PhotoUnlockRow = {
  rsvp_id: string;
  photo_id: string;
  unlocked_at: Date;
};

export function createPool(config: AppConfig) {
  const database = parseDatabaseUrl(config.databaseUrl);
  const ssl = config.databaseSslCaFile
    ? {
        ca: readFileSync(config.databaseSslCaFile, "utf8"),
        rejectUnauthorized: config.databaseSslRejectUnauthorized,
      }
    : undefined;

  return new pg.Pool({
    ...database,
    ssl,
  });
}

function parseDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);

  return {
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    host: url.hostname,
    password: decodeURIComponent(url.password),
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
  };
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
      identity text,
      attendance text NOT NULL,
      ceremony_attendance text,
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
    ALTER TABLE rsvp_responses
    ADD COLUMN IF NOT EXISTS email text
  `);
  await pool.query(`
    ALTER TABLE rsvp_responses
    ADD COLUMN IF NOT EXISTS identity text
  `);
  await pool.query(`
    ALTER TABLE rsvp_responses
    ADD COLUMN IF NOT EXISTS ceremony_attendance text
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS photo_unlocks (
      rsvp_id uuid NOT NULL REFERENCES rsvp_responses(id) ON DELETE CASCADE,
      photo_id text NOT NULL,
      unlocked_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (rsvp_id, photo_id)
    )
  `);
  await pool.query(`
    ALTER TABLE photo_unlocks
    DROP CONSTRAINT IF EXISTS photo_unlocks_rsvp_id_fkey
  `);
  await pool.query(`
    ALTER TABLE photo_unlocks
    ADD CONSTRAINT photo_unlocks_rsvp_id_fkey
    FOREIGN KEY (rsvp_id) REFERENCES rsvp_responses(id) ON DELETE CASCADE
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS photo_unlocks_rsvp_id_idx
    ON photo_unlocks (rsvp_id)
  `);
}
