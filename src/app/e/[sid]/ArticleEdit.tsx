// @/app/e/[sid]/ArticleEdit.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Article } from "@/lib/docs";
import "@/styles/document/article.css";

export default function ArticleEdit({
  sid,
  article,
}: {
  sid: string;
  article: Article | null;
}) {
  const [content, setContent] = useState(article?.content_md || "");
  const [toc, setToc] = useState(article?.table_of_content || "");
  const [status, setStatus] = useState<null | string>(null);
  const router = useRouter();

  async function handleSave() {
    try {
      const res = await fetch(`/api/e/${encodeURIComponent(sid)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_md: content, table_of_content: toc }),
      });

      if (res.ok) {
        router.push(`/w/${encodeURIComponent(sid.replace(/^article:/, ""))}`);
        return;
      }

      const data = await res.json();
      setStatus(JSON.stringify(data, null, 2));
    } catch (err) {
      setStatus(String(err));
    }
  }

  return (
    <div className="article">
      <h1 className="article-title">✏️ Edit {sid}</h1>

      <textarea
        className="article-edit_textarea article-edit_content"
        placeholder="Content (Markdown)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <textarea
        className="article-edit_textarea article-edit_toc"
        placeholder="Table of Contents (HTML)"
        value={toc}
        onChange={(e) => setToc(e.target.value)}
      />

      <button className="article-edit_save" onClick={handleSave}>
        Save
      </button>

      {status && <pre className="article-edit_status">{status}</pre>}
    </div>
  );
}
