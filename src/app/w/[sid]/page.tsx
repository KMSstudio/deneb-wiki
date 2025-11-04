// @/app/w/[sid]/page.tsx

// OpenGraph
import type { Metadata } from "next";
// Document
import { getDocument } from "@/lib/docs/docs";
import type { Document, Article, Namespace } from "@/lib/docs/docs";
// Authertication, ACLs
import { getSessionUser } from "@/lib/auth";
import { getRudByAcl } from "@/lib/docs/acl";
import Forbidden from "@/components/Forbidden";
// Document Views
import ArticleView from "./ArticleView";
import NamespaceView from "./NamespaceView";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/** OpenGraph */
function buildOgURL(text: string): string {
  const t = encodeURIComponent(text);
  return `/og/${t}?w=1200&h=630&bg=%23ffffff&fg=%23111111`;
}
export async function generateMetadata(
  { params }: { params: { sid: string } }
): Promise<Metadata> {
  const raw = decodeURIComponent(params.sid);
  const sid = raw.includes(":") ? raw : `article:${raw}`;

  const title = `${sid.split(":").slice(1).join(":")} - ${sid.split(":")[0]}`
  const description = `Description of ${sid} in CSE Wiki`;
  const og = buildOgURL(title);

  return {
    title,
    description,
    openGraph: {
      title, description, type: "article",
      images: [{ url: og, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title, description, images: [og],
    },
  };
}

/** Check READ permission for given acl_id. */
async function isReadAllowed(aclId: number | null): Promise<boolean> {
  const userIdx: number | null = (await getSessionUser())?.idx ?? null;
  const rud = await getRudByAcl(aclId, userIdx);
  return !!rud.read;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ sid: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw: string = decodeURIComponent((await params).sid);
  const sid: string = raw.includes(":") ? raw : `article:${raw}`;

  try {
    const doc: Document | null = await getDocument(sid);
    const allowed: boolean = doc?.acl_id ? await isReadAllowed(doc.acl_id) : true;
    const payload = doc ? { ok: true, sid, document: doc } : { ok: false, error: "not_found", sid };

    if (!allowed) {
      return <Forbidden sid={sid} reason="no_read_permission" detail={{ acl_id: doc?.acl_id }} />;
    } else if ((await searchParams)?.view === "raw") {
      return <pre style={{ padding: 24 }}>{JSON.stringify(payload, null, 2)}</pre>;
    } else if (sid.startsWith("article:")) {
      return <ArticleView article={doc as Article | null} sid={sid} />;
    } else if (sid.startsWith("namespace:")) {
      return <NamespaceView namespace={doc as Namespace | null} sid={sid} />;
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
