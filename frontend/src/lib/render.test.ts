import { describe, expect, it } from "vitest";
import { extractPlaceholders, renderContent, validateData } from "./render";

describe("extractPlaceholders", () => {
  it("extracts sorted unique names", () => {
    expect(extractPlaceholders("Hi {{ b }} and {{a}} and {{b}} {{x_1}}")).toEqual(["a", "b", "x_1"]);
  });

  it("ignores invalid tokens", () => {
    expect(extractPlaceholders("No tokens {{}} {{not valid}}")).toEqual([]);
  });
});

describe("renderContent", () => {
  it("replaces all placeholders when strict", () => {
    const out = renderContent("Hi {{name}} from {{company}}", { name: "Priya", company: "Acme" }, { strict: true });
    expect(out).toBe("Hi Priya from Acme");
    expect(out).not.toContain("{{");
  });

  it("non-strict leaves missing placeholders visible", () => {
    const out = renderContent("Hi {{name}} from {{company}}", { name: "Priya" });
    expect(out).toContain("Priya");
    expect(out).toContain("{{company}}");
  });

  it("strict throws on missing data", () => {
    expect(() => renderContent("Hi {{name}} from {{company}}", { name: "Priya" }, { strict: true })).toThrow(
      /Missing template data/,
    );
  });

  it("treats blank strings as missing in strict mode", () => {
    expect(() => renderContent("Hi {{name}}", { name: "  " }, { strict: true })).toThrow();
  });
});

describe("validateData", () => {
  it("reports missing and unused", () => {
    const report = validateData(["company_name", "contact_name"], { company_name: "Acme", unexpected: "x" });
    expect(report.missing).toEqual(["contact_name"]);
    expect(report.unused).toContain("unexpected");
    expect(report.ok).toBe(false);
  });

  it("is ok when all placeholders are present", () => {
    expect(validateData(["a", "b"], { a: "1", b: "2" }).ok).toBe(true);
  });
});
