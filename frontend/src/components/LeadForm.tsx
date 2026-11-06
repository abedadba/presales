"use client";

import { useMemo } from "react";
import { FIELD_GROUPS, FIELD_BY_KEY, LEAD_FIELDS, type FieldDef, type FieldGroup } from "@/lib/fields";
import { validateFieldValue } from "@/lib/validation";

interface LeadFormProps {
  data: Record<string, string>;
  touched: ReadonlySet<string>;
  onChange: (key: string, value: string) => void;
  onBlur: (key: string) => void;
}

/**
 * Grouped lead data-entry form. Fields are driven by `LEAD_FIELDS` so the
 * 25 canonical placeholders stay in one place. Inline validation runs on
 * blur (touched fields) and the summary is available for export gating.
 */
export default function LeadForm({ data, touched, onChange, onBlur }: LeadFormProps) {
  const groups = useMemo(() => {
    const map = new Map<FieldGroup, FieldDef[]>();
    for (const field of LEAD_FIELDS) {
      const list = map.get(field.group) ?? [];
      list.push(field);
      map.set(field.group, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <form
      aria-label="Lead data"
      onSubmit={(e) => e.preventDefault()}
      className="form"
      noValidate
    >
      {groups.map(([groupKey, fields]) => (
        <fieldset key={groupKey} className="form-group">
          <legend>{FIELD_GROUPS[groupKey]}</legend>
          {fields.map((field) => {
            const value = data[field.key] ?? "";
            const error = touched.has(field.key)
              ? validateFieldValue(field.key, value)
              : null;
            const requiredMissing =
              field.required && touched.has(field.key) && value.trim() === "";
            const errorId = `${field.key}-error`;
            const helpId = `${field.key}-help`;
            const describedBy = [field.helpText ? helpId : null, error ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined;

            return (
              <div key={field.key} className="field">
                <label htmlFor={field.key}>
                  {field.label}
                  {field.required && <span aria-hidden="true"> *</span>}
                </label>
                {field.type === "select" ? (
                  <select
                    id={field.key}
                    name={field.key}
                    value={value}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    onBlur={() => onBlur(field.key)}
                    aria-invalid={Boolean(error) || requiredMissing}
                    aria-describedby={describedBy}
                    data-testid={`field-${field.key}`}
                  >
                    <option value="">Select…</option>
                    {(FIELD_BY_KEY[field.key]?.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    id={field.key}
                    name={field.key}
                    value={value}
                    rows={2}
                    placeholder={field.placeholder}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    onBlur={() => onBlur(field.key)}
                    aria-invalid={Boolean(error) || requiredMissing}
                    aria-describedby={describedBy}
                    data-testid={`field-${field.key}`}
                  />
                ) : (
                  <input
                    id={field.key}
                    name={field.key}
                    type={field.type === "number" ? "text" : field.type}
                    inputMode={field.type === "number" ? "numeric" : undefined}
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    onBlur={() => onBlur(field.key)}
                    aria-invalid={Boolean(error) || requiredMissing}
                    aria-describedby={describedBy}
                    data-testid={`field-${field.key}`}
                  />
                )}
                {field.helpText ? (
                  <small id={helpId} className="help">
                    {field.helpText}
                  </small>
                ) : null}
                {error ? (
                  <p id={errorId} role="alert" className="field-error">
                    {error}
                  </p>
                ) : requiredMissing ? (
                  <p id={errorId} role="alert" className="field-error">
                    {field.label} is required.
                  </p>
                ) : null}
              </div>
            );
          })}
        </fieldset>
      ))}
    </form>
  );
}
