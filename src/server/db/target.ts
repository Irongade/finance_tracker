/**
 * Which database the CLI tools talk to. The app itself always uses DATABASE_URL
 * (Vercel sets it to Neon); locally DATABASE_URL is Postgres.app and the Neon
 * URL lives in DATABASE_URL_PROD, selected with DB_TARGET=prod.
 */
export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): { url: string; target: "local" | "prod" } {
  const target = env.DB_TARGET === "prod" ? "prod" : "local";
  const url = target === "prod" ? env.DATABASE_URL_PROD : env.DATABASE_URL;
  if (!url) throw new Error(target === "prod" ? "DATABASE_URL_PROD is not set" : "DATABASE_URL is not set");
  return { url, target };
}

/**
 * Neon's pooled endpoint (PgBouncer) is right for the app; migrations and other
 * DDL should use the direct endpoint, which is the same host without "-pooler".
 */
export function directUrl(url: string): string {
  return url.replace("-pooler.", ".");
}
