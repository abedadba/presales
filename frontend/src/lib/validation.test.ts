import { describe, expect, it } from "vitest";
import { validateFieldValue, validateLeadData } from "./validation";

describe("validateFieldValue", () => {
  it("accepts empty values (format only when filled)", () => {
    expect(validateFieldValue("contact_email", "")).toBeNull();
  });

  it("rejects malformed email", () => {
    expect(validateFieldValue("contact_email", "not-an-email")).toMatch(/email/);
    expect(validateFieldValue("contact_email", "a@b.com")).toBeNull();
  });

  it("rejects URL without scheme", () => {
    expect(validateFieldValue("website_url", "example.com")).toMatch(/URL/);
    expect(validateFieldValue("website_url", "https://example.com")).toBeNull();
  });

  it("rejects non-numeric employee count", () => {
    expect(validateFieldValue("employee_count", "forty")).toMatch(/whole number/);
    expect(validateFieldValue("employee_count", "45")).toBeNull();
  });

  it("rejects invalid dates", () => {
    expect(validateFieldValue("interaction_date", "2026-13-40")).toMatch(/date/);
    expect(validateFieldValue("interaction_date", "2026-11-07")).toBeNull();
    expect(validateFieldValue("interaction_date", "07/11/2026")).toMatch(/date/);
  });

  it("accepts money-like values", () => {
    expect(validateFieldValue("budget_amount", "$8,000")).toBeNull();
    expect(validateFieldValue("annual_revenue", "$3.2M")).toBeNull();
    expect(validateFieldValue("proposal_value", "$7,500 first phase")).toBeNull();
    expect(validateFieldValue("budget_amount", "lots")).toMatch(/money-like/);
  });
});

describe("validateLeadData", () => {
  it("blocks export when template placeholders are missing", () => {
    const result = validateLeadData({}, ["company_name", "contact_name"]);
    expect(result.canExport).toBe(false);
    expect(result.missingForTemplate).toEqual(["company_name", "contact_name"]);
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("blocks export on format errors inside the template", () => {
    const result = validateLeadData(
      { company_name: "Acme", contact_email: "broken" },
      ["company_name", "contact_email"],
    );
    expect(result.canExport).toBe(false);
    expect(result.templateFieldErrors.contact_email).toBeDefined();
  });

  it("allows export when everything is filled and valid", () => {
    const result = validateLeadData(
      { company_name: "Acme", contact_email: "a@example.com" },
      ["company_name", "contact_email"],
    );
    expect(result.canExport).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("ignores format errors outside the template for export", () => {
    // website_url is not a placeholder of this template, so its bad format
    // does not block exporting the template (shown as field error only).
    const result = validateLeadData(
      { company_name: "Acme", website_url: "not-a-url" },
      ["company_name"],
    );
    expect(result.canExport).toBe(true);
    expect(result.fieldErrors.website_url).toBeDefined();
  });
});
