// @/components/list/DocumentListTitle.tsx

import s from "@/styles/list/documentlist.module.css";

type Props = {
  title: string;
  total?: number;
  right?: React.ReactNode;
  className?: string;
};

export default function DocumentListTitle({ title, total, right, className }: Props) {
  const cls = [s.listTitle, className].filter(Boolean).join(" ");
  return (
    <header className={cls}>
      <h1 className={s.listH1}>{title}</h1>
      <div className={s.listMeta}>
        {typeof total === "number" && <span className={s.listCount}>총 {total}건</span>}
        {right && <nav className={s.listActions} aria-label="목록 작업">{right}</nav>}
      </div>
    </header>
  );
}
