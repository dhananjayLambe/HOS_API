"""Extract searchable identifiers from audit rows / resolved workflows."""

from __future__ import annotations

from typing import Any

from support_trace.identifiers.extraction_registry import ExtractionRegistry
from support_trace.identifiers.lookup_keys import IDENTIFIER_FIELDS


class IdentifierResolver:
    """Builds the identifiers dict for Support Trace index columns."""

    @classmethod
    def from_business_audit(cls, audit: Any) -> dict[str, str]:
        return ExtractionRegistry.extract(audit, source="BusinessAudit")

    @classmethod
    def from_clinical_audit(cls, audit: Any) -> dict[str, str]:
        return ExtractionRegistry.extract(audit, source="ClinicalAudit")

    @classmethod
    def merge(
        cls,
        *sources: dict[str, str] | None,
    ) -> dict[str, str]:
        return ExtractionRegistry.merge(*sources)
