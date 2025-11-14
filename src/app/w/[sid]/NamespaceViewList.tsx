// @/app/w/[sid]/NamespaceViewList.tsx

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import s from "@/styles/document/namespace.module.css";

type Props = {
  sid: string;
  items: string[];
  pageSize?: number; // default: 144
  className?: string;
};

const displayOf = (sid: string) => (sid.startsWith("article:") ? sid.slice(8) : sid);
const typeOf = (sid: string) => sid.split(":")[0];

/**
 * Client-side paginated namespace list.
 * Renders a compact, one-line-per-item list of SIDs with in-place pagination controls.
 */
export default function NamespaceListView({ /* sid, */ items, pageSize = 144, className }: Props) {
  const [page, setPage] = useState(1);
  const total = Math.max(1, Math.ceil(items.length / pageSize));

  // Slice items for current page
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  // Page navigation helpers
  const goto = (n: number) => setPage(Math.min(Math.max(1, n), total));
  const prev = () => goto(page - 1);
  const next = () => goto(page + 1);

  const wrapCls = [s.nsListWrap, className].filter(Boolean).join(" ");

  return (
    <section className={wrapCls} aria-label="Namespace documents">
      {/* === LIST: current page items === */}
      <ul className={s.nsListPage}>
        {pageItems.map((docSid) => (
          <li key={docSid} className={s.nsItem}>
            <span className={s.nsType}>[{typeOf(docSid)}]</span>
            <Link className={s.nsLink} href={`/w/${encodeURIComponent(docSid)}`}>
              {displayOf(docSid)}
            </Link>
          </li>
        ))}
        {pageItems.length === 0 && <li className={s.nsItem}>No items to display.</li>}
      </ul>

      {/* === PAGER: only when multiple pages exist === */}
      {total > 1 && (
        <nav className={s.nsPager} aria-label="Pagination">
          <button className={s.nsPagerBtn + (page <= 1 ? ` ${s.isDisabled}` : "")} onClick={prev} disabled={page <= 1}>
            Prev
          </button>

          <span className={s.nsPagerPages}>
            {Array.from({ length: total }, (_, i) => {
              const n = i + 1;
              const active = n === page;
              return (
                <button
                  key={n}
                  className={s.nsPagerNum + (active ? ` ${s.isActive}` : "")}
                  aria-current={active ? "page" : undefined}
                  onClick={() => goto(n)}
                >
                  {n}
                </button>
              );
            })}
          </span>

          <button className={s.nsPagerBtn + (page >= total ? ` ${s.isDisabled}` : "")} onClick={next} disabled={page >= total}>
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
