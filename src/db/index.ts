import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required. Configure the Supabase PostgreSQL pooler URL.");
}

// For serverless/edge environments, disable prefetch
const client = postgres(connectionString, {
  prepare: false,
  max: Number(process.env.DB_POOL_SIZE || 5),
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;

