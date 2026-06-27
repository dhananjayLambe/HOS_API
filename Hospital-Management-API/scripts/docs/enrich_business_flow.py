#!/usr/bin/env python3
"""Fill thin BUSINESS_FLOW.md stubs with app introspection data."""

from __future__ import annotations

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]

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


def _list_py(dir_path: Path, limit: int = 15) -> list[str]:
    if not dir_path.is_dir():
        return []
    return sorted(p.name for p in dir_path.glob("*.py") if p.name != "__init__.py")[:limit]


def build_business_flow(app: str) -> str:
    app_dir = BASE_DIR / app
    services = _list_py(app_dir / "services") + _list_py(app_dir / "api" / "services")
    models_count = len(list((app_dir / "models").glob("*.py"))) if (app_dir / "models").is_dir() else (1 if (app_dir / "models.py").exists() else 0)
    has_signals = (app_dir / "signals.py").exists()

    lines = [
        META.format(app=app),
        f"# Business Flow — {app}",
        "",
        "## Purpose",
        "",
        f"Django app `{app}` in DoctorProCare backend. See [ownership.md](../../shared_docs/ownership.md) for entity ownership.",
        "",
        "## Code layout",
        "",
        f"| Area | Location |",
        f"|---|---|",
        f"| Models | `{app}/models/` or `models.py` ({models_count} module(s)) |",
        f"| API | `{app}/api/` |",
        f"| Services | {', '.join(f'`{s}`' for s in services) if services else '_none_'} |",
        f"| Signals | {'`signals.py`' if has_signals else '_none_'} |",
        "",
        "## Integration",
        "",
        f"See [DEPENDENCIES.md](../../shared_docs/DEPENDENCIES.md#{app}) and [{app}/AI_CONTEXT.md](../AI_CONTEXT.md).",
        "",
        "## API base path",
        "",
        f"Check `main/urls.py` for `/api/.../` prefix mapping to `{app}`.",
        "",
    ]
    return "\n".join(lines)


def is_stub(path: Path) -> bool:
    if not path.exists():
        return False
    text = path.read_text()
    body = text.split("---", 2)[-1] if text.startswith("---") else text
    return len(body.strip()) < 200 or "See [shared_docs]" in body


def main() -> None:
    for app in APPS:
        bf = BASE_DIR / app / "docs" / "BUSINESS_FLOW.md"
        if is_stub(bf):
            bf.write_text(build_business_flow(app))
            print(f"filled {bf}")


if __name__ == "__main__":
    main()
