import type { FastifyInstance, FastifyRequest } from "fastify";
import type pg from "pg";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { constantTimeEqual, hmacSha256Hex } from "./crypto.js";
import type { RsvpRow } from "./db.js";
import { normalizePhone } from "./phone.js";
import { checkRateLimit } from "./rateLimit.js";

const ADMIN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const loginPayloadSchema = z.object({
  password: z.string().min(1).max(500),
});

const rsvpParamsSchema = z.object({
  id: z.string().uuid(),
});

const adminRsvpPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(180).optional().or(z.literal("")),
  phone: z.string().trim().min(8).max(32),
  identity: z.string().trim().min(1).max(80),
  attendance: z.string().trim().min(1).max(80),
  ceremonyAttendance: z.string().trim().max(80).optional().or(z.literal("")),
  guestCount: z.coerce.number().int().min(0).max(10),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

type AdminTokenPayload = {
  scope: "admin";
  expiresAt: number;
};

type AdminRsvpRow = RsvpRow & {
  unlocked_photo_ids: string[];
  unlocked_count: number;
};

type AdminActivityRow = {
  type: "rsvp_created" | "rsvp_updated" | "puzzle_unlocked";
  rsvp_id: string;
  guest_name: string;
  photo_id: string | null;
  happened_at: Date;
};

