// @/app/list/[doctype]/listDocs.ts

// TYPE
import { DocType, DocRaw } from "@/lib/docs"

export interface ListResult {
  rows: DocRaw[]
  total: number
}

// CONST
export const ALLOWED_DOCTYPES: DocType[] = [
  "article","namespace","user","group","acl"
]

// UTIL
export const normalizeDoctype = (t: string): DocType | null => {
  const v = t.trim().toLowerCase()
  return (ALLOWED_DOCTYPES.includes(v as DocType) ? v as DocType : null)
}

// DAO
import { q, one } from "@/lib/db"

// =====================
// Listing docs
// =====================

export async function listDocumentsByType(
  doctype: DocType,
  { page=1, limit=50 }: { page?: number; limit?: number } = {}
): Promise<ListResult> {
  const offset = (page-1)*limit

  const totalRow = await one<{ cnt: number }>(
    `SELECT COUNT(*)::int AS cnt FROM documents WHERE type=$1`,
    [doctype]
  )

  const rows = await q<DocRaw>(
    `SELECT id, sid, type::text AS type, name, acl_id, mtime, ctime
       FROM documents
      WHERE type=$1
      ORDER BY mtime DESC NULLS LAST, sid ASC
      LIMIT $2 OFFSET $3`,
    [doctype, limit, offset]
  )

  return { rows, total: totalRow?.cnt || 0 }
}

// =====================
// Needed (missing) docs
// =====================

export interface NeededDocRow {
  sid: string
  type: DocType
  name: string
  ref_cnt: number
  last_ref: Date | null
}

export interface NeededListResult {
  rows: NeededDocRow[]
  total: number
}

/**
 * References whose targets do not exist yet:
 * pick r.dst_sid where r.dst_id IS NULL and no documents.sid matches it.
 * Filter by doctype prefix in "type:name".
 */
export async function listNeededDocuments(
  doctype: DocType,
  { page=1, limit=50 }: { page?: number; limit?: number } = {}
): Promise<NeededListResult> {
  const offset = (page-1)*limit

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
    [doctype]
  )

  // 목록
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
    [doctype, limit, offset]
  )

  return { rows, total: totalRow?.cnt || 0 }
}
