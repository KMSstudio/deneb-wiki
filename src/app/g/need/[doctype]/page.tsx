// @/app/need/[doctype]/page.tsx

import type { DocType } from "@/lib/docs/docs";
import { listNeededDocuments, normalizeDoctype } from "@/app/g/doclist";
import DocumentListTitle from "@/components/list/DocumentListTitle";
import DocumentListContent, { ListEntry } from "@/components/list/DocumentListContent";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { doctype: string };
}

/** SEO: 도큐먼트 타입에 따라 타이틀/디스크립션 생성 */
export async function generateMetadata({ params }: PageProps) {
  const raw = (await params)?.doctype ?? "";
  const doctype = normalizeDoctype(raw);
  const title = doctype ? `Missing refs · ${doctype}` : `Missing refs · Invalid type (${raw})`;
  return { title, description: `Unresolved references for type: ${doctype ?? raw}` };
}

export default async function Page({ params }: PageProps) {
  const raw = (await params)?.doctype ?? "";
  const doctype = normalizeDoctype(raw);

  if (!doctype) {
    return (
      <article className="documentlist-container">
        <DocumentListTitle title={`/need/${raw}`} total={0} />
        <p style={{ opacity: 0.7 }}>허용되지 않은 doctype입니다.</p>
      </article>
    );
  }

  try {
    const { rows, total } = await listNeededDocuments(doctype as DocType);

    const entries: ListEntry[] = rows.map((r) => {
      return {
        key: r.sid,
        sid: r.sid,
        href: `/w/${encodeURIComponent(r.sid)}`,
        meta: `참조 ${r.ref_cnt}회`,
      };
    });

    return (
      <article className="documentlist-container">
        <DocumentListTitle title={`/need/${doctype}`} total={total} />
        {entries.length === 0
         ? (<p aria-live="polite" style={{ opacity: 0.7 }}> 모든 참조 대상 문서가 존재합니다. 🎉</p>)
         : (<DocumentListContent entries={entries} ariaLabel="미해결 참조 목록" />)}
      </article>
    );
  } catch (err) {
    return (
      <article className="documentlist-container">
        <DocumentListTitle title={`/need/${doctype}`} total={0} />
        <p style={{ color: "crimson" }}>목록을 불러오지 못했습니다.</p>
        <pre style={{ padding: 12, background: "#0000000d", borderRadius: 8 }}>
          {err instanceof Error ? err.message : String(err)}
        </pre>
      </article>
    );
  }
}
