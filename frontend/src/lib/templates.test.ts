import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TEMPLATES } from "./templates";

describe("templates.ts stays in sync with the PS-3 source of truth", () => {
  const templatesDir = path.resolve(__dirname, "../../../templates");

  it("has the same ids, metadata and content as templates/ on disk", () => {
    const registry = JSON.parse(readFileSync(path.join(templatesDir, "registry.json"), "utf-8")) as {
      templates: Array<{ id: string; file: string; content?: string; [k: string]: unknown }>;
    };

    expect(TEMPLATES.length).toBe(registry.templates.length);

    for (const entry of registry.templates) {
      const onDisk = readFileSync(path.join(templatesDir, entry.file), "utf-8").replace(/\r\n/g, "\n");
      const bundled = TEMPLATES.find((t) => t.id === entry.id);
      expect(bundled, `missing template ${entry.id}`).toBeDefined();
      expect(bundled?.content).toBe(onDisk);
      expect(bundled?.file).toBe(entry.file);
    }
  });
});