export function registerAdminRoutes(app: FastifyInstance, pool: pg.Pool, config: AppConfig) {
  app.post("/api/admin/login", async (request, reply) => {
    if (!allowRequest(request, "admin-login", 8, 60_000)) {
      return reply.code(429).send({ error: "Too many requests" });
    }

    const parsed = loginPayloadSchema.safeParse(request.body);

    if (!parsed.success || !constantTimeEqual(parsed.data.password, config.adminPassword)) {
      return reply.code(401).send({ error: "Invalid admin password" });
    }

    return {
      token: createAdminToken(config),
    };
  });

  app.get("/api/admin/overview", async (request, reply) => {
    if (!isAdminRequest(request, config)) {
      return reply.code(401).send({ error: "Missing or invalid admin token" });
    }

    const result = await pool.query<AdminRsvpRow>(`
      SELECT
        rsvp_responses.*,
        COALESCE(
          array_agg(photo_unlocks.photo_id ORDER BY photo_unlocks.unlocked_at ASC)
            FILTER (WHERE photo_unlocks.photo_id IS NOT NULL),
          ARRAY[]::text[]
        ) AS unlocked_photo_ids,
        count(photo_unlocks.photo_id)::integer AS unlocked_count
      FROM rsvp_responses
      LEFT JOIN photo_unlocks ON photo_unlocks.rsvp_id = rsvp_responses.id
      GROUP BY rsvp_responses.id
      ORDER BY rsvp_responses.created_at DESC
    `);
    const activities = await pool.query<AdminActivityRow>(`
      SELECT *
      FROM (
        SELECT
          'rsvp_created'::text AS type,
          id AS rsvp_id,
          name AS guest_name,
          NULL::text AS photo_id,
          created_at AS happened_at
        FROM rsvp_responses

        UNION ALL

        SELECT
          'rsvp_updated'::text AS type,
          id AS rsvp_id,
          name AS guest_name,
          NULL::text AS photo_id,
          updated_at AS happened_at
        FROM rsvp_responses
        WHERE updated_at > created_at + interval '1 second'

        UNION ALL

        SELECT
          'puzzle_unlocked'::text AS type,
          rsvp_responses.id AS rsvp_id,
          rsvp_responses.name AS guest_name,
          photo_unlocks.photo_id,
          photo_unlocks.unlocked_at AS happened_at
        FROM photo_unlocks
        INNER JOIN rsvp_responses ON rsvp_responses.id = photo_unlocks.rsvp_id
      ) activity
      ORDER BY happened_at DESC
      LIMIT 80
    `);

    return {
      rsvps: result.rows.map(toAdminRsvp),
      activities: activities.rows.map(toAdminActivity),
      generatedAt: new Date().toISOString(),
    };
  });

  app.patch("/api/admin/rsvps/:id", async (request, reply) => {
    if (!isAdminRequest(request, config)) {
      return reply.code(401).send({ error: "Missing or invalid admin token" });
    }

    const parsedParams = rsvpParamsSchema.safeParse(request.params);
    const parsedBody = adminRsvpPayloadSchema.safeParse(request.body);

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: "Invalid RSVP update" });
    }

    let normalizedPhone: string;

    try {
      normalizedPhone = normalizePhone(parsedBody.data.phone);
    } catch {
      return reply.code(400).send({ error: "Invalid cellphone number" });
    }

    const phoneHash = hmacSha256Hex(normalizedPhone, config.phoneHashSecret);
    const nameKey = normalizeNameKey(parsedBody.data.name);
    const conflict = await pool.query<{ id: string }>(
      `
        SELECT id
        FROM rsvp_responses
        WHERE id <> $1 AND (phone_hash = $2 OR name_key = $3)
        LIMIT 1
      `,
      [parsedParams.data.id, phoneHash, nameKey],
    );

    if (conflict.rows.length > 0) {
      return reply.code(409).send({ error: "Another RSVP already uses this name or phone" });
    }

    const updated = await pool.query<RsvpRow>(
      `
        UPDATE rsvp_responses
        SET
          phone_hash = $2,
          phone_number = $3,
          name = $4,
          name_key = $5,
          email = NULLIF($6, ''),
          identity = $7,
          attendance = $8,
          ceremony_attendance = NULLIF($9, ''),
          guest_count = $10,
          message = NULLIF($11, ''),
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [
        parsedParams.data.id,
        phoneHash,
        normalizedPhone,
        parsedBody.data.name,
        nameKey,
        parsedBody.data.email ?? "",
        parsedBody.data.identity,
        parsedBody.data.attendance,
        parsedBody.data.ceremonyAttendance ?? "",
        parsedBody.data.guestCount,
        parsedBody.data.message ?? "",
      ],
    );

    if (!updated.rows[0]) {
      return reply.code(404).send({ error: "RSVP response not found" });
    }

    const adminRsvp = await findAdminRsvp(pool, parsedParams.data.id);

    return {
      rsvp: adminRsvp,
    };
  });

  app.delete("/api/admin/rsvps/:id", async (request, reply) => {
    if (!isAdminRequest(request, config)) {
      return reply.code(401).send({ error: "Missing or invalid admin token" });
    }

    const parsedParams = rsvpParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid RSVP id" });
    }

    const deleted = await pool.query<{ id: string }>(
      "DELETE FROM rsvp_responses WHERE id = $1 RETURNING id",
      [parsedParams.data.id],
    );

    if (!deleted.rows[0]) {
      return reply.code(404).send({ error: "RSVP response not found" });
    }

    return { ok: true };
  });
}

async function findAdminRsvp(pool: pg.Pool, id: string) {
  const result = await pool.query<AdminRsvpRow>(
    `
      SELECT
        rsvp_responses.*,
        COALESCE(
          array_agg(photo_unlocks.photo_id ORDER BY photo_unlocks.unlocked_at ASC)
            FILTER (WHERE photo_unlocks.photo_id IS NOT NULL),
          ARRAY[]::text[]
        ) AS unlocked_photo_ids,
        count(photo_unlocks.photo_id)::integer AS unlocked_count
      FROM rsvp_responses
      LEFT JOIN photo_unlocks ON photo_unlocks.rsvp_id = rsvp_responses.id
      WHERE rsvp_responses.id = $1
      GROUP BY rsvp_responses.id
    `,
    [id],
  );

  return result.rows[0] ? toAdminRsvp(result.rows[0]) : null;
}

function toAdminRsvp(row: AdminRsvpRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone_number,
    identity: row.identity ?? "",
    attendance: row.attendance,
    ceremonyAttendance: row.ceremony_attendance ?? "",
    guestCount: row.guest_count,
    message: row.message ?? "",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    unlockedPhotoIds: row.unlocked_photo_ids,
    unlockedCount: row.unlocked_count,
  };
}

function toAdminActivity(row: AdminActivityRow) {
  return {
    type: row.type,
    rsvpId: row.rsvp_id,
    guestName: row.guest_name,
    photoId: row.photo_id,
    happenedAt: row.happened_at.toISOString(),
  };
}

function normalizeNameKey(name: string) {
  return name.trim().replace(/\s+/g, "").toLocaleLowerCase();
}

function createAdminToken(config: AppConfig) {
  const encodedPayload = Buffer.from(
    JSON.stringify({
      scope: "admin",
      expiresAt: Date.now() + ADMIN_TOKEN_TTL_MS,
    } satisfies AdminTokenPayload),
  ).toString("base64url");
  const signature = signAdminTokenPayload(encodedPayload, config);

  return `${encodedPayload}.${signature}`;
}

function isAdminRequest(request: FastifyRequest, config: AppConfig) {
  const token = getBearerToken(request);

  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signAdminTokenPayload(encodedPayload, config);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<AdminTokenPayload>;

    return payload.scope === "admin" && typeof payload.expiresAt === "number" && payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function signAdminTokenPayload(encodedPayload: string, config: AppConfig) {
  return hmacSha256Hex(encodedPayload, config.adminTokenSecret);
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
