import type { FastifyInstance, FastifyRequest } from "fastify";
import type pg from "pg";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { constantTimeEqual, hmacSha256Hex } from "./crypto.js";
import type { RsvpRow } from "./db.js";
import { checkRateLimit } from "./rateLimit.js";

const ADMIN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const loginPayloadSchema = z.object({
  password: z.string().min(1).max(500),
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
