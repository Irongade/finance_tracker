import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    env: { DATABASE_URL_TEST: process.env.DATABASE_URL_TEST ?? "postgresql://localhost:5432/finance_tracker_test" },
    fileParallelism: false,
  },
});
