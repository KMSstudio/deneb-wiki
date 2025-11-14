// @/lib/docs/sid.ts

import type { DocType } from "@/lib/docs/docs";

/**
 * SID 정렬 우선순위(타입).
 * 앞에 있을수록 우선.
 */
export const ORDER = ["namespace", "article", "group", "user", "acl"] as DocType[];

/**
 * SID에서 타입(prefix)을 추출한다.
 * 미지 타입이면 "article"로 간주.
 * @param sid SID 문자열("type:name")
 * @returns DocType
 */
export const typeOf = (sid: string): DocType => {
  const t = sid.split(":")[0] as DocType;
  return (ORDER as readonly string[]).includes(t) ? t : "article";
};

/**
 * SID에서 이름(name)을 추출한다.
 * ":"가 없으면 원문 반환.
 * @param sid SID 문자열
 * @returns name 문자열
 */
export const nameOf = (sid: string): string => {
  const i = sid.indexOf(":");
  return i >= 0 ? sid.slice(i + 1) : sid;
};

/**
 * 표시용 라벨을 반환한다.
 * "article:" 접두사만 숨긴다.
 * @param sid SID 문자열
 * @returns 표시 문자열
 */
export const displayOf = (sid: string): string => {
  return sid.startsWith("article:") ? sid.slice("article:".length) : sid;
};

/**
 * 타입과 이름으로 SID를 생성/정규화한다.
 * - name이 "type:name"이면 그대로 검증 후 반환
 * - 허용 타입(ORDER) 이외면 null
 * - 빈 name은 null
 * @param type 타입 문자열
 * @param name 이름 또는 "type:name"
 * @returns "type:name" 또는 null
 */
export const buildSid = (type: string, name: string): string | null => {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const idx = trimmed.indexOf(":");
    const prefix = trimmed.slice(0, idx);
    const rest = trimmed.slice(idx + 1);
    if (!rest) return null;
    if (!(ORDER as readonly string[]).includes(prefix)) return null;
    return trimmed;
  }
  const t = (type || "").trim();
  if (!(ORDER as readonly string[]).includes(t)) return null;
  return `${t}:${trimmed}`;
};

/**
 * SID 비교자.
 * @param a SID
 * @param b SID
 * @returns Array.prototype.sort 규약
 */
export const compareSid = (a: string, b: string): number => {
  const ta = typeOf(a),
    tb = typeOf(b);
  const ia = ORDER.indexOf(ta),
    ib = ORDER.indexOf(tb);
  if (ia !== ib) return ia - ib;
  const da = displayOf(a).toLocaleLowerCase();
  const db = displayOf(b).toLocaleLowerCase();
  if (da < db) return -1;
  if (da > db) return 1;
  return 0;
};

/**
 * SID 배열을 compareSid로 정렬한 새 배열을 반환.
 * @param sids SID 배열
 * @returns 정렬된 새 배열
 */
export const sortSids = (sids: string[]): string[] => [...sids].sort(compareSid);
