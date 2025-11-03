// @/app/e/[sid]/page.tsx

// Document
import { getDocument } from "@/lib/docs/docs";
import type { Document, Article, Namespace } from "@/lib/docs/docs";
// Authertication, ACLs
import { getSessionUser } from "@/lib/auth";
import { getRudByAcl } from "@/lib/docs/acl";
import Forbidden from "@/components/Forbidden";
// Document Edits
import ArticleEdit from "./ArticleEdit";
import NamespaceEdit from "./NamespaceEdit";

export const revalidate = 0;
export const dynamic = "force-dynamic";

async function isUpdateAllowed(aclId: number | null): Promise<boolean> {
  const userIdx: number | null = (await getSessionUser())?.idx ?? null;
  const rud = await getRudByAcl(aclId, userIdx);
  return !!rud.update;
}

export default async function Page({ params }: { params: { sid: string }; }) {
  const raw = decodeURIComponent((await params).sid);
  const sid = raw.includes(":") ? raw : `article:${raw}`;

  try {
    const doc: Document | null = await getDocument(sid);
    const allowed: boolean = doc?.acl_id ? await isUpdateAllowed(doc.acl_id) : true;

    if (!allowed) {
      return <Forbidden sid={sid} reason="no_update_permission" detail={{ acl_id: doc?.acl_id }} />;
    } else if (sid.startsWith("article:")) {
      return <ArticleEdit article={doc as Article | null} sid={sid} />;
    } if (sid.startsWith("namespace:")) {
      return <NamespaceEdit namespace={doc as Namespace | null} sid={sid} />;
    }

    return (
      <pre style={{ padding: 24 }}> {JSON.stringify({ ok: false, error: "edit_not_supported", sid }, null, 2)} </pre>
    );
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
