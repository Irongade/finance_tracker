import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { directUrl, resolveDatabaseUrl } from "./src/server/db/target";

config({ path: [".env.local", ".env"] });

const { url, target } = resolveDatabaseUrl();
if (target === "prod") console.log("drizzle-kit: targeting PRODUCTION (DATABASE_URL_PROD, direct endpoint)");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: target === "prod" ? directUrl(url) : url },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
