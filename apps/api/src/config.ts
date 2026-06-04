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
      process.env.DATABASE_URL ??
      "postgres://wedding:wedding@localhost:5432/wedding",
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? 4000),
    webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    phoneHashSecret:
      process.env.PHONE_HASH_SECRET ?? "dev-phone-hash-secret-change-me",
    browserTokenSecret:
      process.env.BROWSER_TOKEN_SECRET ?? "dev-browser-token-secret-change-me",
  };
}
