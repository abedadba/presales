/**
 * Browser-local saved leads (localStorage).
 *
 * No backend or login: leads live in the browser's localStorage only, so
 * they persist across reloads on the same device/browser but never leave
 * it. The exported `listSavedLeads` is SSR-safe and returns [] on the
 * server or when storage is unavailable/corrupt.
 */

export interface SavedLead {
  id: string;
  /** User-chosen display name, trimmed. Unique per browser (save overwrites). */
  name: string;
  /** Key lead fields kept for display purposes. */
  company_name: string;
  contact_name: string;
  /** Full form payload (`Record<string, string>`). */
  data: Record<string, string>;
  templateId: string;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

export const STORAGE_KEY = "presales.ps4.savedLeads.v1";

function isServer(): boolean {
  return typeof window === "undefined" || typeof window.localStorage === "undefined";
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through
    }
  }
  return `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeData(raw: unknown): Record<string, string> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
    else if (value !== null && value !== undefined) out[key] = String(value);
  }
  return out;
}

function parseStored(raw: string | null): SavedLead[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const leads: SavedLead[] = [];
    for (const item of parsed as Array<Record<string, unknown>>) {
      if (item && typeof item === "object" && typeof item.name === "string" && item.name.trim() !== "") {
        const data = sanitizeData(item.data);
        leads.push({
          id: typeof item.id === "string" && item.id !== "" ? item.id : generateId(),
          name: item.name.trim(),
          company_name: typeof item.company_name === "string" ? item.company_name : String(data.company_name ?? ""),
          contact_name: typeof item.contact_name === "string" ? item.contact_name : String(data.contact_name ?? ""),
          data,
          templateId: typeof item.templateId === "string" && item.templateId !== "" ? item.templateId : "lead-profile",
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
          updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : (typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()),
        });
      }
    }
    leads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return leads;
  } catch {
    return [];
  }
}

function readAll(): SavedLead[] {
  if (isServer()) return [];
  try {
    return parseStored(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeAll(leads: SavedLead[]): void {
  if (isServer()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

/** List saved leads, newest-updated first. */
export function listSavedLeads(): SavedLead[] {
  return readAll();
}

/** Find a saved lead by exact (trimmed) name, if any. */
export function findSavedLeadByName(name: string): SavedLead | undefined {
  const key = name.trim().toLowerCase();
  if (key === "") return undefined;
  return readAll().find((l) => l.name.toLowerCase() === key);
}

/** Get one saved lead by id. */
export function getSavedLead(id: string): SavedLead | undefined {
  return readAll().find((l) => l.id === id);
}

/** Delete a saved lead. Returns true if something was deleted. */
export function deleteSavedLead(id: string): boolean {
  const all = readAll();
  const next = all.filter((l) => l.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}

export interface SaveLeadInput {
  name: string;
  data: Record<string, string>;
  templateId: string;
}

export interface SaveLeadResult {
  lead: SavedLead;
  overwritten: boolean;
}

/**
 * Save a lead. Saving with an already-used name overwrites that entry
 * (keeping its id and createdAt). Throws on blank name, empty data,
 * or unavailable storage so the UI can show a message.
 */
export function saveLead(input: SaveLeadInput): SaveLeadResult {
  const name = input.name.trim();
  if (name === "") throw new Error("Enter a name for this saved lead.");
  const data = sanitizeData(input.data);
  const filled = Object.values(data).filter((v) => v.trim() !== "").length;
  if (filled === 0) throw new Error("Nothing to save — fill in at least one field first.");
  if (isServer()) throw new Error("Saving is unavailable on the server.");

  const now = new Date().toISOString();
  const all = readAll();
  const lower = name.toLowerCase();
  const existingIdx = all.findIndex((l) => l.name.toLowerCase() === lower);

  if (existingIdx >= 0) {
    const existing = all[existingIdx];
    const updated: SavedLead = {
      ...existing,
      name,
      company_name: String(data.company_name ?? ""),
      contact_name: String(data.contact_name ?? ""),
      data,
      templateId: input.templateId,
      updatedAt: now,
    };
    all[existingIdx] = updated;
    all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    writeAll(all);
    return { lead: updated, overwritten: true };
  }

  const lead: SavedLead = {
    id: generateId(),
    name,
    company_name: String(data.company_name ?? ""),
    contact_name: String(data.contact_name ?? ""),
    data,
    templateId: input.templateId,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([lead, ...all]);
  return { lead, overwritten: false };
}

/** Remove all saved leads (used by tests / reset). */
export function clearSavedLeads(): void {
  if (isServer()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
