# Lead document templates (PS-3)

A dataset of Markdown document templates that a later system can load,
render with lead data, and modify in place.

## Files

| File | Purpose |
| --- | --- |
| `registry.json` | Machine-readable index: title, category, version, placeholders per template |
| `lead-profile.md` | Full lead profile (canonical template from PS-3 description) |
| `outreach-email.md` | First-touch outreach email |
| `soft-call-script.md` | Discovery talk track for the initial soft call (PS-2) |
| `follow-up-email.md` | Post-call summary / follow-up email |
| `proposal-summary.md` | One-page proposal summary |
| `meeting-notes.md` | Structured meeting notes |
| `../data/leads.example.json` | Fictitious example leads covering every placeholder |

## Placeholders

Use `{{placeholder_name}}` (letters, digits, `_`). A template's required
placeholders are its `{{...}}` tokens. The canonical names are the PS-3 set:
`company_name`, `lead_status`, `owner_name`, `industry`, `employee_count`,
`annual_revenue`, `website_url`, `contact_name`, `contact_title`,
`contact_email`, `contact_phone`, `contact_linkedin`, `pain_point_1`,
`pain_point_2`, `budget_amount`, `target_timeline`, `interaction_date`,
`interaction_type`, `interaction_summary`, `next_step`, `generated_date` —
plus `email_subject`, `meeting_date`, `meeting_time`, `proposal_value` for
the outreach / notes templates.

All example data is fictitious (`@example.invalid`, `.invalid` websites).

## Using from Python

```python
from presales_templates import TemplateStore

store = TemplateStore()  # defaults to templates/

print(store.list_ids())
print(store.placeholders("lead-profile"))

lead = {
    "company_name": "Northwind Traders",
    # ... one value per placeholder
}
print(store.render("lead-profile", lead, strict=True))
```

Install the package, then run the CLI:

```bash
pip install -e .
python -m presales_templates.cli list
python -m presales_templates.cli render lead-profile --data data/leads.example.json --index 0
```

## Modifying templates in code

`update_template` overwrites the Markdown, recomputes the placeholder
index, and bumps the registry patch version. `create_template` adds a new
`*.md` file + registry entry (ids must be lowercase slug, e.g.
`thank-you-note`).

```python
updated = store.update_template("lead-profile", new_markdown)
created = store.create_template(
    "thank-you-note",
    "Thanks {{contact_name}} ... {{next_step}}",
    title="Thank-you Note",
)
store.sync_registry()  # recompute placeholder indexes from disk
```

Hand-editing a `.md` file is fine too — run `sync_registry()` afterwards
so `registry.json` matches. `validate_registry()` reports drift without
changing anything.

## Conventions

- One `.md` file per template; **id = filename without `.md`**.
- Keep placeholders lowercase `snake_case`; reuse canonical names
  wherever the field means the same thing.
- Bump registry versions when content changes (handled for you by
  `update_template` / `create_template`).
- Never commit real personal data — use fictitious examples only.
