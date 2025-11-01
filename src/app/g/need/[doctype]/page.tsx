// @/app/need/[doctype]/page.tsx

import Link from "next/link"
import type { DocType } from "@/lib/docs/docs"
import { ALLOWED_DOCTYPES, normalizeDoctype, listNeededDocuments } from "@/app/g/doclist"

export const dynamic = "force-dynamic"

interface PageProps {
  params: { doctype: string }
  searchParams?: { page?: string; limit?: string }
}

export default async function Page({ params, searchParams }: PageProps) {
  const raw = (await params)?.doctype || ""
  const doctype = normalizeDoctype(raw)

  if (!doctype || !ALLOWED_DOCTYPES.includes(doctype)) {
    return (
      <main>
        <h1>/need/{raw}</h1>
        <p>허용되지 않은 doctype입니다. 허용: {ALLOWED_DOCTYPES.join(", ")}</p>
      </main>
    )
  }

  const param = await searchParams
  const page = Math.max(1, parseInt(param?.page ?? "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(param?.limit ?? "50", 10)))
  const { rows, total } = await listNeededDocuments(doctype as DocType, { page, limit })
  const pages = Math.max(1, Math.ceil(total / limit))

  return (
    <main>
      <h1>/need/{doctype}</h1>
      <p>총 {total}건 · {page}/{pages}페이지</p>

      {rows.length === 0 ? (
        <p>모든 참조 대상 문서가 존재합니다. 🎉</p>
      ) : (
        <ol>
          {rows.map((r) => {
            const last =
              r.last_ref
                ? new Date(r.last_ref as unknown as string).toISOString().replace("T", " ").slice(0, 19)
                : "-"

            return (
              <li key={r.sid} style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                <Link href={`/w/${r.sid}`}>{r.name || r.sid}</Link>
                <small style={{ opacity: .7 }}>{r.sid}</small>
                <small style={{ marginLeft: 8, opacity: .7 }}>
                  · 참조 {r.ref_cnt}회 · 마지막 참조 {last}
                </small>
              </li>
            )
          })}
        </ol>
      )}

      <nav style={{ marginTop: 16, display: "flex", gap: 8 }}>
        {page > 1 && (
          <Link href={`/need/${doctype}?page=${page - 1}&limit=${limit}`}>이전</Link>
        )}
        {page < pages && (
          <Link href={`/need/${doctype}?page=${page + 1}&limit=${limit}`}>다음</Link>
        )}
      </nav>

      <hr style={{ margin: "24px 0" }} />

      <p style={{ opacity: .7 }}>
        이 목록은 <code>doc_refs.dst_id IS NULL</code> 이면서 해당 <code>dst_sid</code>로 된 문서가 아직 생성되지 않은 항목만 집계합니다.
      </p>
    </main>
  )
}
