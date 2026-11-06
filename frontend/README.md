# Lead Call Generator — PS-4 MVP (Next.js frontend)

A Next.js (App Router, TypeScript) web app for **PS-4: Prototype of Lead Call Generator MVP**.

Workflow for a sales executive:

1. **Data entry** — fill the structured lead form (company, contact, pain points,
   interaction history, budget & timeline, follow-up, document meta).
2. **Dynamic preview** — pick one of the six PS-3 templates (`templates/`:
   Lead Profile, Outreach Email, Soft Call Script, Follow-up Email,
   Proposal Summary, Meeting Notes) and watch the document render live
   as you type.
3. **Save leads (browser-local)** — name the current form and save it in
   `localStorage`, then reload, load, overwrite or delete it from the
   Saved Leads list. (Keys are per-browser; drafts can be saved even
   before the form is valid for export.)
4. **Local export** — download the final document as Markdown (`.md`)
   directly to the local machine. No cloud storage, no network upload.
   Use the browser **Print / Save as PDF** path for a PDF copy.

Success criteria from PS-4 are enforced in code:

- **Zero data loss** — strict rendering throws on any missing placeholder
  (`src/lib/render.ts`), and export is gated until every placeholder of the
  selected template is filled and valid (`src/lib/validation.ts`).
- **Validation handling** — email, URL, phone, employee-count, money-like
  values, `YYYY-MM-DD` dates, meeting time and status enums are checked
  inline; bad values block the download and explain what to fix.
- **Local download** — `src/lib/download.ts` creates a `Blob` + object URL
  in the browser and revokes it after the click. Works on Chrome, Safari,
  Edge and Firefox.

## Run it

Requires Node 20+ (see `engines` below) and npm:

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build
npm run start    # production server
npm run lint     # ESLint (Next.js rules)
npm run typecheck
npm test         # Vitest (render + validation + download + page + template-sync)
```

## Layout

```
frontend/
  src/
    app/            # Next.js App Router: layout.tsx, page.tsx, globals.css
    components/     # LeadForm, TemplateSelector, DocumentPreview, DownloadPanel, SavedLeadsPanel
    lib/
      fields.ts     # 25 canonical placeholders, types, groups, help text
      templates.ts  # GENERATED — bundled PS-3 templates (see below)
      render.ts     # {{placeholder}} engine (port of src/presales_templates/store.py)
      validation.ts # format + missing-field validation
      download.ts   # filename builder + browser Blob download
      savedLeads.ts # localStorage save/load/delete for named leads
      exampleData.ts# fictitious examples mirrored from data/leads.example.json
    test/setup.ts
  scripts/sync-templates.mjs
```

## Templates — single source of truth

`src/lib/templates.ts` is **generated** from the repo-level PS-3 dataset:
`../templates/registry.json` + `../templates/*.md`. Do not edit it by hand.

```bash
# from frontend/, after changing ../templates/
node scripts/sync-templates.mjs
```

`src/lib/templates.test.ts` fails CI if the bundled copy drifts from disk.
The Python store (`src/presales_templates/`) and this app share the same
placeholder syntax and the same rendering semantics (`strict` vs. preview).

## Data & privacy

- Example leads are fictitious (`@example.invalid`, `.invalid` sites) and
  mirror `data/leads.example.json`.
- There is no backend. The in-progress form lives in React only, but
  **named saved leads** persist in the browser's `localStorage`
  (`presales.ps4.savedLeads.v1`) via `src/lib/savedLeads.ts` — they survive
  reloads on the same device/browser, and never leave it. Saving with an
  existing name overwrites that entry; invalid/draft forms can be saved
  (export still requires full validity).
- Downloads are generated entirely on the client.

## Validation rules (summary)

| Field(s) | Rule |
| --- | --- |
| `contact_email` | `name@domain.tld` |
| `website_url`, `contact_linkedin` | starts with `http://` or `https://` |
| `contact_phone` | digits, `+() - .`, 6–20 chars |
| `employee_count` | whole number > 0 |
| `annual_revenue`, `budget_amount`, `proposal_value` | money-like: `$3.2M`, `$8,000`, `15000` |
| `interaction_date`, `meeting_date`, `generated_date` | valid `YYYY-MM-DD` |
| `meeting_time` | `HH:MM` optionally `GST`/`UTC` suffix |
| `lead_status`, `interaction_type` | enum (select) |

Blank values are allowed while typing; export requires every placeholder
of the **selected** template to be filled and valid.

## Notes on export format

PS-4 left the format open (`Markdown (.md), PDF (.pdf), or Word (.docx)`).
The MVP ships **Markdown** because the PS-3 source templates are Markdown —
rendered output is byte-faithful to the Python renderer. For PDF, use
**Print → Save as PDF** (print styles hide the form and print the styled
preview). True client-side PDF generation can be added later without
changing the rendering core.
