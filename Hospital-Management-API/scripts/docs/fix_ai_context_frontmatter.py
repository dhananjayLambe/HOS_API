#!/usr/bin/env python3
"""Fix AI_CONTEXT.md: YAML frontmatter must be first line."""

from __future__ import annotations
import re
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]

for path in BASE.glob("*/AI_CONTEXT.md"):
    text = path.read_text()
    if text.startswith("---"):
        continue
    m = re.search(r"(---\n.*?\n---)", text, re.DOTALL)
    if not m:
        continue
    fm = m.group(1)
    rest = text.replace(fm, "").strip()
    # rest starts with # title
    path.write_text(fm + "\n\n" + rest + "\n")
    print(f"fixed {path}")