"""Artifact label generation — presentation-owned, not frontend-hardcoded."""

from __future__ import annotations

_KNOWN = frozenset(
    {"PDF", "IMAGE", "CSV", "XLSX", "DOCX", "TXT", "ZIP", "DICOM", "OTHER"}
)


class ArtifactLabelResolver:
    """Resolve human-readable labels from type + primary flag."""

    @classmethod
    def resolve(cls, *, artifact_type: str, is_primary: bool) -> str:
        bucket = (artifact_type or "OTHER").upper()
        if bucket not in _KNOWN:
            bucket = "OTHER"

        if is_primary:
            return {
                "PDF": "Primary Report",
                "IMAGE": "Primary Image",
                "CSV": "Primary CSV",
                "XLSX": "Primary Spreadsheet",
                "DOCX": "Primary Word Document",
                "TXT": "Primary Text",
                "ZIP": "Primary Archive",
                "DICOM": "Primary Imaging Study",
            }.get(bucket, "Primary Attachment")

        return {
            "PDF": "Supplementary Report",
            "IMAGE": "Supplementary Image",
            "CSV": "CSV Export",
            "XLSX": "Spreadsheet",
            "DOCX": "Word Document",
            "TXT": "Text File",
            "ZIP": "Archive",
            "DICOM": "Imaging Study",
        }.get(bucket, "Additional Attachment")
