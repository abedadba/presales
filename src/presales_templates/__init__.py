"""Lead document templates (PS-3).

Load, render, and modify ``templates/*.md`` via :class:`TemplateStore`.
"""

from .store import RegistryEntry, Template, TemplateStore, default_templates_dir, extract_placeholders

__all__ = [
    "RegistryEntry",
    "Template",
    "TemplateStore",
    "default_templates_dir",
    "extract_placeholders",
]

__version__ = "0.1.0"
