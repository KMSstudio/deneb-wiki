// @/components/document/DocumentTitle.tsx

import Link from "next/link";
import s from "@/styles/document/document.module.css";

type Props = { sid: string; right?: React.ReactNode; className?: string };

const displayOf = (sid: string) => (sid.startsWith("article:") ? sid.slice("article:".length) : sid);

export default function DocumentTitle({ sid, right, className }: Props) {
  const display = displayOf(sid);
  const cls = [s.title, className].filter(Boolean).join(" ");
  return (
    <header className={cls}>
      <h1 className={s.h1}>{display}</h1>
      <nav className={s.buttons} aria-label="문서 작업">
        <Link href={`/e/${encodeURIComponent(display)}`}>✏️ 편집</Link>
        <Link href={`/hist/${encodeURIComponent(display)}`}>📜 역사</Link>
        {right}
      </nav>
    </header>
  );
}
