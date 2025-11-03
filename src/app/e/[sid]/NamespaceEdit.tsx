"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Namespace } from "@/lib/docs/docs";
import DocumentTitle from "@/components/document/DocumentTitle";
import s from "@/styles/document/document.module.css";

type Props = { sid: string; namespace: Namespace | null };

// helpers
const displayOf = (sid: string) => sid.split(":").slice(1).join(":");
const typeOf = (sid: string) => sid.split(":")[0] || "article";
const buildSid = (type: string, name: string) => {
  const trimmed = (name || "").trim();
  console.log(`trimmed: ${trimmed}`)
  if (!trimmed) return "";
  if (trimmed.includes(":")) return trimmed;
  return `${type.trim()}:${trimmed}`;
};

const ORDER = ["namespace", "article", "group", "user", "acl"] as Array<string>;
type SaveOk = { ok: true; [k: string]: unknown };
type SaveErr = { ok: false; error: string; message?: string; [k: string]: unknown };
type SaveStatus = SaveOk | SaveErr | null;

// UI
export default function NamespaceEdit({ sid, namespace }: Props) {
  const router = useRouter();

  const [items, setItems] = useState<string[]>(() => namespace?.refs ?? []);
  const [type, setType] = useState<string>("article");
  const [name, setName] = useState<string>("");
  const [status, setStatus] = useState<SaveStatus>(null);
  const [saving, setSaving] = useState(false);

  const sortedPreview = useMemo(() => {
    return [...items].sort((a, b) => {
      const ia = ORDER.indexOf(typeOf(a) as typeof ORDER[number]);
      const ib = ORDER.indexOf(typeOf(b) as typeof ORDER[number]);
      if (ia !== ib) return ia - ib;
      const da = displayOf(a).toLocaleLowerCase();
      const db = displayOf(b).toLocaleLowerCase();
      if (da < db) return -1;
      if (da > db) return 1;
      return 0;
    });
  }, [items]);

  const onAdd = () => {
    const candidate = buildSid(type, name);
    if (!candidate || !candidate.includes(":")) return;
    if (items.includes(candidate)) { setName(""); return; }
    if (!ORDER.includes(typeOf(candidate))) { setName(""); return; }
    setItems(prev => [...prev, candidate]);
    setName("");
  };

  const onRemove = (target: string) => {
    setItems(prev => prev.filter(x => x !== target));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); onAdd(); }
  };

  const onSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/e/${encodeURIComponent(sid)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refs: items }),
      });
      const js = (await res.json().catch(() => ({}))) as SaveOk | SaveErr;
      setStatus(js);
      if (res.ok && js && js.ok) router.push(`/w/${encodeURIComponent(sid)}`);
    } catch (err) {
      setStatus({ ok: false, error: "network_error", message: (err as Error)?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="article">
      <DocumentTitle sid={sid} />

      <section className={s.nsEditWrap}>
        {/* Add new document */}
        <div className={s.nsEditRow}>
          <label className={s.nsEditLabel}>추가</label>
          <select
            className={s.nsEditSelect}
            value={type}
            onChange={(e)=>setType(e.target.value)}
          >
            <option value="article">article</option>
            <option value="namespace">namespace</option>
            <option value="group">group</option>
            <option value="user">user</option>
            <option value="acl">acl</option>
          </select>
          <span className={s.nsEditColon}>:</span>
          <input
            className={s.nsEditInput}
            placeholder="문서 이름 (또는 'type:name' 그대로 입력)"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button className={s.nsEditBtn} onClick={onAdd}>추가</button>
        </div>

        {/* Edit List */}
        <ul className={s.nsEditList}>
          {sortedPreview.map((x) => (
            <li key={x} className={s.nsEditItem}>
              <span className={s.nsEditType}>[{typeOf(x)}]</span>
              <Link className={s.nsEditLink} href={`/w/${encodeURIComponent(x)}`}>
                {displayOf(x)}
              </Link>
              <button className={s.nsEditDel} onClick={()=>onRemove(x)}>삭제</button>
            </li>
          ))}
          {sortedPreview.length === 0 && (
            <li className={s.nsEditEmpty}>연결된 문서가 없습니다.</li>
          )}
        </ul>

        {/* 저장 */}
        <div className={s.nsEditActions}>
          <button className={s.nsEditSave} onClick={onSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
          {status !== null ? (
            <pre className={s.nsEditStatus}>{JSON.stringify(status, null, 2)}</pre>
          ) : null}
        </div>
      </section>
    </article>
  );
}
