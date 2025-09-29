// @/lib/content.ts

import { marked } from "marked";
import { JSDOM } from "jsdom";

/**
 * Extract unique document SIDs referenced in Markdown content.
 * Finds links whose href starts with "/w/" and normalizes them to "type:name".
 */
export async function extractDocRefsFromContent(contentMd: string): Promise<string[]> {
  const html: string = await marked(contentMd);
  const dom = new JSDOM(html);
  const anchors = dom.window.document.querySelectorAll("a[href], link[href]");

  const toSid = (href: string): string | null => {
    let url: URL;
    try { url = new URL(href, "http://localhost"); } catch { return null; }
    if (!url.pathname.startsWith("/w/")) return null;

    let raw = url.pathname.slice(3);
    if (raw.endsWith("/")) raw = raw.slice(0, -1);

    try { raw = decodeURIComponent(raw); } catch {}
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
 * @param markdown - Raw markdown content
 * @returns HTML fragment containing the table of contents
 */
export async function extractTableOfContents(markdown: string): Promise<string> {
  const html = await marked(markdown);
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