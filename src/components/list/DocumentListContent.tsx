// @/components/list/DocumentListContent.tsx

"use client";

import { useMemo, useState } from "react";
import { typeOf, displayOf } from "@/lib/docs/sid"
import Link from "next/link";
import s from "@/styles/list/documentlist.module.css";

export type ListEntry = {
  key: string;
  href: string;
  sid: string;
  meta?: string;
  right?: React.ReactNode;
};

type Props = {
  entries: ListEntry[];
  pageSize?: number;
  className?: string;
  ariaLabel?: string;
};

/**
 * Client-side paginated document list.
 * Layout mirrors NamespaceViewList:
 * [doctype]  (displaySid)  ..........  meta  right
 */
export default function DocumentListContent({
  entries,
  pageSize = 144,
  className,
  ariaLabel = "Document list",
}: Props) {
  const [page, setPage] = useState(1);
  const total = Math.max(1, Math.ceil(entries.length / pageSize));

  // Current page slice
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return entries.slice(start, start + pageSize);
  }, [entries, page, pageSize]);

  // Pager helpers
  const goto = (n: number) => setPage(Math.min(Math.max(1, n), total));
  const prev = () => goto(page - 1);
  const next = () => goto(page + 1);

  const wrapCls = [s.dlListWrap, className].filter(Boolean).join(" ");

  return (
    <section className={wrapCls} aria-label={ariaLabel}>
      {/* === LIST === */}
      <ul className={s.dlListPage}>
        {pageItems.map((it) => {
          const type = typeOf(it.sid);
          const disp = displayOf(it.sid);
          return (
            <li key={it.key} className={s.dlItem}>
              <span className={s.dlType}>[{type}]</span>
              <Link className={s.dlLink} href={it.href}>
                {disp}
              </Link>
              {it.meta && <small className={s.dlMeta}>{it.meta}</small>}
              {it.right && <div className={s.dlRight}>{it.right}</div>}
            </li>
          );
        })}
        {pageItems.length === 0 && <li className={s.dlItem}>No items to display.</li>}
      </ul>

      {/* === PAGER === */}
      {total > 1 && (
        <nav className={s.dlPager} aria-label="Pagination">
          <button
            className={s.dlPagerBtn + (page <= 1 ? ` ${s.isDisabled}` : "")}
            onClick={prev}
            disabled={page <= 1}
          >
            Prev
          </button>

          <span className={s.dlPagerPages}>
            {Array.from({ length: total }, (_, i) => {
              const n = i + 1;
              const active = n === page;
              return (
                <button
                  key={n}
                  className={s.dlPagerNum + (active ? ` ${s.isActive}` : "")}
                  aria-current={active ? "page" : undefined}
                  onClick={() => goto(n)}
                >
                  {n}
                </button>
              );
            })}
          </span>

          <button
            className={s.dlPagerBtn + (page >= total ? ` ${s.isDisabled}` : "")}
            onClick={next}
            disabled={page >= total}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
