import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/finance_tracker" },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
