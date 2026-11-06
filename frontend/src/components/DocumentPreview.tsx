"use client";

import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { renderContent, type LeadData } from "@/lib/render";
import type { Template } from "@/lib/templates";

interface DocumentPreviewProps {
  template: Template;
  data: LeadData;
}

export type PreviewView = "rendered" | "markdown" | "raw";

marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Live document preview. Non-strict rendering keeps `{{placeholder}}`
 * visible so the user can see what is still missing — exactly like the
 * Python `render(strict=False)` preview — while the styled tab shows how
 * the final Markdown will read.
 */
export default function DocumentPreview({ template, data }: DocumentPreviewProps) {
  const [view, setView] = useState<PreviewView>("rendered");
  const [html, setHtml] = useState("");

  const { markdown, remaining } = useMemo(() => {
    const rendered = renderContent(template.content, data, { strict: false });
    const remainingPlaceholders = [...rendered.matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g)]
      .map((m) => m[1])
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
    return { markdown: rendered, remaining: remainingPlaceholders };
  }, [template.content, data]);

  // DOMPurify needs `window`, so sanitize in an effect after mount.
  // Server prerender shows an empty article; client hydrates it.
  useEffect(() => {
    const rawHtml = marked.parse(markdown, { async: false }) as string;
    setHtml(DOMPurify.sanitize(rawHtml));
  }, [markdown]);

  const wordCount = useMemo(
    () => markdown.trim().split(/\s+/).filter(Boolean).length,
    [markdown],
  );

  return (
    <section aria-label="Document preview" className="preview">
      <div className="preview-header">
        <h2>
          {template.title} <span className="muted">v{template.version}</span>
        </h2>
        <div className="preview-actions" role="tablist" aria-label="Preview mode">
          {(
            [
              ["rendered", "Styled"],
              ["markdown", "Markdown"],
              ["raw", "Template source"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              data-testid={`preview-tab-${key}`}
              onClick={() => setView(key)}
              className={view === key ? "tab active" : "tab"}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {remaining.length > 0 ? (
        <p className="preview-warning" role="status">
          Still to fill: {remaining.map((r) => `{{${r}}}`).join(", ")}
        </p>
      ) : (
        <p className="preview-ok" role="status">
          All placeholders filled for this template.
        </p>
      )}

      {view === "rendered" ? (
        <article
          className="preview-rendered"
          data-testid="preview-rendered"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : view === "markdown" ? (
        <pre className="preview-md" data-testid="preview-markdown">
          {markdown}
        </pre>
      ) : (
        <pre className="preview-md" data-testid="preview-raw">
          {template.content}
        </pre>
      )}

      <p className="preview-meta" data-testid="preview-meta">
        {wordCount} words · {markdown.length} characters
      </p>
    </section>
  );
}
