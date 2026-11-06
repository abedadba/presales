"use client";

import { useMemo, useState } from "react";
import DocumentPreview from "@/components/DocumentPreview";
import DownloadPanel from "@/components/DownloadPanel";
import LeadForm from "@/components/LeadForm";
import SavedLeadsPanel from "@/components/SavedLeadsPanel";
import TemplateSelector from "@/components/TemplateSelector";
import { EXAMPLE_LEADS } from "@/lib/exampleData";
import { useToday } from "@/lib/hooks";
import { DEFAULT_TEMPLATE_ID, getTemplate } from "@/lib/templates";
import type { SavedLead } from "@/lib/savedLeads";

/**
 * Lead Call Generator MVP (PS-4).
 *
 * Workflow: Sales exec fills the structured form → the selected PS-3
 * template renders live (zero data loss) → the user downloads the final
 * Markdown file locally. No data leaves the browser.
 */
export default function HomePage() {
  const today = useToday();
  const [data, setData] = useState<Record<string, string>>({
    generated_date: today,
  });
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);

  const template = useMemo(() => getTemplate(templateId), [templateId]);
  const filledCount = useMemo(
    () => Object.values(data).filter((v) => String(v).trim() !== "").length,
    [data],
  );

  function handleChange(key: string, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function handleBlur(key: string) {
    setTouched((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  function loadExample(lead: Record<string, string>) {
    setData({ ...lead });
    setTouched(new Set(Object.keys(lead)));
  }

  function loadSaved(lead: SavedLead) {
    setData({ ...lead.data });
    setTemplateId(lead.templateId || DEFAULT_TEMPLATE_ID);
    setTouched(new Set(Object.keys(lead.data)));
  }

  function clearAll() {
    setData({ generated_date: today });
    setTouched(new Set());
  }

  return (
    <main id="main" className="page">
      <header className="page-header">
        <h1>Lead Call Generator</h1>
        <p>
          Fill in the lead details, preview the document live, then download it as Markdown.
          All processing happens in your browser — nothing is uploaded.
        </p>
      </header>

      <div className="toolbar">
        <button className="btn small" type="button" onClick={() => loadExample(EXAMPLE_LEADS[0] as Record<string, string>)}>
          Load example lead (Northwind)
        </button>
        <button className="btn small" type="button" onClick={() => loadExample(EXAMPLE_LEADS[1] as Record<string, string>)}>
          Load example lead (Delta)
        </button>
        <button className="btn small" type="button" onClick={clearAll}>
          Clear
        </button>
        <span className="muted" data-testid="filled-count">
          {filledCount} field{filledCount === 1 ? "" : "s"} filled
        </span>
      </div>

      <div className="layout-grid">
        <section className="panel" aria-label="Lead data entry">
          <LeadForm data={data} touched={touched} onChange={handleChange} onBlur={handleBlur} />
        </section>

        <div className="panel">
          <TemplateSelector selectedId={templateId} onSelect={setTemplateId} />
          <DocumentPreview template={template} data={data} />
          <DownloadPanel template={template} data={data} />
        </div>
      </div>

      <div className="panel saved-leads-section">
        <SavedLeadsPanel data={data} templateId={templateId} onLoad={loadSaved} filledCount={filledCount} />
      </div>

      <footer className="footer">
        <p>
          Templates come from the PS-3 dataset (<code>templates/</code>). Export format: Markdown
          (.md); use Print / Save as PDF for a PDF copy. See <code>frontend/README.md</code> for
          run instructions.
        </p>
      </footer>
    </main>
  );
}
