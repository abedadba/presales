import { renderContent, type LeadData } from "./render";
import type { Template } from "./templates";

/** Build a filesystem-safe download filename from template + lead data. */
export function buildDownloadFilename(template: Pick<Template, "id">, data: LeadData): string {
  const slug = (value: unknown) =>
    String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  const company = slug(data.company_name) || "lead";
  const datePart = (data.generated_date ? String(data.generated_date) : new Date().toISOString().slice(0, 10)) || "";
  const date = datePart.length >= 10 ? datePart.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `${template.id}-${company}-${date}.md`;
}

/**
 * Render strictly (throws when data is missing) and trigger a local
 * browser download of the Markdown file. No network upload is involved —
 * the bytes are created with a Blob in the browser and the object URL is
 * revoked after the click. Works across Chrome, Safari, Edge and Firefox.
 */
export function downloadMarkdown(template: Template, data: LeadData): string {
  const rendered = renderContent(template.content, data, { strict: true });
  const filename = buildDownloadFilename(template, data);
  const blob = new Blob([rendered], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
  return filename;
}
