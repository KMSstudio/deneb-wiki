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