import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * One pool per process. node-postgres works against Postgres.app locally and
 * against Neon's pooled connection string in production (TLS is negotiated
 * from the URL).
 */
function createDb(url: string) {
  const pool = new Pool({ connectionString: url, max: 10 });
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Anything a repository can run queries on: the db or a transaction handle. */
export type DbHandle = Db | Tx;

const globalForDb = globalThis as unknown as { __financeDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__financeDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.__financeDb = createDb(url);
  }
  return globalForDb.__financeDb;
}

export { createDb };
