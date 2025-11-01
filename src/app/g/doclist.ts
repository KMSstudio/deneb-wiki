// @/app/list/[doctype]/listDocs.ts

// TYPE
import { DocType, DocRaw } from "@/lib/docs/docs";

export interface ListResult {
  rows: DocRaw[];
  total: number;
}

// CONST
export const ALLOWED_DOCTYPES: DocType[] = ["article", "namespace", "user", "group", "acl"];

// UTIL
export const normalizeDoctype = (t: string): DocType | null => {
  const v = t.trim().toLowerCase();
  return ALLOWED_DOCTYPES.includes(v as DocType) ? (v as DocType) : null;
};

// DAO
import { q, one } from "@/lib/db";

// =====================
// Listing docs
// =====================

export async function listDocumentsByType(
  doctype: DocType,
  { page = 1, limit = 50 }: { page?: number; limit?: number } = {},
): Promise<ListResult> {
  const offset = (page - 1) * limit;

  const totalRow = await one<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM documents WHERE type=$1`, [doctype]);

  const rows = await q<DocRaw>(
    `SELECT id, sid, type::text AS type, name, acl_id, mtime, ctime
       FROM documents
      WHERE type=$1
      ORDER BY mtime DESC NULLS LAST, sid ASC
      LIMIT $2 OFFSET $3`,
    [doctype, limit, offset],
  );

  return { rows, total: totalRow?.cnt || 0 };
}

// =====================
// Needed (missing) docs
// =====================

export interface NeededDocRow {
  sid: string;
  type: DocType;
  name: string;
  ref_cnt: number;
  last_ref: Date | null;
}

export interface NeededListResult {
  rows: NeededDocRow[];
  total: number;
}

/**
 * List "missing targets" that are referenced but not yet created as documents.
 *
 * This query groups `doc_refs` rows whose target is unresolved
 * (`doc_refs.dst_id IS NULL`) and for which no matching `documents.sid`
 * exists yet. It filters by a specific `doctype` using the `type:name`
 * SID prefix (e.g., `article:foo`) and returns:
 *
 * - `sid`     : Full target SID (`type:name`)
 * - `type`    : Extracted doctype from `sid` (before the first `:`)
 * - `name`    : Extracted name from `sid` (after the first `:`)
 * - `ref_cnt` : Number of references pointing to this missing target
 * - `last_ref`: Most recent reference time among those rows
 *
 * SQL breakdown:
 * - `SELECT r.dst_sid AS sid`                          → expose target SID
 * - `split_part(r.dst_sid, ':', 1) AS type`            → parse SID prefix as doc type
 * - `split_part(r.dst_sid, ':', 2) AS name`            → parse SID suffix as name
 * - `COUNT(*) AS ref_cnt`                              → how many refs point to this SID
 * - `MAX(r.ctime) AS last_ref`                         → latest reference timestamp
 * - `FROM doc_refs r`                                  → aggregate on references
 * - `LEFT JOIN documents d ON d.sid = r.dst_sid`       → check if the target doc already exists
 * - `WHERE r.dst_id IS NULL`                           → only unresolved/unnormalized targets
 * - `AND d.id IS NULL`                                 → and the document truly does not exist
 * - `AND r.dst_sid LIKE $1 || ':%'`                    → keep only SIDs of the requested doctype
 * - `GROUP BY r.dst_sid`                               → aggregate by target SID
 * - `ORDER BY MAX(r.ctime) DESC, r.dst_sid ASC`        → newest first, tie-break by SID
 * - `LIMIT $2 OFFSET $3`                               → pagination
 *
 * Example data:
 * documents:
 * | id | sid            |
 * |----|----------------|
 * | 10 | article:intro  |
 * | 11 | user:alice     |
 *
 * doc_refs:
 * | id | src_id | dst_id | dst_sid         | ctime               |
 * |----|--------|--------|-----------------|---------------------|
 * | 1  | 101    | NULL   | article:intro   | 2025-10-10 10:00:00 |
 * | 2  | 102    | NULL   | article:setup   | 2025-10-10 11:00:00 |
 * | 3  | 103    | NULL   | article:setup   | 2025-10-10 12:00:00 |
 * | 4  | 104    | NULL   | article:install | 2025-10-10 09:30:00 |
 * | 5  | 105    | 999    | article:advanced| 2025-10-10 12:30:00 |
 * | 6  | 106    | NULL   | user:alice      | 2025-10-10 13:00:00 |
 * | 8  | 108    | NULL   | article:tips    | 2025-10-10 08:00:00 |
 *
 * With `$1 = 'article'`:
 * - Keep rows whose `dst_id IS NULL`, `documents.sid` is missing, and `dst_sid` starts with `article:`.
 * - Remaining target SIDs: `article:setup` (2 refs), `article:install` (1 ref), `article:tips` (1 ref).
 *
 * Final grouped output:
 * | sid              | type    | name     | ref_cnt | last_ref            |
 * |------------------|---------|----------|---------|---------------------|
 * | article:setup    | article | setup    | 2       | 2025-10-10 12:00:00 |
 * | article:install  | article | install  | 1       | 2025-10-10 09:30:00 |
 * | article:tips     | article | tips     | 1       | 2025-10-10 08:00:00 |
 *
 * @param doctype  The target document type to filter by (SID prefix before `:`).
 * @param page     1-based page index for pagination.
 * @param limit    Page size (max rows per page).
 * @returns        Rows of missing targets with counts and last reference timestamps.
 *
 * @remarks
 * Performance tips:
 * - Add indexes on `doc_refs(dst_sid)`, `doc_refs(dst_id)`, `doc_refs(ctime)` and `documents(sid)`.
 * - The prefix filter `dst_sid LIKE 'article:%'` benefits from a btree index because the left side is fixed.
 * - For very large datasets, consider keyset pagination using `(last_ref, sid)` as a cursor instead of `OFFSET`.
 *
 * @example
 * const { rows, total } = await listNeededDocuments('article', { page: 1, limit: 50 })
 * // rows will be sorted by newest `last_ref` first, then `sid` ascending.
 */
export async function listNeededDocuments(
  doctype: DocType,
  { page = 1, limit = 50 }: { page?: number; limit?: number } = {},
): Promise<NeededListResult> {
  const offset = (page - 1) * limit;

  // 총 개수
  const totalRow = await one<{ cnt: number }>(
    `
    SELECT COUNT(DISTINCT r.dst_sid)::int AS cnt
      FROM doc_refs r
      LEFT JOIN documents d ON d.sid = r.dst_sid
     WHERE r.dst_id IS NULL
       AND d.id IS NULL
       AND r.dst_sid LIKE $1 || ':%'
    `,
    [doctype],
  );

  const rows = await q<NeededDocRow>(
    `
    SELECT r.dst_sid AS sid,
           split_part(r.dst_sid, ':', 1)::text AS type,
           split_part(r.dst_sid, ':', 2)       AS name,
           COUNT(*)::int                        AS ref_cnt,
           MAX(r.ctime)                         AS last_ref
      FROM doc_refs r
      LEFT JOIN documents d ON d.sid = r.dst_sid
     WHERE r.dst_id IS NULL
       AND d.id IS NULL
       AND r.dst_sid LIKE $1 || ':%'
     GROUP BY r.dst_sid
     ORDER BY MAX(r.ctime) DESC NULLS LAST, r.dst_sid ASC
     LIMIT $2 OFFSET $3
    `,
    [doctype, limit, offset],
  );

  return { rows, total: totalRow?.cnt || 0 };
}
