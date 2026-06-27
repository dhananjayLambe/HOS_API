#!/usr/bin/env python3
"""Scaffold per-app documentation from templates."""

from __future__ import annotations

import argparse
import re
from datetime import date
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = BASE_DIR / "shared_docs" / "standards" / "doc-templates"

MANDATORY_DOCS = ["README.md", "BUSINESS_FLOW.md", "MODELS.md", "API.md", "CHANGELOG.md"]

CONDITIONAL_DOCS = [
    "SERVICES.md",
    "WORKFLOWS.md",
    "PERMISSIONS.md",
    "VALIDATIONS.md",
    "EVENTS.md",
    "DECISIONS.md",
    "FAQ.md",
    "INVARIANTS.md",
    "ERRORS.md",
    "TESTING.md",
]

# Apps with services/, multi-step flows, etc.
FULL_TIER_APPS = {
    "diagnostics_engine",
    "consultations_core",
    "labs",
    "doctor",
}

TIER2_APPS = {
    "appointments",
    "notifications",
    "patient_account",
    "clinic",
    "queue_management",
    "medicines",
}

DJANGO_APPS = [
    "account",
    "doctor",
    "patient",
    "hospitalAdmin",
    "hospital_mgmt",
    "clinic",
    "patient_account",
    "helpdesk",
    "appointments",
    "reports",
    "queue_management",
    "consultations_core",
    "labs",
    "consultation_config",
    "support",
    "tasks",
    "caleder_events",
    "medicines",
    "analytics",
    "diagnostics_engine",
    "notifications",
]

TODAY = date.today().isoformat()

METADATA = """---
owner: {app}-team
module: {app}
version: 1.0
last_updated: {date}
reviewed_by: —
status: draft
---

"""


def _render(template_name: str, app: str) -> str:
    path = TEMPLATES_DIR / template_name
    if path.exists():
        text = path.read_text()
        return text.replace("{app_name}", app).replace("{app}", app).replace("{date}", TODAY)
    return METADATA.format(app=app, date=TODAY) + f"# {template_name.replace('.tpl', '').replace('_', ' ').title()}\n\nTODO\n"


def _default_content(filename: str, app: str) -> str:
    meta = METADATA.format(app=app, date=TODAY)
    titles = {
        "BUSINESS_FLOW.md": "Business Flow",
        "MODELS.md": "Models",
        "API.md": "API Reference",
        "CHANGELOG.md": "Changelog",
        "SERVICES.md": "Services",
        "WORKFLOWS.md": "Workflows",
        "PERMISSIONS.md": "Permissions",
        "VALIDATIONS.md": "Validations",
        "EVENTS.md": "Events",
        "DECISIONS.md": "Architecture Decisions",
        "FAQ.md": "FAQ",
        "INVARIANTS.md": "Module Invariants",
        "ERRORS.md": "Module Errors",
        "TESTING.md": "Testing",
    }
    title = titles.get(filename, filename.replace(".md", ""))
    body = f"# {title} — {app}\n\n"
    if filename == "CHANGELOG.md":
        body += f"\n## {TODAY}\n\n- Initial documentation scaffold (Documentation First v2)\n"
    elif filename == "README.md":
        return _render("README.md.tpl", app)
    else:
        body += "See [shared_docs](../../shared_docs/) for cross-app registries.\n"
    return meta + body


def conditional_files_for_app(app: str, tier: str) -> list[str]:
    if tier == "mandatory":
        return []
    files = []
    app_dir = BASE_DIR / app
    if app in FULL_TIER_APPS or (app_dir / "services").exists() or (app_dir / "api" / "services").exists():
        files.extend(["SERVICES.md", "WORKFLOWS.md", "VALIDATIONS.md", "EVENTS.md", "DECISIONS.md"])
    if app in FULL_TIER_APPS or app in TIER2_APPS:
        files.extend(["PERMISSIONS.md", "FAQ.md"])
    if app == "diagnostics_engine":
        files.append("INVARIANTS.md")
    if app in TIER2_APPS:
        if app == "notifications":
            files.extend(["WORKFLOWS.md", "EVENTS.md"])
        if app == "appointments":
            files.extend(["WORKFLOWS.md", "VALIDATIONS.md"])
        if app == "queue_management":
            files.extend(["WORKFLOWS.md", "EVENTS.md"])
        if app == "medicines":
            files.append("SERVICES.md")
    # dedupe preserve order
    seen = set()
    out = []
    for f in files:
        if f not in seen:
            seen.add(f)
            out.append(f)
    return out


def scaffold_app(app: str, tier: str = "mandatory", force: bool = False) -> list[str]:
    created = []
    app_dir = BASE_DIR / app
    if not app_dir.is_dir():
        print(f"Skip unknown app: {app}")
        return created

    docs_dir = app_dir / "docs"
    docs_dir.mkdir(exist_ok=True)

    all_files = list(MANDATORY_DOCS) + conditional_files_for_app(app, tier)
    for filename in all_files:
        target = docs_dir / filename
        if target.exists() and not force:
            continue
        if filename == "README.md":
            content = _render("README.md.tpl", app)
        else:
            content = _default_content(filename, app)
        target.write_text(content)
        created.append(str(target.relative_to(BASE_DIR)))

    ai_ctx = app_dir / "AI_CONTEXT.md"
    if not ai_ctx.exists() or force:
        ai_ctx.write_text(_render("AI_CONTEXT.md.tpl", app))
        created.append(str(ai_ctx.relative_to(BASE_DIR)))

    return created


def main() -> None:
    parser = argparse.ArgumentParser(description="Scaffold app documentation")
    parser.add_argument("app", nargs="?", help="Django app name")
    parser.add_argument("--all-missing", action="store_true", help="Scaffold all apps")
    parser.add_argument("--tier", choices=["mandatory", "full"], default="full")
    parser.add_argument("--force", action="store_true", help="Overwrite existing stubs")
    args = parser.parse_args()

    apps = DJANGO_APPS if args.all_missing else [args.app] if args.app else []
    if not apps:
        parser.error("Provide app name or --all-missing")

    total = []
    for app in apps:
        total.extend(scaffold_app(app, tier=args.tier, force=args.force))
    print(f"Created/updated {len(total)} files")
    for p in total:
        print(f"  {p}")


if __name__ == "__main__":
    main()
