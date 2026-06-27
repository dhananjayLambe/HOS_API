#!/usr/bin/env python3
"""Append API endpoint tables from api/urls.py via AST (no Django)."""

from __future__ import annotations

import ast
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
MARKER_START = "<!-- auto-generated:api:start -->"
MARKER_END = "<!-- auto-generated:api:end -->"


def _paths_from_tree(tree: ast.AST, source_name: str) -> list[tuple[str, str, str]]:
    rows = []

    def visit(node: ast.AST) -> None:
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id == "path" and len(node.args) >= 2:
                route_arg, view_arg = node.args[0], node.args[1]
                route = route_arg.value if isinstance(route_arg, ast.Constant) else ""
                view = ""
                if isinstance(view_arg, ast.Attribute):
                    view = view_arg.attr
                elif isinstance(view_arg, ast.Name):
                    view = view_arg.id
                elif isinstance(view_arg, ast.Call) and isinstance(view_arg.func, ast.Attribute):
                    view = view_arg.func.attr
                name = ""
                for kw in node.keywords:
                    if kw.arg == "name" and isinstance(kw.value, ast.Constant):
                        name = kw.value.value
                rows.append((route, view or name or "—", source_name))
        for child in ast.iter_child_nodes(node):
            visit(child)

    visit(tree)
    return rows


def _paths_from_file(py_path: Path) -> list[tuple[str, str, str]]:
    try:
        tree = ast.parse(py_path.read_text())
    except SyntaxError:
        return []
    return _paths_from_tree(tree, py_path.name)


def collect_routes(app: str) -> list[tuple[str, str, str]]:
    app_dir = BASE_DIR / app
    rows = []
    candidates = list(app_dir.glob("api/**/urls.py")) + list(app_dir.glob("api/urls.py"))
    # de-dupe by resolved path
    seen_paths: set[Path] = set()
    for p in sorted(candidates):
        rp = p.resolve()
        if rp in seen_paths:
            continue
        seen_paths.add(rp)
        rows.extend(_paths_from_file(p))
    return rows


def generate_section(app: str) -> str:
    rows = collect_routes(app)
    lines = [MARKER_START, "## Endpoint index (auto-generated from urls.py)", ""]
    if not rows:
        lines.append("_No routes found under api/urls.py_")
    else:
        lines.append("| Route | View | Source |")
        lines.append("|---|---|---|")
        for route, view, src in rows[:80]:
            lines.append(f"| `{route}` | {view} | {src} |")
        if len(rows) > 80:
            lines.append(f"| ... | +{len(rows)-80} more routes | |")
    lines.append("")
    lines.append(MARKER_END)
    return "\n".join(lines)


def update_api_md(app: str) -> None:
    path = BASE_DIR / app / "docs" / "API.md"
    if not path.exists():
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
    print(f"updated {path} ({len(collect_routes(app))} routes)")


def main() -> None:
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--all", action="store_true")
    p.add_argument("app", nargs="?")
    args = p.parse_args()
    apps = [
        "account", "doctor", "patient", "hospitalAdmin", "hospital_mgmt", "clinic",
        "patient_account", "helpdesk", "appointments", "reports", "queue_management",
        "consultations_core", "labs", "consultation_config", "support", "tasks",
        "caleder_events", "medicines", "analytics", "diagnostics_engine", "notifications",
    ]
    for app in (apps if args.all else [args.app]):
        if app:
            update_api_md(app)


if __name__ == "__main__":
    main()
