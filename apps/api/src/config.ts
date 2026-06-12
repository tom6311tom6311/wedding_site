export type AppConfig = {
  databaseUrl: string;
  databaseSslCaFile?: string;
  databaseSslRejectUnauthorized: boolean;
  host: string;
  port: number;
  webOrigin: string;
  phoneHashSecret: string;
  browserTokenSecret: string;
  adminPassword: string;
  adminTokenSecret: string;
};

export function loadConfig(): AppConfig {
  return {
    databaseUrl:
      readEnv("DATABASE_URL") ??
      "postgres://wedding:wedding@localhost:5432/wedding",
    databaseSslCaFile: readEnv("DATABASE_SSL_CA_FILE"),
    databaseSslRejectUnauthorized:
      readEnv("DATABASE_SSL_REJECT_UNAUTHORIZED") !== "false",
    host: readEnv("HOST") ?? "0.0.0.0",
    port: Number(readEnv("PORT") ?? 4000),
    webOrigin: readEnv("WEB_ORIGIN") ?? "http://localhost:5173",
    phoneHashSecret:
      readEnv("PHONE_HASH_SECRET") ?? "dev-phone-hash-secret-change-me",
    browserTokenSecret:
      readEnv("BROWSER_TOKEN_SECRET") ?? "dev-browser-token-secret-change-me",
    adminPassword: readEnv("ADMIN_PASSWORD") ?? "admin",
    adminTokenSecret:
      readEnv("ADMIN_TOKEN_SECRET") ??
      readEnv("BROWSER_TOKEN_SECRET") ??
      "dev-admin-token-secret-change-me",
  };
}

function readEnv(name: string) {
  const value = process.env[name]?.trim();

  return value || undefined;
}
