"""Generate and persist prescription PDFs at consultation completion."""

from __future__ import annotations

import logging
from io import BytesIO

from django.core.files.base import ContentFile
from django.template.loader import render_to_string

from consultations_core.services.consultation_summary_service import build_consultation_summary

logger = logging.getLogger(__name__)


def generate_and_persist_prescription_pdf(*, prescription, base_url: str = "/") -> bool:
    """
    Render WeasyPrint PDF for the prescription consultation and save to pdf_file.
    Returns True on success; False on failure (never raises).
    """
    consultation_id = prescription.consultation_id
    try:
        summary = build_consultation_summary(
            consultation_id=consultation_id,
            profile="preview_pdf",
        )
        if not summary:
            logger.warning("prescription_pdf_empty_summary prescription_id=%s", prescription.id)
            return False

        html = render_to_string("prescriptions/prescription.html", summary).strip()
        from weasyprint import HTML

        pdf_binary = HTML(string=html, base_url=base_url).write_pdf()
        filename = f"prescription-{prescription.id}.pdf"
        # Finalized prescriptions are immutable — persist PDF without re-running save() validation.
        prescription.pdf_file.save(filename, ContentFile(pdf_binary), save=False)
        type(prescription).objects.filter(pk=prescription.pk).update(pdf_file=prescription.pdf_file.name)
        logger.info(
            "prescription_pdf_persisted prescription_id=%s consultation_id=%s",
            prescription.id,
            consultation_id,
        )
        return True
    except Exception:
        logger.exception(
            "prescription_pdf_generation_failed prescription_id=%s consultation_id=%s",
            prescription.id,
            consultation_id,
        )
        return False
