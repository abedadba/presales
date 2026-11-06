"""Load, render, and modify Markdown lead document templates.

Templates are plain Markdown files with ``{{placeholder}}`` tokens. The
on-disk layout is the dataset:

    templates/
      registry.json      # metadata (title, version, placeholders index)
      lead-profile.md    # one file per template, id == filename without .md
      ...

A future system can read a template, edit its content, and write it back
through :class:`TemplateStore` so placeholders and registry metadata stay
in sync. Rendering takes a plain ``dict`` mapping placeholder names to
values (e.g. one lead record from ``data/leads.example.json``).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping

PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")
TEMPLATE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
REGISTRY_NAME = "registry.json"


def extract_placeholders(content: str) -> list[str]:
    """Return sorted, de-duplicated placeholder names found in *content*."""
    return sorted(set(PLACEHOLDER_RE.findall(content)))


def _render_content(content: str, data: Mapping[str, Any], *, strict: bool = False) -> str:
    if strict:
        missing = [name for name in extract_placeholders(content) if name not in data]
        if missing:
            raise ValueError(f"Missing template data for placeholders: {', '.join(missing)}")

    def _replace(match: re.Match[str]) -> str:
        name = match.group(1)
        if name in data:
            return str(data[name])
        return match.group(0)  # leave unsupplied placeholders visible

    return PLACEHOLDER_RE.sub(_replace, content)


def _bump_patch(version: str) -> str:
    try:
        major, minor, patch = (int(part) for part in version.strip().split("."))
    except (ValueError, TypeError, AttributeError):
        return "1.0.0"
    return f"{major}.{minor}.{patch + 1}"


def default_templates_dir() -> Path:
    """Return the repo's ``templates/`` directory (``src/presales_templates/store.py`` -> root)."""
    repo_templates = Path(__file__).resolve().parents[2] / "templates"
    if repo_templates.exists():
        return repo_templates
    return Path.cwd() / "templates"


@dataclass(frozen=True)
class Template:
    id: str
    title: str
    file: str
    version: str
    category: str
    description: str
    placeholders: list[str] = field(default_factory=list)
    content: str = ""
    path: Path = field(default_factory=lambda: Path("."))
    registry: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RegistryEntry:
    id: str
    title: str
    file: str
    version: str
    category: str
    description: str
    placeholders: list[str] = field(default_factory=list)


