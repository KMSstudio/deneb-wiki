/** Quick connectivity check with node-postgres */
/** To run the code, execute `node --env-file=.env scripts/pg-check.mjs` at root folder */

import pg from "pg";
const { Pool } = pg;

const raw = process.env.DATABASE_URL; // || "postgres://gaist:gaist-pw@localhost:6542/gaist-app-db";
const cn = raw.trim().replace(/\r|\n/g, "");
console.log("TEST_URL =", JSON.stringify(cn));

const pool = new Pool({ connectionString: cn, ssl: false, application_name: "cse-wiki-check" });

try {
  const r = await pool.query("select now() as now, current_user as user");
  console.log(r.rows[0]);
} catch (e) {
  console.error("PG connect error:", e);
  process.exit(1);
} finally {
  await pool.end();
}
