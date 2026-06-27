#!/usr/bin/env python3
"""Generate MODELS.md scaffold sections from Django model introspection."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "main.settings")

MARKER_START = "<!-- auto-generated:start -->"
MARKER_END = "<!-- auto-generated:end -->"


def generate_section(app_label: str) -> str:
    import django

    django.setup()
    from django.apps import apps

    lines = [MARKER_START, f"## Auto-generated model index — {app_label}", ""]
    try:
        app_config = apps.get_app_config(app_label)
    except LookupError:
        return f"{MARKER_START}\nApp not found: {app_label}\n{MARKER_END}"

    for model in app_config.get_models():
        lines.append(f"### {model.__name__}")
        lines.append("")
        lines.append(f"- **Table:** `{model._meta.db_table}`")
        field_names = [f.name for f in model._meta.get_fields() if getattr(f, "column", None) or f.many_to_many or f.one_to_many]
        if field_names:
            lines.append(f"- **Fields:** {', '.join(field_names[:20])}{'...' if len(field_names) > 20 else ''}")
        lines.append("")

    lines.append(MARKER_END)
    return "\n".join(lines)


def update_models_md(app_label: str) -> None:
    models_path = BASE_DIR / app_label / "docs" / "MODELS.md"
    if not models_path.exists():
        print(f"Missing {models_path}; run scaffold first")
        return

    content = models_path.read_text()
    section = generate_section(app_label)

    if MARKER_START in content:
        before = content.split(MARKER_START)[0].rstrip()
        after_parts = content.split(MARKER_END, 1)
        after = after_parts[1] if len(after_parts) > 1 else ""
        new_content = before + "\n\n" + section + after
    else:
        new_content = content.rstrip() + "\n\n" + section + "\n"

    models_path.write_text(new_content)
    print(f"Updated {models_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("app", help="Django app label")
    args = parser.parse_args()
    update_models_md(args.app)


if __name__ == "__main__":
    main()
