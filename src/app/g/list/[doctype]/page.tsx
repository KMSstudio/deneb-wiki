// @/app/g/list/[doctype]/page.tsx

import Link from "next/link";
import type { DocType, DocRaw } from "@/lib/docs/docs";
import { listDocumentsByType, normalizeDoctype } from "@/app/g/doclist";
import { displayOf } from "@/lib/docs/sid";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { doctype: string };
}

export async function generateMetadata({ params }: PageProps) {
  const raw = params?.doctype ?? "";
  const doctype = normalizeDoctype(raw);
  const title = doctype ? `Documents: ${doctype}` : `Documents: Invalid type (${raw})`;
  return { title, description: `List documents of type: ${doctype ?? raw}` };
}

export default async function Page({ params }: PageProps) {
  const raw = params?.doctype ?? "";
  const doctype = normalizeDoctype(raw);

  if (!doctype ) {
    return (
      <main>
        <h1>/list/{raw}</h1>
        <p>허용되지 않은 doctype입니다.</p>
      </main>
    );
  }

  try {
    const { rows, total } = await listDocumentsByType(doctype as DocType);

    return (
      <main>
        <h1 id="list-heading">/list/{doctype}</h1>
        <p>총 {total}건</p>

        {rows.length === 0 ? (
          <p aria-live="polite" style={{ opacity: 0.7 }}>표시할 문서가 없습니다.</p>
        ) : (
          <ol aria-labelledby="list-heading">
            {rows.map((r: DocRaw) => (
              <li key={r.sid}>
                <Link href={`/w/${encodeURIComponent(r.sid)}`}>
                  {r.name || displayOf(r.sid)}
                </Link>
                <small style={{ marginLeft: 8, opacity: 0.6 }}>{r.sid}</small>
              </li>
            ))}
          </ol>
        )}
      </main>
    );
  } catch (err) {
    return (
      <main>
        <h1>/list/{doctype}</h1>
        <p style={{ color: "crimson" }}>목록을 불러오지 못했습니다.</p>
        <pre style={{ padding: 12, background: "#0000000d", borderRadius: 8 }}>
          {err instanceof Error ? err.message : String(err)}
        </pre>
      </main>
    );
  }
}
