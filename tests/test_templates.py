"""Tests for the PS-3 lead templates dataset (stdlib only, unittest style)."""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from presales_templates import TemplateStore, default_templates_dir, extract_placeholders
from presales_templates.cli import main as cli_main

REPO_ROOT = default_templates_dir().parent
EXAMPLE_LEADS = REPO_ROOT / "data" / "leads.example.json"


class TestExtractPlaceholders(unittest.TestCase):
    def test_extracts_sorted_unique(self) -> None:
        self.assertEqual(
            extract_placeholders("Hi {{ b }} and {{a}} and {{b}} {{x_1}}"),
            ["a", "b", "x_1"],
        )

    def test_ignores_invalid_tokens(self) -> None:
        self.assertEqual(extract_placeholders("No tokens {{}} {{not valid}}"), [])


class TestTemplateStoreReading(unittest.TestCase):
    def setUp(self) -> None:
        self.store = TemplateStore()

    def test_lists_shipped_templates(self) -> None:
        ids = self.store.list_ids()
        self.assertIn("lead-profile", ids)
        self.assertEqual(len(ids), 6)  # lead-profile, outreach, soft-call, follow-up, proposal, meeting-notes

    def test_lead_profile_placeholders_match_ps3(self) -> None:
        placeholders = self.store.placeholders("lead-profile")
        for expected in (
            "company_name", "lead_status", "owner_name", "industry", "employee_count",
            "annual_revenue", "website_url", "contact_name", "contact_title", "contact_email",
            "contact_phone", "contact_linkedin", "pain_point_1", "pain_point_2",
            "budget_amount", "target_timeline", "interaction_date", "interaction_type",
            "interaction_summary", "next_step", "generated_date",
        ):
            self.assertIn(expected, placeholders)

    def test_registry_placeholders_in_sync(self) -> None:
        report = self.store.validate_registry()
        self.assertEqual(report["issues"], [])
        self.assertEqual(report["placeholder_mismatch"], [])
        self.assertTrue(report["ok"])

    def test_unknown_template_raises_key_error(self) -> None:
        with self.assertRaises(KeyError):
            self.store.get_raw("does-not-exist")


class TestRendering(unittest.TestCase):
    def setUp(self) -> None:
        self.store = TemplateStore()
        self.lead = json.loads(EXAMPLE_LEADS.read_text(encoding="utf-8"))[0]

    def test_render_replaces_all_when_strict(self) -> None:
        rendered = self.store.render("lead-profile", self.lead, strict=True)
        self.assertNotIn("{{", rendered)
        self.assertIn(self.lead["company_name"], rendered)
        self.assertIn(self.lead["contact_email"], rendered)

    def test_render_all_with_each_example_lead(self) -> None:
        leads = json.loads(EXAMPLE_LEADS.read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(leads), 1)
        for lead in leads:
            outputs = self.store.render_all(lead, strict=True)
            self.assertEqual(sorted(outputs), self.store.list_ids())
            for rendered in outputs.values():
                self.assertNotIn("{{", rendered)

    def test_strict_render_raises_on_missing(self) -> None:
        with self.assertRaises(ValueError):
            self.store.render("lead-profile", {}, strict=True)

    def test_non_strict_leaves_placeholders_visible(self) -> None:
        rendered = self.store.render("lead-profile", {"company_name": "Acme"}, strict=False)
        self.assertIn("Acme", rendered)
        self.assertIn("{{", rendered)

    def test_validate_data_reports_missing_and_unused(self) -> None:
        report = self.store.validate_data("lead-profile", {"company_name": "Acme", "unexpected": "x"})
        self.assertTrue(report["missing"])
        self.assertIn("unexpected", report["unused"])
        self.assertFalse(report["ok"])

        ok_report = self.store.validate_data("lead-profile", self.lead)
        self.assertTrue(ok_report["ok"])


class TestModification(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name) / "templates"
        shutil.copytree(default_templates_dir(), self.root)
        self.store = TemplateStore(self.root)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def test_update_template_persists_bumps_version_and_resyncs(self) -> None:
        before = self.store.get("lead-profile")
        updated = self.store.update_template(
            "lead-profile",
            before.content + "\n\n## PS-3 note\n\nFollow-up: {{next_step}}\n",
        )
        self.assertIn("PS-3 note", updated.content)
        self.assertEqual(updated.version, "1.0.1")  # bumped patch from 1.0.0
        self.assertIn("next_step", updated.placeholders)

        reloaded = TemplateStore(self.root).get_raw("lead-profile")
        self.assertIn("PS-3 note", reloaded)
        self.assertEqual(self.store.validate_registry()["placeholder_mismatch"], [])

    def test_update_unknown_raises_key_error(self) -> None:
        with self.assertRaises(KeyError):
            self.store.update_template("nope", "hello")

    def test_create_template_roundtrip(self) -> None:
        created = self.store.create_template(
            "thank-you-note",
            "Thanks {{contact_name}} from {{company_name}} — next step: {{next_step}}\n",
            title="Thank-you Note",
            category="outreach",
        )
        self.assertEqual(created.placeholders, ["company_name", "contact_name", "next_step"])
        rendered = self.store.render(
            "thank-you-note",
            {"contact_name": "Priya", "company_name": "Northwind", "next_step": "demo"},
            strict=True,
        )
        self.assertIn("Priya", rendered)
        self.assertTrue(self.store.validate_registry()["ok"])

    def test_create_duplicate_and_invalid_id_raise(self) -> None:
        with self.assertRaises(ValueError):
            self.store.create_template("lead-profile", "# duplicate")
        for bad_id in ("Bad Id", "../escape", ""):
            with self.assertRaises(ValueError, msg=bad_id):
                self.store.create_template(bad_id, "# hi")

    def test_sync_registry_fixes_stale_index(self) -> None:
        # Corrupt the index, then sync from disk.
        registry_path = self.root / "registry.json"
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        registry["templates"][0]["placeholders"] = []
        registry_path.write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")

        report = self.store.sync_registry()
        self.assertTrue(report["fixed"])
        self.assertEqual(self.store.validate_registry()["placeholder_mismatch"], [])


class TestCli(unittest.TestCase):
    def test_list_command(self) -> None:
        self.assertEqual(cli_main(["list"]), 0)

    def test_placeholders_command(self) -> None:
        self.assertEqual(cli_main(["placeholders", "lead-profile"]), 0)

    def test_render_command(self) -> None:
        self.assertEqual(
            cli_main(["render", "lead-profile", "--data", str(EXAMPLE_LEADS), "--index", "0"]),
            0,
        )


if __name__ == "__main__":
    unittest.main()
