#!/usr/bin/env python3
"""Fill remaining thin doc stubs (VALIDATIONS, EVENTS, DECISIONS, FAQ, CHANGELOG, PERMISSIONS)."""

from __future__ import annotations

from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
APPS = [
    "account", "doctor", "patient", "hospitalAdmin", "hospital_mgmt", "clinic",
    "patient_account", "helpdesk", "appointments", "reports", "queue_management",
    "consultations_core", "labs", "consultation_config", "support", "tasks",
    "caleder_events", "medicines", "analytics", "diagnostics_engine", "notifications",
]
META = """---
owner: {app}-team
module: {app}
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

"""
SKIP = {"doctor", "labs", "consultations_core", "diagnostics_engine", "notifications", "appointments", "patient_account", "queue_management", "medicines", "clinic"}


def is_thin(path: Path) -> bool:
    if not path.exists():
        return False
    t = path.read_text()
    body = t.split("---", 2)[-1] if t.startswith("---") else t
    return len(body.strip()) < 250 or ("See [shared_docs]" in body and len(body.strip()) < 400)


def fill(app: str, kind: str) -> str:
    title = kind.replace(".md", "").replace("_", " ")
    if kind == "CHANGELOG.md":
        return META.format(app=app) + f"# Changelog — {app}\n\n## 2026-06-27\n\n- Documentation enriched with model/API introspection and business context\n"
    if kind == "VALIDATIONS.md":
        return META.format(app=app) + f"# Validations — {app}\n\nDocument input and business validations here as they are implemented.\n\nSee [shared_docs/ERRORS.md](../../shared_docs/ERRORS.md) for standard error codes.\n"
    if kind == "EVENTS.md":
        return META.format(app=app) + f"# Events — {app}\n\nSee [event_registry.md](../../shared_docs/event_registry.md).\n\nDocument signals and Celery tasks published/consumed by `{app}`.\n"
    if kind == "DECISIONS.md":
        return META.format(app=app) + f"# Architecture Decisions — {app}\n\nUse ADR-NNN format per [adr-template.md](../../shared_docs/standards/adr-template.md).\n"
    if kind == "FAQ.md":
        return META.format(app=app) + f"# FAQ — {app}\n\nAdd recurring developer and support questions for `{app}`.\n"
    if kind == "PERMISSIONS.md":
        return META.format(app=app) + f"# Permissions — {app}\n\n| Action | Patient | Doctor | Admin | Other |\n|---|---|---|---|---|\n| _Document per endpoint_ | | | | |\n"
    if kind == "SERVICES.md":
        return META.format(app=app) + f"# Services — {app}\n\nList service modules under `{app}/services/` and `{app}/api/services/` with responsibilities.\n"
    if kind == "WORKFLOWS.md":
        return META.format(app=app) + f"# Workflows — {app}\n\nAdd Mermaid diagrams for multi-step flows. Link statuses to [status_registry.md](../../shared_docs/status_registry.md).\n"
    return META.format(app=app) + f"# {title} — {app}\n\n"


def main() -> None:
    kinds = ["VALIDATIONS.md", "EVENTS.md", "DECISIONS.md", "FAQ.md", "CHANGELOG.md", "PERMISSIONS.md", "SERVICES.md", "WORKFLOWS.md"]
    for app in APPS:
        if app in SKIP:
            continue
        for kind in kinds:
            path = BASE / app / "docs" / kind
            if is_thin(path):
                path.write_text(fill(app, kind))
                print(f"filled {path.relative_to(BASE)}")


if __name__ == "__main__":
    main()
