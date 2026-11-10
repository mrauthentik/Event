/**
 * Seed script: creates the initial admin staff user.
 * Self-contained — uses `postgres` + `hash-wasm` directly so it runs
 * under plain `node --experimental-strip-types` without path aliases.
 *
 * Usage:
 *   $env:ADMIN_PASSWORD="your-password"; node --experimental-strip-types scripts/seed-admin.ts
 *
 * Env vars:
 *   DATABASE_URL            — Postgres connection string (required)
 *   ADMIN_USERNAME          — default: "admin"
 *   ADMIN_PASSWORD          — required (min 10 chars)
 *   ADMIN_FULL_NAME         — default: "Conference Administrator"
 *   ADMIN_TOTP_SECRET       — optional base32 secret; enables TOTP
 */
import postgres from "postgres";
import { argon2id } from "hash-wasm";

const SALT_BYTES = 16;
const HASH_BYTES = 32;
const ITERATIONS = 3;
const MEMORY_SIZE = 65536;
const PARALLELISM = 1;

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await argon2id({
    password,
    salt,
    iterations: ITERATIONS,
    memorySize: MEMORY_SIZE,
    parallelism: PARALLELISM,
    hashLength: HASH_BYTES,
    outputType: "binary",
  });
  return `${toHex(salt)}:${toHex(hash)}`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const fullName = process.env.ADMIN_FULL_NAME || "Conference Administrator";
  const totpSecret = process.env.ADMIN_TOTP_SECRET || null;

  if (!password || password.length < 10) {
    console.error("ADMIN_PASSWORD is required (min 10 chars).");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { prepare: false, max: 1 });

  try {
    const existing = await sql`
      SELECT id FROM staff_users WHERE username = ${username} LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`User "${username}" already exists — skipping.`);
      return;
    }

    const passwordHash = await hashPassword(password);

    await sql`
      INSERT INTO staff_users (full_name, username, password_hash, role, totp_secret, totp_enabled, is_active)
      VALUES (${fullName}, ${username}, ${passwordHash}, 'admin', ${totpSecret}, ${!!totpSecret}, true)
    `;

    console.log(`Admin user "${username}" created.`);
    if (totpSecret) {
      console.log("TOTP enabled — configure your authenticator with the ADMIN_TOTP_SECRET value.");
    } else {
      console.log("TOTP not enabled. Set ADMIN_TOTP_SECRET and re-run to enable it later.");
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
