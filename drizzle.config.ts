import { defineConfig } from "drizzle-kit";

const migrationUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!migrationUrl) {
  throw new Error("Set MIGRATION_DATABASE_URL (Supabase direct connection) to run Drizzle migrations.");
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
  strict: true,
  verbose: true,
});

