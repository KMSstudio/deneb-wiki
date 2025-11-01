/** Quick connectivity check with node-postgres (CommonJS). */

/**
 * To run this code, run `node scripts/pg-check.cjs` at root folder
 * Node.js is needed
 */

const { Pool } = require("pg");

const raw = process.env.DATABASE_URL;
const cn = raw.trim().replace(/\r|\n/g, "");
console.log("TEST_URL =", JSON.stringify(cn));

const pool = new Pool({ connectionString: cn, ssl: false, application_name: "cse-wiki-check" });

(async function main() {
  const r = await pool.query("select now() as now, current_user as user");
  console.log(r.rows[0]);
  await pool.end();
})().catch((e) => {
  console.error("PG connect error:", e);
  process.exit(1);
});
