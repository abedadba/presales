This is a project initiated to experiment with OpenCode and Jira Project Management workspace.

OpenCode CLI in VS Code used to call the MCP server

## Status

This project is in progress and will be completed in 1 week.

## Lead document templates — PS-3

`templates/` is a dataset of six modifiable Markdown lead document
templates (lead profile, outreach email, soft-call script, follow-up email,
proposal summary, meeting notes) plus a machine-readable `registry.json`
index. `src/presales_templates/` provides a small stdlib-only
`TemplateStore` to list, render, validate, create, and update templates.
Example fictitious leads live in `data/leads.example.json`.

```bash
pip install -e .
python -m presales_templates.cli list
python -m presales_templates.cli render lead-profile --data data/leads.example.json --index 0
python -m unittest discover -s tests -v
```

See `templates/README.md` for placeholder names, the modification API,
and conventions.
