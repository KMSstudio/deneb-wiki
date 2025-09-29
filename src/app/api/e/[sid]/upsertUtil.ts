// /app/api/e/[sid]/upsertUtil.ts
export type DocType = "article" | "namespace" | "user" | "group" | "image" | "file";

const ALLOWED: DocType[] = ["article", "namespace", "user", "group", "image", "file"];

export function parseSid(sid: string): { type: DocType; name: string } | null {
  if (!sid || !sid.includes(":")) return null;
  const [type, ...rest] = sid.split(":");
  const name = rest.join(":").trim();
  if (!name) return null;
  if (!(ALLOWED as string[]).includes(type)) return null;
  return { type: type as DocType, name };
}

// --- ACL (stub) ---
export type RUD = "111" | "110" | "101" | "011" | "100" | "010" | "001" | "000";

export async function getRudByAcl(acl_id: number, user_idx: number): Promise<RUD> {
  // TODO: 실제 ACL 로직으로 교체
  return "111";
}
export function hasUpdate(rud: RUD) { return rud[1] === "1"; }

// --- Upsert (DB stub 포함) ---
export type UpsertInput = { sid: string; doc?: any | null };
export type UpsertedDoc = {
  sid: string; type: DocType; name: string; data: any; updatedAt: string
};

// TODO: 실제 DB upsert로 교체
async function dbUpsertDocument(doc: UpsertedDoc): Promise<UpsertedDoc> { return doc; }

export async function handleDocumentUpsert(input: UpsertInput): Promise<UpsertedDoc> {
  const parsed = parseSid(input.sid);
  if (!parsed) throw new Error("invalid_sid");
  const upserted: UpsertedDoc = {
    sid: input.sid,
    type: parsed.type,
    name: parsed.name,
    data: input.doc ?? {},
    updatedAt: new Date().toISOString(),
  };
  return dbUpsertDocument(upserted);
}
