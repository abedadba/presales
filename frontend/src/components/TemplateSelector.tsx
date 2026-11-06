"use client";

import { TEMPLATES, type Template } from "@/lib/templates";

interface TemplateSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
  templates?: readonly Template[];
}

export default function TemplateSelector({
  selectedId,
  onSelect,
  templates = TEMPLATES,
}: TemplateSelectorProps) {
  const selected = templates.find((t) => t.id === selectedId);
  return (
    <div className="template-selector">
      <label htmlFor="template-select">Document template</label>
      <select
        id="template-select"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        data-testid="template-select"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title} ({t.placeholders.length} fields)
          </option>
        ))}
      </select>
      {selected ? (
        <p className="template-desc">
          <strong>{selected.title}</strong> v{selected.version} · {selected.description}
        </p>
      ) : null}
    </div>
  );
}
