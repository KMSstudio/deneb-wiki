// @/components/Markdown.tsx

"use client";

// React
import React, { useEffect, useRef } from "react";
import type { JSX } from "react";
// Markdown core
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
// Remark
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
// Rehype
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
// Utilities / Types
import { visit } from "unist-util-visit";

// Styles
import "katex/dist/katex.min.css";
import "github-markdown-css/github-markdown.css";
import "highlight.js/styles/github-dark.css";
import styles from "./markdown.module.css";

/** Props for the Markdown renderer component. */
type MarkdownProps = { content: string; className?: string };

/**
 * Rehype plugin that normalizes `user-content-` prefixes on `id`/`name`.
 *
 * It removes all leading occurrences of the `user-content-` prefix before
 * sanitize runs, ensuring sanitize's clobber behavior adds the prefix exactly once.
 *
 * @returns {(tree: any) => void} A rehype transform function.
 */
function rehypeNormalizeUserContentPrefix() {
  const stripAll = (v: string) => v.replace(/^(user-content-)+/, "");
  return (tree: any) => {
    visit(tree, "element", (node: any) => {
      const props = node?.properties || {};
      if (typeof props.id === "string") props.id = stripAll(props.id);
      if (typeof props.name === "string") props.name = stripAll(props.name);
    });
  };
}

/**
 * Rehype-sanitize schema allowing attributes needed by anchors, highlighting, and KaTeX.
 * Keeps default clobber behavior so sanitize appends the `user-content-` prefix once.
 *
 * @see https://github.com/syntax-tree/hast-util-sanitize
 */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] || []), "id", "className"],
    a: [...(defaultSchema.attributes?.a || []), ["href", "name"]],
    ol: [...(defaultSchema.attributes?.ol || []), ["className"]],
    li: [...(defaultSchema.attributes?.li || []), ["className"]],
    sup: [...(defaultSchema.attributes?.sup || []), ["className"]],
    div: [...(defaultSchema.attributes?.div || []), ["className"]],
    span: [...(defaultSchema.attributes?.span || []), ["className"]],
  },
};

/** Escapes a string for safe use in a CSS `#id` selector. */
const esc = (s: string): string =>
  (CSS as any)?.escape ? (CSS as any).escape(s) : s.replace(/([ !"#$%&'()*+,./:;<=>?@\[\\\]^`{|}~])/g, "\\$1");

/** Smoothly scrolls the container (or document) to the element matching the given hash id. */
const scrollToId = (root: HTMLElement | Document | null, rawId: string): void => {
  if (!root || !rawId) return;
  const el = (root as any).querySelector?.(`#${esc(rawId)}`) as HTMLElement | null;
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

/**
 * Factory for the `<a>` renderer used by `react-markdown`.
 *
 * - Hash links (`href` starting with `#`) scroll smoothly within the provided root.
 * - Other links open in a new tab with `noopener noreferrer`.
 *
 * @param {() => HTMLElement | Document | null} getRoot - Lazy accessor for the scroll/search root.
 * @returns {Components["a"]} A custom anchor renderer.
 */
const makeAnchor = (getRoot: () => HTMLElement | Document | null): Components["a"] =>
  function MarkdownAnchor({ href, ...props }) {
    if (!href || !href.startsWith("#")) {
      return <a {...props} href={href} target="_blank" rel="noopener noreferrer" />;
    }
    const id = href.slice(1);
    const onClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
      e.preventDefault();
      scrollToId(getRoot(), id);
      history.replaceState(null, "", href);
    };
    return <a {...props} href={href} onClick={onClick} />;
  };

/**
 * Markdown renderer component.
 *
 * Features:
 * - GFM tables/task lists
 * - Inline and block math via KaTeX
 * - Syntax highlighting via highlight.js
 * - Safe raw HTML via rehype-sanitize
 * - Smooth in-container scrolling to hash anchors (e.g., footnotes/headings)
 *
 * @param {MarkdownProps} props - Component props.
 * @returns {JSX.Element} Rendered markdown.
 */
export default function Markdown({ content, className }: MarkdownProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const go = () => {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const id = hash.startsWith("#") ? hash.slice(1) : "";
      if (id) scrollToId(ref.current ?? document, id);
    };
    // Scroll on initial load if hash exists
    go();
    // Scroll on in-page hash changes
    const onHash = () => go();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [content]);

  return (
    <div ref={ref} className={`${styles.markdownRoot} ${className ?? "markdown-body"}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          rehypeNormalizeUserContentPrefix,
          [rehypeSanitize, schema],
          [rehypeKatex, { throwOnError: false, strict: "warn" }],
          [rehypeHighlight, { ignoreMissing: true }],
        ]}
        components={{ a: makeAnchor(() => ref.current ?? document) }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
