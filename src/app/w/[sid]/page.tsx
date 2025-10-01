import { getDocument } from "@/lib/docs";
import type { Document, Article } from "@/lib/docs";
import ArticleView from "./ArticleView";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: { sid: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const raw: string = decodeURIComponent((await params).sid);
  const sid: string = raw.includes(":") ? raw : `article:${raw}`;

  try {
    const doc: Document | null = await getDocument(sid);
    const payload = doc ? { ok: true, sid, document: doc } : { ok: false, error: "not_found", sid };

    if ((await searchParams).view === "raw") {
      return <pre style={{ padding: 24 }}>{JSON.stringify(payload, null, 2)}</pre>;
    } else if (sid.startsWith("article:")) {
      return <ArticleView article={doc as Article | null} sid={sid} />;
    }

    return <pre style={{ padding: 24 }}>{JSON.stringify(payload, null, 2)}</pre>;
  } catch (err) {
    const payload = {
      ok: false,
      error: "internal_error",
      sid,
      message: err instanceof Error ? err.message : String(err),
    };
    return <pre style={{ padding: 24, color: "crimson" }}>{JSON.stringify(payload, null, 2)}</pre>;
  }
}
