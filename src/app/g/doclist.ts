// @/app/list/[doctype]/listDocs.ts

import type { DocType, DocRaw } from "@/lib/docs/docs";
import { ALLOWED_DOCTYPES } from "@/lib/docs/docs";
import { q } from "@/lib/db";

// =====================
// Constants / Utilities
// =====================

export interface ListResult {
  rows: DocRaw[];
  total: number;
}
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

/** Normalize string as DocType */
export const normalizeDoctype = (t: string): DocType | null => {
  const v = t.trim().toLowerCase();
  return (ALLOWED_DOCTYPES as string[]).includes(v) ? (v as DocType) : null;
};

// =====================
// SQL Queries
// =====================

const SQL_LIST_BY_TYPE_ALL = `
  SELECT id, sid, type::text AS type, name, acl_id, mtime, ctime
    FROM documents
   WHERE type = $1
   ORDER BY mtime DESC NULLS LAST, sid ASC
`;

const SQL_NEEDED_LIST_ALL = `
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
`;

// =====================
// List All Document
// =====================

/**
 * 특정 Document Type의 모든 문서를 최신 수정순으로 반환한다.
 * 정렬은 `mtime DESC NULLS LAST, sid ASC`를 따른다.
 *
 * @param doctype 조회할 문서 타입
 * @returns rows + total(= rows.length)
 */
export async function listDocumentsByType(doctype: DocType): Promise<ListResult> {
  const rows = await q<DocRaw>(SQL_LIST_BY_TYPE_ALL, [doctype]);
  return { rows, total: rows.length };
}

// =====================
// List Needed Document
// =====================

/**
 * 참조는 존재하지만 아직 생성되지 않은 대상(SID)을 전체 집계해 반환한다.
 * `doc_refs.dst_id IS NULL` 이면서 `documents.sid`가 존재하지 않는 타겟을
 * 주어진 도큐먼트 타입 접두사(`type:`)로 필터링하여 그룹화한다.
 *
 * 반환값:
 * - sid      : 전체 SID (`type:name`)
 * - type     : SID의 접두사(doctype)
 * - name     : SID의 이름 부분
 * - ref_cnt  : 해당 SID로 향하는 레퍼런스 개수
 * - last_ref : 가장 최근 참조 시각
 *
 * @param doctype 대상 도큐먼트 타입
 * @returns rows + total(= rows.length)
 */
export async function listNeededDocuments(doctype: DocType): Promise<NeededListResult> {
  const rows = await q<NeededDocRow>(SQL_NEEDED_LIST_ALL, [doctype]);
  return { rows, total: rows.length };
}
