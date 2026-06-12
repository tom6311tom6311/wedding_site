import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerAdminRoutes } from "./admin.js";
import { loadConfig } from "./config.js";
import { createPool, migrate } from "./db.js";
import { registerPuzzleRoutes } from "./puzzle.js";
import { registerRsvpRoutes } from "./rsvp.js";

const config = loadConfig();
const app = Fastify({
  logger: true,
});
const pool = createPool(config);
const databaseUrl = new URL(config.databaseUrl);

app.log.info(
  {
    database: databaseUrl.pathname.replace(/^\//, ""),
    databaseHost: databaseUrl.hostname,
    databaseSslCaFile: config.databaseSslCaFile ?? null,
    databaseSslRejectUnauthorized: config.databaseSslRejectUnauthorized,
  },
  "database connection config",
);

await app.register(cors, {
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  origin: config.webOrigin,
});

app.get("/health", async () => ({ ok: true }));
registerRsvpRoutes(app, pool, config);
registerPuzzleRoutes(app, pool, config);
registerAdminRoutes(app, pool, config);

async function start() {
  await waitForDatabase();
  await migrate(pool);
  await app.listen({
    host: config.host,
    port: config.port,
  });
}

async function waitForDatabase() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30_000) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
    }
  }

  await pool.query("SELECT 1");
}

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
