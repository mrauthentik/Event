const postgres = require("postgres");
const url = process.argv[2];
const sql = postgres(url, { prepare: false, connect_timeout: 15 });
sql`select 1 as ok`
  .then((r) => { console.log("DB OK:", r); process.exit(0); })
  .catch((e) => { console.log("DB ERR:", e.message); process.exit(1); });
