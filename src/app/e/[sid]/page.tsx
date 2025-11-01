import { getDocument } from "@/lib/docs/docs";
import type { Article } from "@/lib/docs/docs";
import ArticleEdit from "./ArticleEdit";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ sid: string }> }) {
  const raw: string = decodeURIComponent((await params).sid);
  const sid: string = raw.includes(":") ? raw : `article:${raw}`;

  if (sid.startsWith("article:")) {
    const doc = (await getDocument(sid)) as Article | null;
    return <ArticleEdit sid={sid} article={doc} />;
  }

  return <pre style={{ padding: 24 }}>{JSON.stringify({ ok: false, error: "edit_not_supported", sid }, null, 2)}</pre>;
}
