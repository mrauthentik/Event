import { randomBytes } from "node:crypto";
import postgres from "postgres";

const username = process.argv[2]?.trim().toLowerCase();
if (!username || !/^[a-z0-9_.-]{1,64}$/.test(username)) {
  console.error("Usage: node --env-file=.env scripts/provision-totp.mjs <staff-username>");
  process.exit(2);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(2);
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function toBase32(bytes) {
  let bits = 0;
  let value = 0;
  let result = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}

const secret = toBase32(randomBytes(20));
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  connect_timeout: 10,
  idle_timeout: 1,
});

try {
  const [user] = await sql`
    select id, username, role, totp_enabled
    from staff_users
    where username = ${username} and is_active = true
      and role in ('admin', 'finance')
    limit 1
  `;

  if (!user) {
    console.error("No active admin or finance account matched that username.");
    process.exitCode = 1;
  } else if (user.totp_enabled) {
    console.error("TOTP is already enabled. Revoke or reset it through the controlled recovery procedure first.");
    process.exitCode = 1;
  } else {
    await sql`
      update staff_users
      set totp_secret = ${secret}, totp_enabled = true, updated_at = now()
      where id = ${user.id}
    `;
    const label = encodeURIComponent(`IHGC 2026:${user.username}`);
    const params = new URLSearchParams({
      secret,
      issuer: "IHGC 2026",
      algorithm: "SHA1",
      digits: "6",
      period: "30",
    });
    console.log(`TOTP provisioned for ${user.username}.`);
    console.log("Add this account to the authenticator now; this secret is displayed only once:");
    console.log(`otpauth://totp/${label}?${params.toString()}`);
    console.log(`Manual setup key: ${secret}`);
    console.log("Run this command only in a trusted terminal. Do not paste its output into tickets or build logs.");
  }
} catch (error) {
  console.error("Could not provision TOTP.", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 2 });
}
