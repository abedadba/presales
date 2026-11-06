/**
 * Form field definitions for the Lead Call Generator (PS-4).
 *
 * Covers the union of the six PS-3 templates (`templates/registry.json`):
 * 25 canonical placeholders. Field metadata drives the form UI, validation,
 * and help text so the frontend never hard-codes a field list elsewhere.
 */

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "textarea"
  | "date"
  | "time"
  | "number"
  | "select";

export type FieldGroup = "company" | "contact" | "qualification" | "interaction" | "commercial" | "follow_up" | "meta";

export interface FieldDef {
  /** Placeholder name, e.g. `company_name`. */
  key: string;
  label: string;
  type: FieldType;
  /** Required for every template that uses this field (export gate). */
  required: boolean;
  group: FieldGroup;
  placeholder?: string;
  helpText?: string;
  options?: readonly string[];
  /** Hint shown in the form, e.g. format examples. */
  example?: string;
}

export const FIELD_GROUPS: Record<FieldGroup, string> = {
  company: "Company",
  contact: "Primary contact",
  qualification: "Qualification",
  interaction: "Interaction history",
  commercial: "Budget & timeline",
  follow_up: "Follow-up & meeting",
  meta: "Document meta",
};

export const LEAD_FIELDS: FieldDef[] = [
  // Company
  { key: "company_name", label: "Company name", type: "text", required: true, group: "company", placeholder: "Northwind Traders", helpText: "Legal or trading name used in document titles." },
  { key: "industry", label: "Industry", type: "text", required: true, group: "company", placeholder: "Wholesale trading" },
  { key: "employee_count", label: "Employee count", type: "number", required: false, group: "company", placeholder: "45", helpText: "Whole number, e.g. 45.", example: "45" },
  { key: "annual_revenue", label: "Annual revenue", type: "text", required: false, group: "company", placeholder: "$3.2M", helpText: "Estimated annual revenue, e.g. $3.2M.", example: "$3.2M" },
  { key: "website_url", label: "Website URL", type: "url", required: false, group: "company", placeholder: "https://example.com/northwind-traders", helpText: "Must start with http:// or https://." },
  { key: "lead_status", label: "Lead status", type: "select", required: true, group: "company", options: ["new", "contacted", "qualified", "proposal", "won", "lost"], helpText: "Current pipeline stage." },

  // Contact
  { key: "contact_name", label: "Contact name", type: "text", required: true, group: "contact", placeholder: "Priya Nair" },
  { key: "contact_title", label: "Contact title", type: "text", required: true, group: "contact", placeholder: "Operations Manager" },
  { key: "contact_email", label: "Contact email", type: "email", required: true, group: "contact", placeholder: "priya.nair@example.invalid", helpText: "Must be a valid email address." },
  { key: "contact_phone", label: "Contact phone", type: "tel", required: false, group: "contact", placeholder: "+971-4-000-0001", helpText: "International format is fine." },
  { key: "contact_linkedin", label: "Contact LinkedIn URL", type: "url", required: false, group: "contact", placeholder: "https://www.linkedin.com/in/example-priya-nair", helpText: "Must start with http:// or https://." },
  { key: "owner_name", label: "Owner (sales executive)", type: "text", required: true, group: "contact", placeholder: "Abeda Begum", helpText: "Sales executive preparing this document." },

  // Qualification — pain points (core of the call script)
  { key: "pain_point_1", label: "Pain point 1", type: "textarea", required: true, group: "qualification", placeholder: "Manual follow-up on quotes is slow and error-prone", helpText: "The lead's primary pain, in their words." },
  { key: "pain_point_2", label: "Pain point 2", type: "textarea", required: true, group: "qualification", placeholder: "No single view of lead history across channels", helpText: "Secondary pain, in their words." },

  // Interaction
  { key: "interaction_type", label: "Interaction type", type: "select", required: false, group: "interaction", options: ["soft call", "meeting", "demo", "email"], helpText: "Type of last interaction." },
  { key: "interaction_date", label: "Interaction date", type: "date", required: false, group: "interaction", helpText: "YYYY-MM-DD." },
  { key: "interaction_summary", label: "Interaction summary", type: "textarea", required: false, group: "interaction", placeholder: "Priya confirmed quotes take days to chase…" },

  // Commercial
  { key: "budget_amount", label: "Budget amount", type: "text", required: false, group: "commercial", placeholder: "$8,000", helpText: "Approved or estimated budget, e.g. $8,000.", example: "$8,000" },
  { key: "target_timeline", label: "Target timeline", type: "text", required: false, group: "commercial", placeholder: "Q1 2027", helpText: "When the lead wants to implement." },
  { key: "proposal_value", label: "Proposal value", type: "text", required: false, group: "commercial", placeholder: "$7,500 first phase", helpText: "Value of the proposed first phase." },

  // Follow-up
  { key: "email_subject", label: "Email subject", type: "text", required: false, group: "follow_up", placeholder: "Quick idea for Northwind Traders" },
  { key: "meeting_date", label: "Meeting date", type: "date", required: false, group: "follow_up", helpText: "YYYY-MM-DD. Used by outreach, call script, follow-up and notes templates." },
  { key: "meeting_time", label: "Meeting time", type: "time", required: false, group: "follow_up", placeholder: "10:00 GST", helpText: "e.g. 10:00 GST or 10:00." },
  { key: "next_step", label: "Next step", type: "textarea", required: false, group: "interaction", placeholder: "Send one-page summary and book a 30-minute demo" },

  // Meta
  { key: "generated_date", label: "Generated date", type: "date", required: false, group: "meta", helpText: "YYYY-MM-DD. Defaults to today when blank." },
];

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  LEAD_FIELDS.map((f) => [f.key, f]),
);

/** Every canonical placeholder known to the frontend (union across templates). */
export const ALL_PLACEHOLDER_KEYS: string[] = LEAD_FIELDS.map((f) => f.key).sort();
