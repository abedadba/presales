"""Tiny CLI for the lead templates dataset.

Usage:
    python -m presales_templates.cli list
    python -m presales_templates.cli show lead-profile
    python -m presales_templates.cli placeholders lead-profile
    python -m presales_templates.cli render lead-profile --data data/leads.example.json --index 0
    python -m presales_templates.cli validate lead-profile --data data/leads.example.json --index 0
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from .store import TemplateStore


def _load_data(path: Path, index: int) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    records = payload if isinstance(payload, list) else [payload]
    if not records:
        raise SystemExit(f"No records in {path}")
    if index >= len(records):
        raise SystemExit(f"--index {index} out of range (dataset has {len(records)} record(s))")
    record = records[index]
    if not isinstance(record, dict):
        raise SystemExit("Data records must be JSON objects")
    return record


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")  # templates contain emoji; Windows defaults to cp1252
        except Exception:
            pass
    parser = argparse.ArgumentParser(description="Lead document templates (PS-3)")
    parser.add_argument("--root", type=Path, default=None, help="templates/ directory (default: repo templates/)")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list")

    show = sub.add_parser("show")
    show.add_argument("template_id")

    ph = sub.add_parser("placeholders")
    ph.add_argument("template_id")

    render = sub.add_parser("render")
    render.add_argument("template_id")
    render.add_argument("--data", type=Path, required=True)
    render.add_argument("--index", type=int, default=0)

    validate = sub.add_parser("validate")
    validate.add_argument("template_id")
    validate.add_argument("--data", type=Path, required=True)
    validate.add_argument("--index", type=int, default=0)

    args = parser.parse_args(argv)
    store = TemplateStore(args.root)

    if args.command == "list":
        for template in store.list_templates():
            print(f"{template.id:18} v{template.version}  {template.title}  ({len(template.placeholders)} placeholders)")
        return 0
    if args.command == "show":
        print(store.get_raw(args.template_id))
        return 0
    if args.command == "placeholders":
        for name in store.placeholders(args.template_id):
            print(name)
        return 0
    if args.command == "render":
        print(store.render(args.template_id, _load_data(args.data, args.index), strict=True))
        return 0
    if args.command == "validate":
        report = store.validate_data(args.template_id, _load_data(args.data, args.index))
        print(json.dumps(report, indent=2))
        return 0 if report["ok"] else 1
    parser.error(f"Unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
