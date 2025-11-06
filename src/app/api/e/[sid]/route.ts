// @/app/api/e/[sid]/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { DocType, SetDocument, SetArticle, SetNamespace, SetdUser, SetdGroup, SetdAcl, SetAclEntry } from "@/lib/docs/docs";
import { parseSid, getDocumentBySid, setDocument } from "@/lib/docs/docs";
import type { EditResponse } from "@/types/api";
import { extractRefsFromArticle, extractTocFromArticle } from "@/lib/docs/article";
import { Rud, getRudByAcl, extractRefsFromAclEntries, extractSetAclEntries } from "@/lib/docs/acl";

function intOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

export async function POST(req: NextRequest, context: { params: Promise<{ sid: string }> }): Promise<NextResponse<EditResponse>> {
  const raw: string = decodeURIComponent((await context.params).sid ?? "");
  const sid: string = raw.includes(":") ? raw : `article:${raw}`;
  const parsed = parseSid(sid);

  if (!parsed) {
    return NextResponse.json({ ok: false, error: "invalid_sid", sid }, { status: 400 }) as NextResponse<EditResponse>;
  }

  try {
    const raw = await req.json().catch(() => ({}));
    const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const user_idx: number = Number(body?.user_idx ?? 0) || 0;

    const current = await getDocumentBySid(sid);
    if (current && current.sid === sid && current.acl_id !== null) {
      const acl_id = current.acl_id;
      const rud: Rud = await getRudByAcl(acl_id, user_idx);
      if (!rud.update) {
        return NextResponse.json(
          {
            ok: false,
            error: "no_update_permission",
            sid,
            acl_id,
            rud: rud.toNumber(),
            rud_str: rud.toString(),
          },
          { status: 403 },
        ) as NextResponse<EditResponse>;
      }
    }

    const acl_id_req = intOrNull(body?.acl_id ?? current?.acl_id);
    const type = parsed.type as DocType;
    const name = parsed.name as string;
    let payload: SetDocument;

    switch (type) {
      case "article": {
        const content_md: string | undefined = typeof body?.content_md === "string" ? body.content_md : undefined;
        let toc: string | undefined = undefined;
        let refs: string[] = [];
        if (content_md !== undefined) {
          [toc, refs] = await Promise.all([extractTocFromArticle(content_md), extractRefsFromArticle(content_md)]);
        }
        payload = {
          type: "article",
          name,
          refs,
          acl_id: acl_id_req,
          content_md,
          toc,
        } as SetArticle;
        break;
      }

      case "namespace": {
        const refs: string[] = Array.isArray(body?.refs) ? body.refs.map((r: any) => String(r)) : [];
        payload = {
          type: "namespace",
          name,
          refs,
          acl_id: acl_id_req,
        } as SetNamespace;
        break;
      }

      case "user": {
        const content_md: string | undefined = typeof body?.content_md === "string" ? body.content_md : undefined;
        let toc: string | undefined = undefined;
        let refs: string[] = [];
        if (content_md !== undefined) {
          [toc, refs] = await Promise.all([extractTocFromArticle(content_md), extractRefsFromArticle(content_md)]);
        }
        const user_idx_req = intOrNull(body?.user_idx_req);
        if (user_idx_req === null) {
          return NextResponse.json({ ok: false, error: "invalid_user_idx_req", sid }, { status: 400 }) as NextResponse<EditResponse>;
        }

        // NOTE: If `current` is `null`, which means the document is `Creating` now,
        //  Check that user_idx_req == user_idx.

        payload = {
          type: "user",
          name,
          refs,
          acl_id: acl_id_req,
          content_md,
          toc,
          user_idx: user_idx_req,
        } as SetdUser;
        break;
      }

      case "group": {
        const content_md: string | undefined = typeof body?.content_md === "string" ? body.content_md : undefined;
        let toc: string | undefined = undefined;
        let refs: string[] = [];
        if (content_md !== undefined) {
          [toc, refs] = await Promise.all([extractTocFromArticle(content_md), extractRefsFromArticle(content_md)]);
        }
        const members: number[] = Array.isArray(body?.members)
          ? body.members.map((m: any) => Number(m)).filter((n: any) => Number.isInteger(n))
          : [];

        payload = {
          type: "group",
          name,
          refs,
          acl_id: acl_id_req,
          content_md,
          toc,
          members,
        } as SetdGroup;
        break;
      }

      case "acl": {
        const entries: SetAclEntry[] = extractSetAclEntries(body?.entries);
        const refs: string[] = extractRefsFromAclEntries(entries);

        payload = {
          type: "acl",
          name,
          refs,
          acl_id: acl_id_req,
          entries,
        } as SetdAcl;
        break;
      }

      default: {
        return NextResponse.json({ ok: false, error: "unsupported_type", sid, type }, { status: 400 }) as NextResponse<EditResponse>;
      }
    }

    const newId = await setDocument(payload);
    const action = current ? "updated" : "created";

    return NextResponse.json({ ok: true, action, sid, id: newId }, { status: 200 }) as NextResponse<EditResponse>;
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "db_error",
        sid,
        message: String(err?.message ?? err),
      },
      { status: 500 },
    ) as NextResponse<EditResponse>;
  }
}
