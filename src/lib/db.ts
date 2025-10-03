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
