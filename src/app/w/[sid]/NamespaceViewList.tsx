// @/app/w/[sid]/NamespaceView.tsx

import Link from "next/link";
import s from "@/styles/document/document.module.css";

type Props = {
  sid: string;
  items: string[];
  currentPage: number;
  pageSize?: number;
  className?: string;
};

const displayOf = (sid: string) => (sid.startsWith("article:") ? sid.slice(8) : sid);
const typeOf = (sid: string) => sid.split(":")[0];

export default function NamespaceViewList({
  sid, items, currentPage, pageSize = 144, className,
}: Props) {
  const total = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, currentPage), total);
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const cls = [s.nsListWrap, className].filter(Boolean).join(" ");

  return (
    <section className={cls}>
      <ul className={s.nsListPage}>
        {pageItems.map((docSid) => (
          <li key={docSid} className={s.nsItem}>
            <span className={s.nsType}>[{typeOf(docSid)}]</span>
            <Link className={s.nsLink} href={`/w/${encodeURIComponent(docSid)}`}>
              {displayOf(docSid)}
            </Link>
          </li>
        ))}
      </ul>

      {total > 1 && (
        <nav className={s.nsPager} aria-label="페이지네이션">
          <Link
            className={s.nsPagerBtn + (page <= 1 ? ` ${s.isDisabled}` : "")}
            href={{ pathname: `/w/${encodeURIComponent(sid)}`, query: { p: page - 1 } }}
            aria-disabled={page <= 1}
            prefetch={false}
          >
            이전
          </Link>

          <span className={s.nsPagerPages}>
            {Array.from({ length: total }, (_, i) => {
              const n = i + 1;
              const current = n === page;
              return (
                <Link
                  key={n}
                  className={s.nsPagerNum + (current ? ` ${s.isActive}` : "")}
                  href={{ pathname: `/w/${encodeURIComponent(sid)}`, query: { p: n } }}
                  aria-current={current ? "page" : undefined}
                  prefetch={false}
                >
                  {n}
                </Link>
              );
            })}
          </span>

          <Link
            className={s.nsPagerBtn + (page >= total ? ` ${s.isDisabled}` : "")}
            href={{ pathname: `/w/${encodeURIComponent(sid)}`, query: { p: page + 1 } }}
            aria-disabled={page >= total}
            prefetch={false}
          >
            다음
          </Link>
        </nav>
      )}
    </section>
  );
}
