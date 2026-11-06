import { describe, expect, it } from "vitest";
import { buildDownloadFilename } from "./download";
import { TEMPLATES } from "./templates";

describe("buildDownloadFilename", () => {
  it("slugifies company and includes template id and date", () => {
    const name = buildDownloadFilename(
      { id: "lead-profile" } as never,
      { company_name: "Northwind Traders", generated_date: "2026-11-06" },
    );
    expect(name).toBe("lead-profile-northwind-traders-2026-11-06.md");
  });

  it("falls back to lead slug when company is blank", () => {
    const name = buildDownloadFilename({ id: "soft-call-script" } as never, {});
    expect(name).toMatch(/^soft-call-script-lead-\d{4}-\d{2}-\d{2}\.md$/);
  });

  it("pins app templates to the PS-3 registry ids", () => {
    const ids = TEMPLATES.map((t) => t.id).sort();
    expect(ids).toEqual([
      "follow-up-email",
      "lead-profile",
      "meeting-notes",
      "outreach-email",
      "proposal-summary",
      "soft-call-script",
    ]);
  });
});
