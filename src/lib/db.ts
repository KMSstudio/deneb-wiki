// @/lib/db.ts

import { Pool, type QueryResultRow } from "pg";

// 개발환경 HMR 대비 싱글톤
const globalForPool = globalThis as unknown as { _pgPool?: Pool };

console.log(`connectionString: ${process.env.DATABASE_URL}`);

export const pool =
  globalForPool._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
  });

if (!globalForPool._pgPool) globalForPool._pgPool = pool;

/**
 * SQL 실행: rows 반환
 * 사용 예) const rows = await q<{ id: number; sid: string }>('SELECT id,sid FROM documents');
 */
export async function q<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[],
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

/**
 * 한 행만 가져오기 (없으면 null)
 */
export async function one<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

/**
 * 전체 DB 덤프 (스키마 + 데이터)
 * SQL 텍스트를 반환
 */
export async function dump(): Promise<string> {
  let dump = "";
  const tables = await q<{ table_name: string }>(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name
    `
  );

  for (const { table_name } of tables) {
    // SCHEMA (DDL)
    const create = await q<{ ddl: string }>(
      `SELECT pg_get_tabledef(oid) AS ddl FROM pg_class WHERE relname=$1`,
      [table_name]
    ).catch(() => []);

    if (create.length) {
      dump += create[0].ddl + ";\n\n";
    } else {
      dump += `-- Table ${table_name}\n`;
    }

    // DATA (DML)
    const rows = await q<any>(`SELECT * FROM ${table_name}`);
    for (const row of rows) {
      const cols = Object.keys(row).map((c) => `"${c}"`).join(",");
      const vals = Object.values(row)
        .map((v) =>
          v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`
        )
        .join(",");
      dump += `INSERT INTO "${table_name}"(${cols}) VALUES(${vals});\n`;
    }
    dump += "\n";
  }

  return dump;
}
