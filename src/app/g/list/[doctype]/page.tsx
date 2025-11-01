// @/app/list/[doctype]/page.tsx

import Link from "next/link"
import type { DocType, DocRaw } from "@/lib/docs/docs"
import { listDocumentsByType, ALLOWED_DOCTYPES, normalizeDoctype } from "@/app/g/doclist"

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
        <h1>/list/{raw}</h1>
        <p>허용되지 않은 doctype입니다. 허용: {ALLOWED_DOCTYPES.join(", ")}</p>
      </main>
    )
  }

  const param = await searchParams;

  const page = Math.max(1, parseInt(param?.page ?? "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(param?.limit ?? "50", 10)))
  const { rows, total } = await listDocumentsByType(doctype as DocType, { page, limit })
  const pages = Math.max(1, Math.ceil(total / limit))

  return (
    <main>
      <h1>/list/{doctype}</h1>
      <p>총 {total}건 · {page}/{pages}페이지</p>
      <ol>
        {rows.map((r: DocRaw) => (
          <li key={r.sid}>
            <Link href={`/w/${r.sid}`}>{r.name || r.sid}</Link>
            <small style={{ marginLeft: 8, opacity: .6 }}>{r.sid}</small>
          </li>
        ))}
      </ol>
      <nav style={{ marginTop: 16, display: "flex", gap: 8 }}>
        {page > 1 && (
          <Link href={`/list/${doctype}?page=${page - 1}&limit=${limit}`}>이전</Link>
        )}
        {page < pages && (
          <Link href={`/list/${doctype}?page=${page + 1}&limit=${limit}`}>다음</Link>
        )}
      </nav>
    </main>
  )
}
