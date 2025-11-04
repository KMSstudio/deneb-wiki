// @/app/g/list/[doctype]/page.tsx

import type { DocType, DocRaw } from "@/lib/docs/docs";
import { listDocumentsByType, normalizeDoctype } from "@/app/g/doclist";
import DocumentListTitle from "@/components/list/DocumentListTitle";
import DocumentListContent, { ListEntry } from "@/components/list/DocumentListContent";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { doctype: string };
}

/** SEO */
export async function generateMetadata({ params }: PageProps) {
  const raw = (await params)?.doctype ?? "";
  const doctype = normalizeDoctype(raw);
  const title = doctype ? `Documents · ${doctype}` : `Invalid type (${raw})`;
  return { title, description: `List documents of type: ${doctype ?? raw}` };
}

export default async function Page({ params }: PageProps) {
  const raw = (await params)?.doctype ?? "";
  const doctype = normalizeDoctype(raw);

  if (!doctype) {
    return (
      <article className="documentlist-container">
        <DocumentListTitle title={`/g/list/${raw}`} total={0} />
        <p style={{ opacity: 0.7 }}>허용되지 않은 doctype입니다.</p>
      </article>
    );
  }

  try {
    const { rows, total } = await listDocumentsByType(doctype as DocType);

    const entries: ListEntry[] = rows.map((r: DocRaw) => {
      // mtime 포매팅 (옵션)
      let meta: string | undefined;
      if (r.mtime) {
        const d = typeof r.mtime === "string" ? new Date(r.mtime) : (r.mtime as unknown as Date);
        const stamp = isNaN(d.getTime()) ? "-" : d.toISOString().replace("T", " ").slice(0, 19);
        meta = `수정 ${stamp}`;
      }
      return {
        key: r.sid,
        sid: r.sid,                                 // DocumentListContent가 display/type 계산
        href: `/w/${encodeURIComponent(r.sid)}`,    // 이동 링크
        meta,                                       // 우측 메타(선택)
      };
    });

    return (
      <article className="documentlist-container">
        <DocumentListTitle title={`/g/list/${doctype}`} total={total} />
        <DocumentListContent entries={entries} ariaLabel="문서 목록" />
      </article>
    );
  } catch (err) {
    return (
      <article className="documentlist-container">
        <DocumentListTitle title={`/g/list/${doctype}`} total={0} />
        <p style={{ color: "crimson" }}>목록을 불러오지 못했습니다.</p>
        <pre style={{ padding: 12, background: "#0000000d", borderRadius: 8 }}>
          {err instanceof Error ? err.message : String(err)}
        </pre>
      </article>
    );
  }
}
