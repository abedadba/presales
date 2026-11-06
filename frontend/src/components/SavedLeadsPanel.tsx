"use client";

import { useEffect, useState } from "react";
import {
  deleteSavedLead,
  listSavedLeads,
  saveLead,
  type SavedLead,
} from "@/lib/savedLeads";

interface SavedLeadsPanelProps {
  data: Record<string, string>;
  templateId: string;
  onLoad: (lead: SavedLead) => void;
  filledCount: number;
}

/**
 * Save / load panel for named leads in browser localStorage.
 * Saving with an existing name overwrites that entry. Data never leaves
 * the browser.
 */
export default function SavedLeadsPanel({ data, templateId, onLoad, filledCount }: SavedLeadsPanelProps) {
  const [saved, setSaved] = useState<SavedLead[]>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [hasDuplicate, setHasDuplicate] = useState(false);

  // localStorage is client-only — read after mount to avoid hydration mismatch.
  useEffect(() => {
    setSaved(listSavedLeads());
  }, []);

  useEffect(() => {
    const key = name.trim().toLowerCase();
    setHasDuplicate(key !== "" && saved.some((l) => l.name.toLowerCase() === key));
  }, [name, saved]);

  function refresh() {
    setSaved(listSavedLeads());
  }

  function handleSave() {
    try {
      const result = saveLead({ name, data, templateId });
      refresh();
      setName("");
      setStatus(
        result.overwritten
          ? `Overwrote saved lead "${result.lead.name}".`
          : `Saved lead "${result.lead.name}".`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save this lead.");
    }
  }

  function handleLoad(lead: SavedLead) {
    onLoad(lead);
    setStatus(`Loaded saved lead "${lead.name}".`);
  }

  function handleDelete(lead: SavedLead) {
    if (deleteSavedLead(lead.id)) {
      refresh();
      setStatus(`Deleted saved lead "${lead.name}".`);
    } else {
      setStatus("Could not delete that lead.");
    }
  }

  const canSave = name.trim() !== "" && filledCount > 0;

  return (
    <section aria-label="Saved leads" className="saved-panel">
      <h2>Saved leads</h2>
      <p className="muted saved-note">
        Save named leads in this browser (<code>localStorage</code>). They persist across reloads on
        this device only — nothing is uploaded. Saving with the same name overwrites it.
      </p>

      <div className="saved-form">
        <label htmlFor="saved-lead-name">Save current form as</label>
        <input
          id="saved-lead-name"
          type="text"
          value={name}
          placeholder='e.g. Northwind - Priya'
          onChange={(e) => setName(e.target.value)}
          data-testid="saved-lead-name"
          aria-describedby="saved-lead-help"
        />
        <small id="saved-lead-help" className="help">
          Give this lead a memorable name. Blank or empty forms cannot be saved.
        </small>
        <div className="saved-actions">
          <button
            type="button"
            className="btn primary"
            onClick={handleSave}
            disabled={!canSave}
            data-testid="save-lead-btn"
          >
            {hasDuplicate && name.trim() !== "" ? `Overwrite "${name.trim()}"` : "Save lead"}
          </button>
          <span className="muted" data-testid="saved-count">
            {saved.length} saved
          </span>
        </div>
      </div>

      {saved.length === 0 ? (
        <p className="muted" data-testid="saved-empty">
          No saved leads yet. Fill the form and save it to reuse later.
        </p>
      ) : (
        <ul className="saved-list" data-testid="saved-list">
          {saved.map((lead) => (
            <li key={lead.id} className="saved-item">
              <div className="saved-meta">
                <strong>{lead.name}</strong>
                <span className="muted">
                  {lead.company_name || "—"}
                  {lead.contact_name ? ` · ${lead.contact_name}` : ""}
                </span>
                <span className="muted saved-date">
                  Updated {new Date(lead.updatedAt).toLocaleString()}
                </span>
              </div>
              <div className="saved-item-actions">
                <button
                  type="button"
                  className="btn small"
                  onClick={() => handleLoad(lead)}
                  data-testid={`load-${lead.id}`}
                  aria-label={`Load saved lead ${lead.name}`}
                >
                  Load
                </button>
                <button
                  type="button"
                  className="btn small danger"
                  onClick={() => handleDelete(lead)}
                  data-testid={`delete-${lead.id}`}
                  aria-label={`Delete saved lead ${lead.name}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {status ? (
        <p role="status" className="saved-status" data-testid="saved-status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
