// @/lib/content.ts

import { marked } from "marked";
import { JSDOM } from "jsdom";

/**
 * Extract unique document SIDs referenced in Markdown content.
 * Finds links whose href starts with "/w/" and normalizes them to "type:name".
 */
export async function extractRefsFromArticle(contentMd: string): Promise<string[]> {
  const html: string = await marked(contentMd);
  const dom = new JSDOM(html);
  const anchors = dom.window.document.querySelectorAll("a[href], link[href]");

  const toSid = (href: string): string | null => {
    let url: URL;
    try {
      url = new URL(href, "http://localhost");
    } catch {
      return null;
    }
    if (!url.pathname.startsWith("/w/")) return null;

    let raw = url.pathname.slice(3);
    if (raw.endsWith("/")) raw = raw.slice(0, -1);

    try {
      raw = decodeURIComponent(raw);
    } catch {}
    raw = raw.replace(/\+/g, " ").normalize("NFC").trim();
    if (!raw) return null;

    return raw.includes(":") ? raw : `article:${raw}`;
  };

  const refs: string[] = [];
  anchors.forEach((el) => {
    const href = el.getAttribute("href");
    if (!href) return;
    const sid = toSid(href);
    if (sid) refs.push(sid);
  });

  return Array.from(new Set(refs));
}

/**
 * Convert markdown into HTML, extract h1–h4 headings,
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
 * This function performs two preprocessing steps on a given Markdown string:
 *  1. Replaces `[toc]()` or `[목차]()` with the provided HTML Table of Contents.
 *  2. Converts `[sid]()` or `[article:sid]()` into `[sid](/w/sid)` form,
 *     ensuring that links point to the proper wiki path.
 *
 * @param {string} contentMd - Raw markdown content that may contain `[toc]()` or `[sid]()`.
 * @param {string} tocHtml - HTML fragment to insert in place of `[toc]()` or `[목차]()`.
 * @returns {string} Processed markdown string with placeholders replaced.
 */
export function makeArticleContent(contentMd: string, tocHtml: string): string {
  let result = contentMd;

  result = result.replace(/\[(?:toc|목차)\]\(\)/gi, tocHtml);

  result = result.replace(
    /\[([^\[\]\(\):]+|article:[^\[\]\(\):]+)\]\(\)/g,
    (_match, sid) => {
      const name = sid.startsWith("article:") ? sid.slice(8) : sid;
      return `[${name}](/w/${sid})`;
    }
  );

  return result;
}
