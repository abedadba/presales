import { FIELD_BY_KEY } from "./fields";
import { validateData, type LeadData } from "./render";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/\S+$/;
const PHONE_RE = /^[+()\-.\s\d]{6,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}(\s*[A-Za-z]{2,5})?$/;
// Money-like: $3.2M, $8,000, 15000, or a money prefix followed by a short
// descriptor ("$7,500 first phase"). Requires a numeric core so free text
// still fails.
const MONEY_RE = /^\$?[\d,]+(\.\d+)?\s*[MmKk]?(\s.*)?$/;
const INTEGER_RE = /^\d+$/;

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Validate a single field value. Returns an error message or null.
 * Empty values are allowed here — required-ness is checked separately —
 * so this only enforces format when a value is present.
 */
export function validateFieldValue(key: string, rawValue: string | number | null | undefined): string | null {
  const value = rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
  if (value === "") return null;

  const def = FIELD_BY_KEY[key];
  if (!def) return null;

  switch (key) {
    case "contact_email":
      return EMAIL_RE.test(value) ? null : "Enter a valid email address (name@company.com).";
    case "website_url":
    case "contact_linkedin":
      return URL_RE.test(value) ? null : "Enter a full URL starting with https://";
    case "contact_phone":
      return PHONE_RE.test(value) ? null : "Enter a valid phone number (digits, +, spaces, dashes).";
    case "employee_count":
      return INTEGER_RE.test(value) && Number(value) > 0 ? null : "Enter a whole number greater than 0.";
    case "annual_revenue":
    case "budget_amount":
    case "proposal_value":
      return MONEY_RE.test(value) ? null : "Use a money-like value, e.g. $3.2M, $8,000, $7,500 first phase or 15000.";
    case "interaction_date":
    case "meeting_date":
    case "generated_date":
      return isValidDate(value) ? null : "Enter a valid date in YYYY-MM-DD format.";
    case "meeting_time":
      return TIME_RE.test(value) ? null : "Enter a time like 10:00 or 10:00 GST.";
    case "lead_status":
      return (def.options ?? []).includes(value) ? null : "Choose a lead status.";
    case "interaction_type":
      return (def.options ?? []).includes(value) ? null : "Choose an interaction type.";
    default:
      if (def.type === "email" && !EMAIL_RE.test(value)) return "Enter a valid email address.";
      if (def.type === "url" && !URL_RE.test(value)) return "Enter a full URL starting with https://";
      return null;
  }
}

export interface ValidationResult {
  /** Per-field error messages (format errors only). */
  fieldErrors: Record<string, string>;
  /** Placeholders of the selected template that are blank. */
  missingForTemplate: string[];
  /** Format errors within the selected template's fields. */
  templateFieldErrors: Record<string, string>;
  /** True when the form can be exported without data loss. */
  canExport: boolean;
  /** Human-readable reasons export is blocked (empty when canExport). */
  blockers: string[];
}

/**
 * Validate lead data for a template.
 *
 * Export is allowed only when every placeholder of the template is filled
 * (strict rendering) AND every filled field passes its format check.
 * This upholds PS-4 success criteria: zero data loss + validation handling.
 */
export function validateLeadData(data: LeadData, templatePlaceholders: readonly string[]): ValidationResult {
  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    const err = validateFieldValue(key, value as string | number | null | undefined);
    if (err) fieldErrors[key] = err;
  }

  const { missing } = validateData(templatePlaceholders, data);

  const templateFieldErrors: Record<string, string> = {};
  for (const key of templatePlaceholders) {
    if (fieldErrors[key]) templateFieldErrors[key] = fieldErrors[key];
  }

  const canExport = missing.length === 0 && Object.keys(templateFieldErrors).length === 0;
  const blockers: string[] = [];
  if (missing.length > 0) {
    blockers.push(`Missing required values for: ${missing.join(", ")}`);
  }
  const errKeys = Object.keys(templateFieldErrors);
  if (errKeys.length > 0) {
    blockers.push(`Fix invalid values for: ${errKeys.join(", ")}`);
  }

  return { fieldErrors, missingForTemplate: missing, templateFieldErrors, canExport, blockers };
}
