// @/app/w/[sid]/ArticleView.tsx

// Markdown Render
import Markdown from "@/components/Markdown";
// Article
import type { Article } from "@/lib/docs/docs";
import { makeArticleContent } from "@/lib/docs/article";
// Document Components
import DocumentTitle from "@/components/document/DocumentTitle";
import DocumentNotFound from "@/components/document/DocumentNotFound";
// Style
import "@/styles/document/article.css";

export default async function ArticleView({ article, sid }: { article: Article | null; sid: string }) {
  if (!article) {
    return (
      <article className="documentview-container">
        <DocumentTitle sid={sid} />
        <DocumentNotFound sid={sid} />
      </article>
    );
  }

  return (
    <article className="documentview-container">
      <DocumentTitle sid={sid} />
      <section className="article-content">
        <Markdown content={makeArticleContent(article.content_md, article.toc)} />
      </section>
    </article>
  );
}
