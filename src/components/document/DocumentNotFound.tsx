// @/components/document/DocumentNotFound.tsx
import Link from "next/link";
import s from "@/styles/document/document.module.css";

type Props={sid:string; className?:string};

const displayOf=(sid:string)=>sid.startsWith("article:")?sid.slice("article:".length):sid;

export default function DocumentNotFound({sid,className}:Props){
  const display=displayOf(sid);
  const cls=[s.notfound,className].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <p>문서가 없습니다.</p>
      <p><Link href={`/e/${encodeURIComponent(display)}`}>새 문서 만들기 →</Link></p>
    </div>
  );
}
