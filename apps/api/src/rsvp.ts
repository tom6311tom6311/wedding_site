import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type pg from "pg";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { createBrowserToken, hmacSha256Hex } from "./crypto.js";
import type { RsvpRow } from "./db.js";
import { maskPhone, normalizePhone } from "./phone.js";
import { checkRateLimit } from "./rateLimit.js";

const rsvpPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(180).optional().or(z.literal("")),
  phone: z.string().trim().min(8).max(32),
  identity: z.string().trim().min(1).max(80),
  attendance: z.string().trim().min(1).max(80),
  ceremonyAttendance: z.string().trim().max(80).optional().or(z.literal("")),
  guestCount: z.coerce.number().int().min(0).max(10),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

const lookupPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(8).max(32),
});

type RsvpPayload = z.infer<typeof rsvpPayloadSchema>;

export function registerRsvpRoutes(app: FastifyInstance, pool: pg.Pool, config: AppConfig) {
  app.post("/api/rsvp", async (request, reply) => {
    if (!allowRequest(request, "submit", 20, 60_000)) {
      return reply.code(429).send({ error: "Too many requests" });
    }

    const parsed = rsvpPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid RSVP response" });
    }

    let normalizedPhone: string;

    try {
      normalizedPhone = normalizePhone(parsed.data.phone);
    } catch {
      return reply.code(400).send({ error: "Invalid cellphone number" });
    }

    const browserToken = createBrowserToken();
    const existingToken = getBearerToken(request);
    const result = await saveRsvp(
      pool,
      config,
      parsed.data,
      normalizedPhone,
      browserToken,
      existingToken,
    );

    if (result.kind === "conflict") {
      return reply.code(409).send({
        error:
          "An RSVP already exists for this name or phone. Please use the same browser, or submit the matching name and phone number.",
      });
    }

    return {
      rsvp: toClientRsvp(result.row, config),
      browserToken,
    };
  });

  app.get("/api/rsvp/me", async (request, reply) => {
    if (!allowRequest(request, "me", 60, 60_000)) {
      return reply.code(429).send({ error: "Too many requests" });
    }

    const token = getBearerToken(request);

    if (!token) {
      return reply.code(401).send({ error: "Missing RSVP token" });
    }

    const tokenHash = hmacSha256Hex(token, config.browserTokenSecret);
    const result = await pool.query<RsvpRow>(
      "SELECT * FROM rsvp_responses WHERE browser_token_hash = $1",
      [tokenHash],
    );
    const row = result.rows[0];

    if (!row) {
      return reply.code(404).send({ error: "RSVP response not found" });
    }

    return {
      rsvp: toClientRsvp(row, config),
    };
  });

  app.post("/api/rsvp/lookup", async (request, reply) => {
    if (!allowRequest(request, "lookup", 12, 60_000)) {
      return reply.code(429).send({ error: "Too many requests" });
    }

    const parsed = lookupPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid lookup request" });
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
    const row = result.rows[0];

    if (!row) {
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
      [browserTokenHash, row.id],
    );

    return {
      rsvp: toClientRsvp(updated.rows[0], config),
      browserToken,
    };
  });
}

type SaveRsvpResult =
  | {
      kind: "saved";
      row: RsvpRow;
    }
  | {
      kind: "conflict";
    };

async function saveRsvp(
  pool: pg.Pool,
  config: AppConfig,
  payload: RsvpPayload,
  normalizedPhone: string,
  browserToken: string,
  existingToken: string | null,
): Promise<SaveRsvpResult> {
  const client = await pool.connect();
  const phoneHash = hmacSha256Hex(normalizedPhone, config.phoneHashSecret);
  const browserTokenHash = hmacSha256Hex(browserToken, config.browserTokenSecret);
  const existingTokenHash = existingToken
    ? hmacSha256Hex(existingToken, config.browserTokenSecret)
    : null;
  const nameKey = normalizeNameKey(payload.name);

  try {
    await client.query("BEGIN");

    const tokenMatch = existingTokenHash
      ? await client.query<RsvpRow>(
          "SELECT * FROM rsvp_responses WHERE browser_token_hash = $1 FOR UPDATE",
          [existingTokenHash],
        )
      : null;
    const exactMatch = await client.query<RsvpRow>(
      "SELECT * FROM rsvp_responses WHERE phone_hash = $1 AND name_key = $2 FOR UPDATE",
      [phoneHash, nameKey],
    );
    const targetRow = tokenMatch?.rows[0] ?? exactMatch.rows[0] ?? null;

    if (targetRow) {
      const conflictingRows = await client.query<RsvpRow>(
        `
          SELECT *
          FROM rsvp_responses
          WHERE id <> $1 AND (phone_hash = $2 OR name_key = $3)
          LIMIT 1
        `,
        [targetRow.id, phoneHash, nameKey],
      );

      if (conflictingRows.rows.length > 0) {
        await client.query("ROLLBACK");
        return { kind: "conflict" };
      }

      const updated = await client.query<RsvpRow>(
        `
          UPDATE rsvp_responses
          SET
            phone_hash = $2,
            phone_number = $3,
            browser_token_hash = $4,
            name = $5,
            name_key = $6,
            email = NULLIF($7, ''),
            identity = $8,
            attendance = $9,
            ceremony_attendance = NULLIF($10, ''),
            guest_count = $11,
            message = NULLIF($12, ''),
            updated_at = now()
          WHERE id = $1
          RETURNING *
        `,
        [
          targetRow.id,
          phoneHash,
          normalizedPhone,
          browserTokenHash,
          payload.name,
          nameKey,
          payload.email ?? "",
          payload.identity,
          payload.attendance,
          payload.ceremonyAttendance ?? "",
          payload.guestCount,
          payload.message ?? "",
        ],
      );

      await client.query("COMMIT");
      return { kind: "saved", row: updated.rows[0] };
    }

    const conflictingRows = await client.query<RsvpRow>(
      `
        SELECT *
        FROM rsvp_responses
        WHERE phone_hash = $1 OR name_key = $2
        LIMIT 1
      `,
      [phoneHash, nameKey],
    );

    if (conflictingRows.rows.length > 0) {
      await client.query("ROLLBACK");
      return { kind: "conflict" };
    }

    const inserted = await client.query<RsvpRow>(
      `
        INSERT INTO rsvp_responses (
          id,
          phone_hash,
          phone_number,
          browser_token_hash,
          name,
          name_key,
          email,
          identity,
          attendance,
          ceremony_attendance,
          guest_count,
          message
        )
        VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), $8, $9, NULLIF($10, ''), $11, NULLIF($12, ''))
        RETURNING *
      `,
      [
        randomUUID(),
        phoneHash,
        normalizedPhone,
        browserTokenHash,
        payload.name,
        nameKey,
        payload.email ?? "",
        payload.identity,
        payload.attendance,
        payload.ceremonyAttendance ?? "",
        payload.guestCount,
        payload.message ?? "",
      ],
    );

    await client.query("COMMIT");
    return { kind: "saved", row: inserted.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function normalizeNameKey(name: string) {
  return name.trim().replace(/\s+/g, "").toLocaleLowerCase();
}

function toClientRsvp(row: RsvpRow, _config: AppConfig) {
  return {
    name: row.name,
    email: row.email ?? "",
    phone: row.phone_number,
    phoneMasked: maskPhone(row.phone_number),
    identity: row.identity ?? "",
    attendance: row.attendance,
    ceremonyAttendance: row.ceremony_attendance ?? "",
    guestCount: row.guest_count,
    message: row.message ?? "",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
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
