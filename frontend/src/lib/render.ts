/**
 * Template rendering engine — TypeScript port of `src/presales_templates/store.py`
 * (`extract_placeholders`, `_render_content`, `validate_data`).
 *
 * Templates use `{{placeholder_name}}` tokens (letters, digits, `_`).
 * Non-strict rendering leaves unsupplied placeholders visible as `{{name}}`
 * so gaps are obvious in the preview. Strict rendering throws on missing
 * data, mirroring the Python `strict=True` behaviour used for export.
 */

export type LeadData = Record<string, string | number | boolean | null | undefined>;

const PLACEHOLDER_RE_GLOBAL = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

export function extractPlaceholders(content: string): string[] {
  const found = new Set<string>();
  for (const match of content.matchAll(PLACEHOLDER_RE_GLOBAL)) {
    found.add(match[1]);
  }
  return [...found].sort();
}

export function validateData(
  placeholders: readonly string[],
  data: LeadData,
): { missing: string[]; unused: string[]; ok: boolean } {
  const required = new Set(placeholders);
  const provided = new Set(Object.keys(data));
  const missing = [...required]
    .filter((name) => !(name in data) || data[name] === null || data[name] === undefined || String(data[name]).trim() === "")
    .sort();
  // Unused = keys that don't correspond to a placeholder (kept for parity
  // with Python validate_data; callers may ignore it).
  const unused = [...provided].filter((key) => !required.has(key)).sort();
  return { missing, unused, ok: missing.length === 0 };
}

export function renderContent(
  content: string,
  data: LeadData,
  options: { strict?: boolean } = {},
): string {
  const { strict = false } = options;
  if (strict) {
    const missing = extractPlaceholders(content).filter(
      (name) => !(name in data) || data[name] === null || data[name] === undefined || String(data[name]).trim() === "",
    );
    if (missing.length > 0) {
      throw new Error(`Missing template data for placeholders: ${missing.join(", ")}`);
    }
  }
  return content.replace(PLACEHOLDER_RE_GLOBAL, (raw, name: string) => {
    if (name in data && data[name] !== null && data[name] !== undefined) {
      return String(data[name] as string | number | boolean);
    }
    return raw;
  });
}
