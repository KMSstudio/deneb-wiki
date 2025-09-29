import { NextResponse } from "next/server";
import { getDocumentBySid, setDocument, type DocType } from "@/lib/docs";
import type { EditResponse } from "@/types/api";
import { buildArticleSetDocument } from "./types/article";

// ACL bitmask type
export type RUD = number; // 0~7 (binary R U D)
export async function getRudByAcl(_acl_id: number, _user_idx: number): Promise<RUD> { return 7; }

// check permission
export function hasUpdate(mask: RUD): boolean { return (mask & 0b010) !== 0; }
export function hasRead(mask: RUD): boolean { return (mask & 0b100) !== 0; }
export function hasDelete(mask: RUD): boolean { return (mask & 0b001) !== 0; }

const ALLOWED: DocType[] = ["article","namespace","user","group","image","file","acl"];

function parseSidStrict(sid: string): { type: DocType; name: string } | null {
  if (!sid || !sid.includes(":")) return null;
  const [t, ...rest] = sid.split(":");
  const name = rest.join(":").trim();
  if (!name) return null;
  if (!(ALLOWED as string[]).includes(t)) return null;
  return { type: t as DocType, name };
}

export async function POST(
  req: Request,
  { params }: { params: { sid: string } }
): Promise<NextResponse<EditResponse>> {
  const sid = decodeURIComponent(params.sid ?? "");
  const parsed = parseSidStrict(sid);

  if (!parsed) {
    const t = sid.split(":")[0] ?? "";
    const isType = !!t && (ALLOWED as string[]).includes(t);
    const error = isType ? "invalid_sid" : "unsupported_type";
    return NextResponse.json({ ok: false, error, sid }, { status: 400 }) as NextResponse<EditResponse>;
  }

  try {
    const body = await req.json().catch(() => ({} as any));
    const user_idx: number = Number(body?.user_idx ?? 0);

    // Check existing doc's ACL only when doc already exists and acl_id is set.
    const current = await getDocumentBySid(sid);
    if (current && current.sid === sid) {
      const acl_id = (current as any)?.acl_id ?? null;
      if (acl_id !== null) {
        const rud = await getRudByAcl(acl_id, user_idx);
        if (!hasUpdate(rud)) {
          return NextResponse.json(
            { ok: false, error: "no_update_permission", sid, acl_id, rud },
            { status: 403 }
          ) as NextResponse<EditResponse>;
        }
      } // else: noop (default ACL later)
    } // else: noop (new doc default ACL later)

    // Build minimal SetDocument per type
    let setInput:
      | Awaited<ReturnType<typeof buildArticleSetDocument>>
      | null = null;

    switch (parsed.type) {
      case "article":
        setInput = await buildArticleSetDocument(sid, {
          content_md: body?.content_md ?? "",
          table_of_content: body?.table_of_content ?? "",
        });
        break;

      default:
        return NextResponse.json(
          { ok: false, error: "unsupported_type", sid },
          { status: 400 }
        ) as NextResponse<EditResponse>;
    }

    // Upsert (single source of truth)
    await setDocument(setInput!);

    return NextResponse.json(
      { ok: true, action: current ? "updated" : "created", sid },
      { status: 200 }
    ) as NextResponse<EditResponse>;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "db_error", sid, message: String(err?.message ?? err) },
      { status: 500 }
    ) as NextResponse<EditResponse>;
  }
}
