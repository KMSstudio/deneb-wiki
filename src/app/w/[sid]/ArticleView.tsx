// @/app/w/[sid]/ArticleView.tsx

import type { Article } from "@/lib/docs/docs";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import "@/styles/document/article.css";
import { makeArticleContent } from "@/lib/docs/article";

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
            <Link href={`/e/${encodeURIComponent(sid.replace(/^article:/, ""))}`}>
              새 문서 만들기 →
            </Link>
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="article">
      <ArticleTitle sid={sid} />
      <section className="article-content">
        <Markdown content={makeArticleContent(article.content_md, article.toc)} />
      </section>
    </article>
  );
}
