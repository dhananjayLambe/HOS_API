#!/usr/bin/env python3
"""Validate documentation structure and freshness (warn-only by default)."""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date, datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]

DJANGO_APPS = [
    "account", "doctor", "patient", "hospitalAdmin", "hospital_mgmt", "clinic",
    "patient_account", "helpdesk", "appointments", "reports", "queue_management",
    "consultations_core", "labs", "consultation_config", "support", "tasks",
    "caleder_events", "medicines", "analytics", "diagnostics_engine", "notifications",
]

MANDATORY_DOCS = ["README.md", "BUSINESS_FLOW.md", "MODELS.md", "API.md", "CHANGELOG.md"]
STALE_DAYS = 90
FRONTMATTER_DATE = re.compile(r"^last_updated:\s*(\S+)", re.MULTILINE)
FRONTMATTER_STATUS = re.compile(r"^status:\s*(\S+)", re.MULTILINE)


def check_structure(warnings: list[str]) -> None:
    for app in DJANGO_APPS:
        docs_dir = BASE_DIR / app / "docs"
        ai_ctx = BASE_DIR / app / "AI_CONTEXT.md"
        if not docs_dir.is_dir():
            warnings.append(f"[structure] Missing docs/ for app: {app}")
            continue
        for name in MANDATORY_DOCS:
            if not (docs_dir / name).exists():
                warnings.append(f"[structure] Missing {app}/docs/{name}")
        if not ai_ctx.exists():
            warnings.append(f"[structure] Missing {app}/AI_CONTEXT.md")


def check_metadata_stale(warnings: list[str]) -> None:
    today = date.today()
    for md in BASE_DIR.rglob("*.md"):
        if "node_modules" in md.parts:
            continue
        rel = md.relative_to(BASE_DIR)
        if rel.parts[0] not in DJANGO_APPS and rel.parts[0] != "shared_docs":
            continue
        text = md.read_text(errors="ignore")
        status_m = FRONTMATTER_STATUS.search(text)
        date_m = FRONTMATTER_DATE.search(text)
        if not status_m or status_m.group(1) != "approved":
            continue
        if not date_m:
            warnings.append(f"[metadata] approved doc missing last_updated: {rel}")
            continue
        try:
            updated = datetime.strptime(date_m.group(1), "%Y-%m-%d").date()
        except ValueError:
            warnings.append(f"[metadata] invalid last_updated in {rel}")
            continue
        if (today - updated).days > STALE_DAYS:
            warnings.append(f"[metadata] stale approved doc (>{STALE_DAYS}d): {rel}")


def check_shared_registries(warnings: list[str]) -> None:
    required = [
        "shared_docs/status_registry.md",
        "shared_docs/ownership.md",
        "shared_docs/INVARIANTS.md",
        "shared_docs/CONFIGURATION.md",
        "shared_docs/glossary/healthcare_terms.md",
    ]
    for path in required:
        if not (BASE_DIR / path).exists():
            warnings.append(f"[registry] Missing {path}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true", help="Exit 1 on warnings")
    args = parser.parse_args()

    warnings: list[str] = []
    check_structure(warnings)
    check_shared_registries(warnings)
    check_metadata_stale(warnings)

    if warnings:
        print("Documentation check warnings:")
        for w in warnings:
            print(f"  {w}")
        return 1 if args.strict else 0

    print("Documentation checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
