"use client";

import { useState } from "react";
import { buildDownloadFilename, downloadMarkdown } from "@/lib/download";
import { renderContent, type LeadData } from "@/lib/render";
import type { Template } from "@/lib/templates";
import { validateLeadData } from "@/lib/validation";

interface DownloadPanelProps {
  template: Template;
  data: LeadData;
}

/**
 * Export & download layer (PS-4 output). Downloads the strictly rendered
 * Markdown file locally in the browser — no cloud storage, no network.
 * Export is gated on validation so users never lose data silently.
 */
export default function DownloadPanel({ template, data }: DownloadPanelProps) {
  const [status, setStatus] = useState<string | null>(null);

  const validation = validateLeadData(data, template.placeholders);
  const filename = buildDownloadFilename(template, data);

  async function handleDownload() {
    if (!validation.canExport) {
      setStatus(`Cannot download: ${validation.blockers.join(" ")}`);
      return;
    }
    try {
      const saved = downloadMarkdown(template, data);
      setStatus(`Downloaded ${saved}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Download failed.");
    }
  }

  async function handleCopy() {
    if (!validation.canExport) {
      setStatus(`Cannot copy: ${validation.blockers.join(" ")}`);
      return;
    }
    try {
      const text = renderContent(template.content, data, { strict: true });
      await navigator.clipboard.writeText(text);
      setStatus("Copied rendered Markdown to clipboard.");
    } catch {
      setStatus("Clipboard is unavailable in this browser.");
    }
  }

  function handleInstructions() {
    setStatus(
      "Tip: choose Print / Save as PDF in your browser (Ctrl+P / Cmd+P). The Styled preview is the print area and the download is always Markdown (.md).",
    );
  }

  return (
    <section aria-label="Export and download" className="download-panel">
      <h2>Export &amp; download</h2>
      <p className="muted">Format: Markdown (.md) — saved directly to your device.</p>
      <p className="muted" data-testid="download-filename">
        File: {filename}
      </p>

      {!validation.canExport ? (
        <div role="alert" className="blockers" data-testid="download-blockers">
          <strong>Fix before downloading:</strong>
          <ul>
            {validation.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="ready" role="status" data-testid="download-ready">
          Ready to download — every field for this template is filled and valid.
        </p>
      )}

      <div className="download-actions">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!validation.canExport}
          data-testid="download-btn"
          className="btn primary"
        >
          Download Markdown (.md)
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!validation.canExport}
          data-testid="copy-btn"
          className="btn"
        >
          Copy Markdown
        </button>
        <button type="button" onClick={handleInstructions} data-testid="print-btn" className="btn">
          Print / PDF
        </button>
      </div>

      {status ? (
        <p role="status" className="download-status" data-testid="download-status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
