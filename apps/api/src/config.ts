export type AppConfig = {
  databaseUrl: string;
  host: string;
  port: number;
  webOrigin: string;
  phoneHashSecret: string;
  browserTokenSecret: string;
};

export function loadConfig(): AppConfig {
  return {
    databaseUrl:
      readEnv("DATABASE_URL") ??
      "postgres://wedding:wedding@localhost:5432/wedding",
    host: readEnv("HOST") ?? "0.0.0.0",
    port: Number(readEnv("PORT") ?? 4000),
    webOrigin: readEnv("WEB_ORIGIN") ?? "http://localhost:5173",
    phoneHashSecret:
      readEnv("PHONE_HASH_SECRET") ?? "dev-phone-hash-secret-change-me",
    browserTokenSecret:
      readEnv("BROWSER_TOKEN_SECRET") ?? "dev-browser-token-secret-change-me",
  };
}

function readEnv(name: string) {
  const value = process.env[name]?.trim();

  return value || undefined;
}
