import { beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  clearSavedLeads,
  deleteSavedLead,
  listSavedLeads,
  saveLead,
} from "./savedLeads";

describe("savedLeads (localStorage)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearSavedLeads();
  });

  it("saves and lists a lead", () => {
    const { lead, overwritten } = saveLead({
      name: "Northwind - Priya",
      data: { company_name: "Northwind", contact_name: "Priya" },
      templateId: "lead-profile",
    });
    expect(overwritten).toBe(false);
    expect(lead.name).toBe("Northwind - Priya");
    expect(listSavedLeads()).toHaveLength(1);
    expect(listSavedLeads()[0].data.company_name).toBe("Northwind");
  });

  it("overwrites when the same name is saved again", () => {
    saveLead({ name: "Acme", data: { company_name: "Acme v1" }, templateId: "lead-profile" });
    const second = saveLead({
      name: "acme",
      data: { company_name: "Acme v2" },
      templateId: "soft-call-script",
    });
    expect(second.overwritten).toBe(true);
    const all = listSavedLeads();
    expect(all).toHaveLength(1);
    expect(all[0].data.company_name).toBe("Acme v2");
    expect(all[0].templateId).toBe("soft-call-script");
  });

  it("trims the name and rejects blank names", () => {
    expect(() => saveLead({ name: "   ", data: { company_name: "X" }, templateId: "lead-profile" })).toThrow(
      /name/i,
    );
    const { lead } = saveLead({ name: "  Delta  ", data: { company_name: "Delta" }, templateId: "lead-profile" });
    expect(lead.name).toBe("Delta");
  });

  it("rejects saving an empty form", () => {
    expect(() => saveLead({ name: "Empty", data: { company_name: "  " }, templateId: "lead-profile" })).toThrow(
      /nothing to save/i,
    );
  });

  it("deletes a saved lead", () => {
    const { lead } = saveLead({ name: "To delete", data: { company_name: "X" }, templateId: "lead-profile" });
    expect(deleteSavedLead(lead.id)).toBe(true);
    expect(listSavedLeads()).toHaveLength(0);
    expect(deleteSavedLead(lead.id)).toBe(false);
  });

  it("returns [] when storage contains corrupt JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "not-json{{{");
    expect(listSavedLeads()).toEqual([]);
  });

  it("persists across reads (simulated reload)", () => {
    saveLead({ name: "Persisted", data: { company_name: "Persisted Co" }, templateId: "lead-profile" });
    // listSavedLeads reads from storage each time, so a second read proves persistence.
    expect(listSavedLeads().map((l) => l.name)).toEqual(["Persisted"]);
  });
});
