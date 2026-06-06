import type { FastifyInstance, FastifyRequest } from "fastify";
import type pg from "pg";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { createBrowserToken, hmacSha256Hex } from "./crypto.js";
import type { RsvpRow } from "./db.js";
import { normalizePhone } from "./phone.js";
import { checkRateLimit } from "./rateLimit.js";

const identifyPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(8).max(32),
});

const unlockPayloadSchema = z.object({
  photoId: z.string().trim().min(1).max(120),
});

export function registerPuzzleRoutes(app: FastifyInstance, pool: pg.Pool, config: AppConfig) {
  app.get("/api/puzzle/me", async (request, reply) => {
    if (!allowRequest(request, "puzzle-me", 60, 60_000)) {
      return reply.code(429).send({ error: "Too many requests" });
    }

    const rsvp = await findRsvpByBearerToken(pool, config, request);

    if (!rsvp) {
      return reply.code(401).send({ error: "Missing or invalid RSVP token" });
    }

    return {
      rsvp: toPuzzleGuest(rsvp),
      unlockedPhotoIds: await listUnlockedPhotoIds(pool, rsvp.id),
      puzzleRank: await getPuzzleRank(pool, rsvp.id),
    };
  });

  app.post("/api/puzzle/identify", async (request, reply) => {
    if (!allowRequest(request, "puzzle-identify", 12, 60_000)) {
      return reply.code(429).send({ error: "Too many requests" });
    }

    const parsed = identifyPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid identify request" });
    }

    let normalizedPhone: string;

    try {
      normalizedPhone = normalizePhone(parsed.data.phone);
    } catch {
      return reply.code(400).send({ error: "Invalid cellphone number" });
    }

    const phoneHash = hmacSha256Hex(normalizedPhone, config.phoneHashSecret);
    const nameKey = normalizeNameKey(parsed.data.name);
    const result = await pool.query<RsvpRow>(
      "SELECT * FROM rsvp_responses WHERE phone_hash = $1 AND name_key = $2",
      [phoneHash, nameKey],
    );
    const rsvp = result.rows[0];

    if (!rsvp) {
      return reply.code(404).send({ error: "RSVP response not found" });
    }

    const browserToken = createBrowserToken();
    const browserTokenHash = hmacSha256Hex(browserToken, config.browserTokenSecret);
    const updated = await pool.query<RsvpRow>(
      `
        UPDATE rsvp_responses
        SET browser_token_hash = $1, updated_at = updated_at
        WHERE id = $2
        RETURNING *
      `,
      [browserTokenHash, rsvp.id],
    );
    const updatedRsvp = updated.rows[0];

    return {
      rsvp: toPuzzleGuest(updatedRsvp),
      browserToken,
      unlockedPhotoIds: await listUnlockedPhotoIds(pool, updatedRsvp.id),
      puzzleRank: await getPuzzleRank(pool, updatedRsvp.id),
    };
  });

  app.post("/api/puzzle/unlocks", async (request, reply) => {
    if (!allowRequest(request, "puzzle-unlock", 30, 60_000)) {
      return reply.code(429).send({ error: "Too many requests" });
    }

    const rsvp = await findRsvpByBearerToken(pool, config, request);

    if (!rsvp) {
      return reply.code(401).send({ error: "Missing or invalid RSVP token" });
    }

    const parsed = unlockPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid unlock request" });
    }

    await pool.query(
      `
        INSERT INTO photo_unlocks (rsvp_id, photo_id)
        VALUES ($1, $2)
        ON CONFLICT (rsvp_id, photo_id) DO NOTHING
      `,
      [rsvp.id, parsed.data.photoId],
    );

    return {
      unlockedPhotoIds: await listUnlockedPhotoIds(pool, rsvp.id),
      puzzleRank: await getPuzzleRank(pool, rsvp.id),
    };
  });
}

async function findRsvpByBearerToken(
  pool: pg.Pool,
  config: AppConfig,
  request: FastifyRequest,
) {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const tokenHash = hmacSha256Hex(token, config.browserTokenSecret);
  const result = await pool.query<RsvpRow>(
    "SELECT * FROM rsvp_responses WHERE browser_token_hash = $1",
    [tokenHash],
  );

  return result.rows[0] ?? null;
}

async function listUnlockedPhotoIds(pool: pg.Pool, rsvpId: string) {
  const result = await pool.query<{ photo_id: string }>(
    `
      SELECT photo_id
      FROM photo_unlocks
      WHERE rsvp_id = $1
      ORDER BY unlocked_at ASC
    `,
    [rsvpId],
  );

  return result.rows.map((row) => row.photo_id);
}

async function getPuzzleRank(pool: pg.Pool, rsvpId: string) {
  const result = await pool.query<{
    rank: number;
    unlock_count: number;
    next_higher_count: number | null;
    next_lower_count: number | null;
  }>(
    `
      WITH unlock_counts AS (
        SELECT
          rsvp_responses.id,
          count(photo_unlocks.photo_id)::integer AS unlock_count
        FROM rsvp_responses
        LEFT JOIN photo_unlocks ON photo_unlocks.rsvp_id = rsvp_responses.id
        GROUP BY rsvp_responses.id
      ),
      ranked AS (
        SELECT
          id,
          unlock_count,
          rank() OVER (ORDER BY unlock_count DESC) AS rank
        FROM unlock_counts
      )
      SELECT
        ranked.rank::integer,
        ranked.unlock_count,
        (
          SELECT min(unlock_count)
          FROM unlock_counts
          WHERE unlock_count > ranked.unlock_count
        ) AS next_higher_count,
        (
          SELECT max(unlock_count)
          FROM unlock_counts
          WHERE unlock_count < ranked.unlock_count
        ) AS next_lower_count
      FROM ranked
      WHERE ranked.id = $1
    `,
    [rsvpId],
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    rank: row.rank,
    unlockedCount: row.unlock_count,
    photosToNextRank:
      row.next_higher_count === null ? null : row.next_higher_count - row.unlock_count,
    photosAheadOfSecondPlace:
      row.rank === 1 && row.next_lower_count !== null
        ? row.unlock_count - row.next_lower_count
        : null,
  };
}

function toPuzzleGuest(row: RsvpRow) {
  return {
    name: row.name,
  };
}

function normalizeNameKey(name: string) {
  return name.trim().replace(/\s+/g, "").toLocaleLowerCase();
}

function getBearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function allowRequest(
  request: FastifyRequest,
  scope: string,
  limit: number,
  windowMs: number,
) {
  return checkRateLimit(`${scope}:${request.ip}`, limit, windowMs);
}
