#!/usr/bin/env python3
"""Generate MODELS.md sections by parsing Python model files (no Django required)."""

from __future__ import annotations

import ast
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
MARKER_START = "<!-- auto-generated:start -->"
MARKER_END = "<!-- auto-generated:end -->"


def _model_bases_model(node: ast.ClassDef) -> bool:
    for base in node.bases:
        name = ""
        if isinstance(base, ast.Attribute):
            name = base.attr
        elif isinstance(base, ast.Name):
            name = base.id
        if name in ("Model", "BaseModel", "BasePreConsultationSection"):
            return True
    return False


def _field_summary(node: ast.ClassDef) -> list[str]:
    fields = []
    for item in node.body:
        if isinstance(item, ast.Assign):
            for target in item.targets:
                if isinstance(target, ast.Name):
                    fields.append(target.id)
        elif isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
            fields.append(item.target.id)
    return fields


def _extract_models(py_path: Path) -> list[tuple[str, list[str]]]:
    try:
        tree = ast.parse(py_path.read_text())
    except SyntaxError:
        return []
    out = []
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and _model_bases_model(node):
            out.append((node.name, _field_summary(node)))
    return out


def collect_models(app: str) -> list[tuple[str, list[str], str]]:
    app_dir = BASE_DIR / app
    results = []
    models_py = app_dir / "models.py"
    if models_py.exists() and models_py.stat().st_size > 50:
        for name, fields in _extract_models(models_py):
            results.append((name, fields, str(models_py.relative_to(BASE_DIR))))
    models_pkg = app_dir / "models"
    if models_pkg.is_dir():
        for py in sorted(models_pkg.glob("*.py")):
            if py.name.startswith("_"):
                continue
            for name, fields in _extract_models(py):
                results.append((name, fields, str(py.relative_to(BASE_DIR))))
    return results


def generate_section(app: str) -> str:
    models = collect_models(app)
    lines = [MARKER_START, f"## Model reference (auto-generated from source)", ""]
    if not models:
        lines.append("_No concrete models found in models.py or models/_")
        lines.append("")
        lines.append(MARKER_END)
        return "\n".join(lines)

    for name, fields, source in models:
        lines.append(f"### `{name}`")
        lines.append("")
        lines.append(f"- **Source:** `{source}`")
        if fields:
            display = fields[:25]
            suffix = f" (+{len(fields)-25} more)" if len(fields) > 25 else ""
            lines.append(f"- **Fields:** {', '.join(f'`{f}`' for f in display)}{suffix}")
        lines.append("")

    lines.append(MARKER_END)
    return "\n".join(lines)


def update_models_md(app: str) -> None:
    path = BASE_DIR / app / "docs" / "MODELS.md"
    if not path.exists():
        print(f"skip {app}: no MODELS.md")
        return
    content = path.read_text()
    section = generate_section(app)
    if MARKER_START in content:
        before = content.split(MARKER_START)[0].rstrip()
        after = content.split(MARKER_END, 1)[-1] if MARKER_END in content else ""
        new_content = before + "\n\n" + section + "\n" + after.lstrip("\n")
    else:
        new_content = content.rstrip() + "\n\n" + section + "\n"
    path.write_text(new_content)
    print(f"updated {path} ({len(collect_models(app))} models)")


def main() -> None:
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("app", nargs="?")
    p.add_argument("--all", action="store_true")
    args = p.parse_args()
    apps = [
        "account", "doctor", "patient", "hospitalAdmin", "hospital_mgmt", "clinic",
        "patient_account", "helpdesk", "appointments", "reports", "queue_management",
        "consultations_core", "labs", "consultation_config", "support", "tasks",
        "caleder_events", "medicines", "analytics", "diagnostics_engine", "notifications",
    ]
    targets = apps if args.all else [args.app] if args.app else []
    for app in targets:
        update_models_md(app)


if __name__ == "__main__":
    main()
