import postgres from "postgres";
const url = process.argv[2];
const sql = postgres(url, { prepare: false, connect_timeout: 15 });
try {
  const r = await sql`select 1 as ok`;
  console.log("DB OK:", r);
  process.exit(0);
} catch (e) {
  console.log("DB ERR:", e.message);
  process.exit(1);
}
