"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";

import "katex/dist/katex.min.css";
import "github-markdown-css/github-markdown.css";
import "highlight.js/styles/github-dark.css";
import styles from "./markdown.module.css";

type MarkdownProps = {
  content: string;
  className?: string;
};

export default function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={`${className ?? "markdown-body"} ${styles.markdown}`}>
      <ReactMarkdown
        // GFM + LaTeX
        remarkPlugins={[remarkGfm, remarkMath]}
        // raw HTML allow + ban XSS + KaTeX render
        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex, rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
