// Regenerate src/lib/templates.ts from the PS-3 source of truth:
// ../templates/registry.json + ../templates/*.md
// Run from frontend/: node scripts/sync-templates.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const TEMPLATES_DIR = path.join(REPO_ROOT, "templates");
const OUT = path.join(__dirname, "../src/lib/templates.ts");

const registry = JSON.parse(await readFile(path.join(TEMPLATES_DIR, "registry.json"), "utf-8"));

const templates = [];
for (const entry of registry.templates) {
  const raw = await readFile(path.join(TEMPLATES_DIR, entry.file), "utf-8");
  const content = raw.replace(/\r\n/g, "\n");
  templates.push({
    id: entry.id,
    title: entry.title,
    file: entry.file,
    version: entry.version,
    category: entry.category,
    description: entry.description,
    placeholders: entry.placeholders,
    content,
  });
}
templates.sort((a, b) => a.id.localeCompare(b.id));

const HEADER_LINES = [
  "/**",
  " * Generated from the PS-3 template dataset (repo templates/registry.json",
  " * + repo templates/*.md) by frontend/scripts/sync-templates.mjs.",
  " * Do not edit by hand - run node scripts/sync-templates.mjs from frontend/",
  " * after changing the source templates.",
  " */",
  "",
  "export interface Template {",
  "  id: string;",
  "  title: string;",
  "  file: string;",
  "  version: string;",
  "  category: string;",
  "  description: string;",
  "  placeholders: readonly string[];",
  "  content: string;",
  "}",
  "",
  "const RAW_TEMPLATES = ",
];
const header = HEADER_LINES.join("\n") + "\n";

const FOOTER_LINES = [
  " as const satisfies readonly Template[];",
  "",
  "export const TEMPLATES: readonly Template[] = RAW_TEMPLATES;",
  "",
  "export const TEMPLATES_BY_ID: Record<string, Template> = Object.fromEntries(",
  "  TEMPLATES.map((t) => [t.id, t]),",
  ");",
  "",
  "export function getTemplate(id: string): Template {",
  "  const t = TEMPLATES_BY_ID[id];",
  "  if (!t) {",
  '    throw new Error("Unknown template \u0027" + id + "\u0027. Available: " + TEMPLATES.map((x) => x.id).join(", "));',
  "  }",
  "  return t;",
  "}",
  "",
  'export const DEFAULT_TEMPLATE_ID = "lead-profile";',
  "",
];
const footer = FOOTER_LINES.join("\n");

const contents = templates.map((t) => JSON.stringify(t.content));
const body =
  "[\n" +
  templates
    .map((t, i) => {
      return (
        "  {\n" +
        "    id: " + JSON.stringify(t.id) + ",\n" +
        "    title: " + JSON.stringify(t.title) + ",\n" +
        "    file: " + JSON.stringify(t.file) + ",\n" +
        "    version: " + JSON.stringify(t.version) + ",\n" +
        "    category: " + JSON.stringify(t.category) + ",\n" +
        "    description: " + JSON.stringify(t.description) + ",\n" +
        "    placeholders: " + JSON.stringify(t.placeholders) + ",\n" +
        "    content: " + contents[i] + ",\n" +
        "  },"
      );
    })
    .join("\n") +
  "\n]";

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, header + body + footer, "utf-8");
console.log("Wrote " + OUT + " (" + templates.length + " templates)");
