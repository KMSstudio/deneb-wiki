// @/lib/content.ts

import { marked } from "marked";
import { JSDOM } from "jsdom";

/**
 * Extract unique document SIDs referenced in Markdown content.
 * Handles both "/w/..." links and empty links "[sid]()".
 * Ensures all results are normalized to "type:name" form.
 */
export async function extractRefsFromArticle(contentMd: string): Promise<string[]> {
  const html: string = await marked(contentMd);
  const dom = new JSDOM(html);
  const anchors = dom.window.document.querySelectorAll("a[href], link[href]");

  const refs: string[] = [];

  anchors.forEach((el) => {
    const href = el.getAttribute("href") || "";
    const text = el.textContent?.trim() ?? "";

    // case 1: href="/w/..."
    if (href.startsWith("/w/")) {
      let raw = href.slice(3);
      if (raw.endsWith("/")) raw = raw.slice(0, -1);
      try {
        raw = decodeURIComponent(raw);
      } catch {}
      raw = raw.replace(/\+/g, " ").normalize("NFC").trim();
      if (raw) refs.push(raw.includes(":") ? raw : `article:${raw}`);
      return;
    }

    // case 2: empty link [something]()
    if (href === "" && text) {
      const raw = text.normalize("NFC").trim();
      if (raw === "toc" || raw === "목차") return;
      if (raw) refs.push(raw.includes(":") ? raw : `article:${raw}`);
      return;
    }
  });

  return Array.from(new Set(refs));
}

/**
 * Convert markdown into HTML, extract h1-h4 headings,
 * and return a serialized Table of Contents as an HTML fragment.
 *
 * @param contentMd - Raw markdown content
 * @returns HTML fragment containing the table of contents
 */
export async function extractTocFromArticle(contentMd: string): Promise<string> {
  const html = await marked(contentMd);
  const dom = new JSDOM(html);
  const headings = dom.window.document.querySelectorAll("h1, h2, h3, h4");

  const tocItems: string[] = [];
  headings.forEach((h) => {
    const level = h.tagName.toLowerCase();
    const text = h.textContent?.trim() ?? "";
    if (text) {
      tocItems.push(`<li class="${level}">${text}</li>`);
    }
  });
  return `<ul class="toc">${tocItems.join("")}</ul>`;
}

/**
 * Replace placeholder patterns in article markdown content.
 *
 * 1. Replaces `[toc]()` or `[목차]()` with provided HTML Table of Contents.
 * 2. Converts `[something]()` into `[something](/w/something)` form.
 *    - If "something" has no type prefix, assume "article:something".
 *    - e.g. `[intro]()` → `[intro](/w/article:intro)`
 *           `[user:admin]()` → `[admin](/w/user:admin)`
 *
 * @param {string} contentMd - Raw markdown content possibly containing placeholders.
 * @param {string} tocHtml - HTML fragment to replace `[toc]()` or `[목차]()`.
 * @returns {string} Processed markdown with placeholders replaced.
 */
export function makeArticleContent(contentMd: string, tocHtml: string): string {
  let result = contentMd;

  result = result.replace(/\[(?:toc|목차)\]\(\)/gi, tocHtml);

  result = result.replace(/\[([^\[\]\(\)]+)\]\(\)/g, (_match, raw) => {
    const sid = raw.includes(":") ? raw : `article:${raw}`;
    return `[${raw}](/w/${sid})`;
  });

  return result;
}
