// @/app/w/[sid]/ArticleView.tsx
import type { Article } from "@/lib/docs";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import "@/styles/document/article.css";

export function ArticleTitle({ sid }: { sid: string }) {
  const display = sid.replace(/^article:/, "");

  return (
    <header className="article-title">
      <h1>{display}</h1>
      <nav className="article-title_buttons">
        <Link href={`/e/${encodeURIComponent(display)}`}>✏️ 편집</Link>
        <Link href={`/hist/${encodeURIComponent(display)}`}>📜 역사</Link>
      </nav>
    </header>
  );
}

export default async function ArticleView({
  article,
  sid,
}: {
  article: Article | null;
  sid: string;
}) {
  if (!article) {
    return (
      <article className="article">
        <ArticleTitle sid={sid} />
        <div className="article-notfound">
          <p>문서가 없습니다.</p>
          <p>
            <Link href={`/e/${encodeURIComponent(sid.replace(/^article:/, ""))}`}>새 문서 만들기 →</Link>
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="article">
      <ArticleTitle sid={sid} />

      {article.table_of_content && (
        <section className="article-toc">
          <div dangerouslySetInnerHTML={{ __html: article.table_of_content }} />
        </section>
      )}

      <section className="article-content">
        <Markdown content={article.content_md} />
      </section>
    </article>
  );
}
