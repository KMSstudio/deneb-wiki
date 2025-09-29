import type { SetArticle } from "@/lib/docs";
import { extractDocRefsFromContent } from "@/lib/content";

export async function buildArticleSetDocument(
  sid: string,
  body: { content_md: string; table_of_content?: string }
): Promise<SetArticle> {
  const name = sid.split(":")[1] ?? "";
  const content_md = body?.content_md ?? "";
  const table_of_content = body?.table_of_content ?? "";
  const refs = await extractDocRefsFromContent(content_md);

  return {
    type: "article",
    name,
    refs,
    content_md,
    table_of_content,
  };
}