class TemplateStore:
    """A directory of Markdown templates plus a ``registry.json`` index."""

    def __init__(self, root: str | Path | None = None) -> None:
        self.root = Path(root).expanduser().resolve() if root is not None else default_templates_dir()
        self.root.mkdir(parents=True, exist_ok=True)

    # -- registry -------------------------------------------------------

    @property
    def _registry_path(self) -> Path:
        return self.root / REGISTRY_NAME

    def load_registry(self) -> dict[str, Any]:
        """Load ``registry.json``; return an empty-shaped registry when absent."""
        if not self._registry_path.exists():
            return {"version": "1.0.0", "templates": []}
        data = json.loads(self._registry_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or not isinstance(data.get("templates"), list):
            raise ValueError("registry.json must be an object with a 'templates' list")
        return data

    def _save_registry(self, data: dict[str, Any]) -> None:
        self._registry_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    @staticmethod
    def _check_id(template_id: str) -> None:
        if not isinstance(template_id, str) or not TEMPLATE_ID_RE.match(template_id):
            raise ValueError(
                f"Invalid template id {template_id!r}: use lowercase letters, digits and hyphens, "
                "starting with a letter or digit (e.g. 'lead-profile')."
            )

    def _resolve_file(self, filename: str) -> Path:
        if Path(filename).name != filename or not filename.endswith(".md"):
            raise ValueError(f"Invalid template filename {filename!r}: use a plain .md filename")
        path = (self.root / filename).resolve()
        if self.root.resolve() not in path.parents:
            raise ValueError(f"Template file escapes the templates directory: {filename!r}")
        return path

    def _entries(self) -> list[RegistryEntry]:
        registry = self.load_registry()
        entries: list[RegistryEntry] = []
        for item in registry["templates"]:
            if not isinstance(item, dict) or "id" not in item or "file" not in item:
                raise ValueError("Each registry template needs at least 'id' and 'file'")
            entries.append(
                RegistryEntry(
                    id=str(item["id"]),
                    title=str(item.get("title", item["id"])),
                    file=str(item["file"]),
                    version=str(item.get("version", "1.0.0")),
                    category=str(item.get("category", "general")),
                    description=str(item.get("description", "")),
                    placeholders=list(item.get("placeholders", [])),
                )
            )
        return entries

    def list_ids(self) -> list[str]:
        """Return sorted template ids."""
        return sorted(entry.id for entry in self._entries())

    def _build_template(self, entry: RegistryEntry) -> Template:
        path = self._resolve_file(entry.file)
        if not path.exists():
            raise FileNotFoundError(f"Template '{entry.id}' file missing: {path}")
        content = path.read_text(encoding="utf-8")
        return Template(
            id=entry.id,
            title=entry.title,
            file=entry.file,
            version=entry.version,
            category=entry.category,
            description=entry.description,
            placeholders=extract_placeholders(content),
            content=content,
            path=path,
            registry={
                "id": entry.id,
                "title": entry.title,
                "file": entry.file,
                "version": entry.version,
                "category": entry.category,
                "description": entry.description,
            },
        )

    def list_templates(self) -> list[Template]:
        """Return all templates, sorted by id."""
        return sorted((self._build_template(entry) for entry in self._entries()), key=lambda t: t.id)

    def get(self, template_id: str) -> Template:
        """Return one template; raise :class:`KeyError` for an unknown id."""
        self._check_id(template_id)
        for entry in self._entries():
            if entry.id == template_id:
                return self._build_template(entry)
        raise KeyError(f"Unknown template '{template_id}'. Available: {', '.join(self.list_ids()) or '(none)'}")

    def get_raw(self, template_id: str) -> str:
        """Return the raw Markdown content of a template."""
        return self.get(template_id).content

    def placeholders(self, template_id: str) -> list[str]:
        """Return the sorted placeholder names required by a template."""
        return self.get(template_id).placeholders

    # -- rendering ------------------------------------------------------

    def render(self, template_id: str, data: Mapping[str, Any], *, strict: bool = False) -> str:
        """Render *template_id* with *data*.

        With ``strict=False`` (default) unsupplied placeholders are left as
        ``{{name}}`` so gaps are visible. With ``strict=True`` any missing
        placeholder raises :class:`ValueError`.
        """
        return _render_content(self.get_raw(template_id), data, strict=strict)

    def render_all(self, data: Mapping[str, Any], *, strict: bool = False) -> dict[str, str]:
        """Render every template with the same *data* mapping."""
        return {t.id: _render_content(t.content, data, strict=strict) for t in self.list_templates()}

    def validate_data(self, template_id: str, data: Mapping[str, Any]) -> dict[str, Any]:
        """Compare *data* keys with a template's placeholders.

        Returns ``{"missing": ..., "unused": ..., "ok": bool}``.
        """
        required = set(self.placeholders(template_id))
        provided = {str(key) for key in data}
        missing = sorted(required - provided)
        unused = sorted(provided - required)
        return {"missing": missing, "unused": unused, "ok": not missing}

    # -- modification ---------------------------------------------------

    def _upsert_entry(self, entry: RegistryEntry) -> None:
        registry = self.load_registry()
        templates = registry.setdefault("templates", [])
        for index, item in enumerate(templates):
            if isinstance(item, dict) and item.get("id") == entry.id:
                templates[index] = {
                    "id": entry.id,
                    "title": entry.title,
                    "file": entry.file,
                    "version": entry.version,
                    "category": entry.category,
                    "description": entry.description,
                    "placeholders": entry.placeholders,
                }
                self._save_registry(registry)
                return
        templates.append(
            {
                "id": entry.id,
                "title": entry.title,
                "file": entry.file,
                "version": entry.version,
                "category": entry.category,
                "description": entry.description,
                "placeholders": entry.placeholders,
            }
        )
        self._save_registry(registry)

    def update_template(
        self,
        template_id: str,
        new_content: str,
        *,
        bump_patch: bool = True,
        title: str | None = None,
        category: str | None = None,
        description: str | None = None,
    ) -> Template:
        """Overwrite a template's Markdown and re-sync registry metadata.

        The registry's placeholder index is recomputed from *new_content*
        and the template version is bumped (patch) unless ``bump_patch``
        is false. Unknown ids raise :class:`KeyError`.
        """
        if not isinstance(new_content, str):
            raise TypeError("new_content must be a string")
        current = self.get(template_id)  # raises KeyError if unknown
        path = self._resolve_file(current.file)
        path.write_text(new_content, encoding="utf-8")

        entry = RegistryEntry(
            id=current.id,
            title=title if title is not None else current.title,
            file=current.file,
            version=_bump_patch(current.version) if bump_patch else current.version,
            category=category if category is not None else current.category,
            description=description if description is not None else current.description,
            placeholders=extract_placeholders(new_content),
        )
        self._upsert_entry(entry)
        return self.get(template_id)

    def create_template(
        self,
        template_id: str,
        content: str,
        *,
        title: str | None = None,
        category: str = "general",
        description: str = "",
        version: str = "1.0.0",
    ) -> Template:
        """Create a new template file + registry entry. Fails if the id exists."""
        self._check_id(template_id)
        if not isinstance(content, str):
            raise TypeError("content must be a string")
        if template_id in self.list_ids():
            raise ValueError(f"Template '{template_id}' already exists")
        filename = f"{template_id}.md"
        path = self._resolve_file(filename)
        if path.exists():
            raise ValueError(f"Template file already exists: {filename}")
        path.write_text(content, encoding="utf-8")
        self._upsert_entry(
            RegistryEntry(
                id=template_id,
                title=title or template_id,
                file=filename,
                version=version,
                category=category,
                description=description,
                placeholders=extract_placeholders(content),
            )
        )
        return self.get(template_id)

    def validate_registry(self) -> dict[str, Any]:
        """Check the registry against the files on disk (read-only report)."""
        issues: list[str] = []
        mismatched: list[str] = []
        for entry in self._entries():
            path = self._resolve_file(entry.file)
            if not path.exists():
                issues.append(f"{entry.id}: file missing ({entry.file})")
                continue
            on_disk = extract_placeholders(path.read_text(encoding="utf-8"))
            if on_disk != entry.placeholders:
                mismatched.append(entry.id)
        return {"ok": not issues, "issues": issues, "placeholder_mismatch": mismatched}

    def sync_registry(self) -> dict[str, Any]:
        """Recompute placeholder indexes from the files on disk.

        A future editor can call this (or just use :meth:`update_template` /
        :meth:`create_template`, which already keep the index in sync).
        File-missing entries are reported, not silently deleted.
        """
        registry = self.load_registry()
        fixed: list[str] = []
        for item in registry.get("templates", []):
            if not isinstance(item, dict) or "id" not in item or "file" not in item:
                continue
            path = self._resolve_file(str(item["file"]))
            if not path.exists():
                continue
            placeholders = extract_placeholders(path.read_text(encoding="utf-8"))
            if item.get("placeholders") != placeholders:
                item["placeholders"] = placeholders
                fixed.append(str(item["id"]))
        self._save_registry(registry)
        report = self.validate_registry()
        return {"fixed": fixed, "registry": report}
