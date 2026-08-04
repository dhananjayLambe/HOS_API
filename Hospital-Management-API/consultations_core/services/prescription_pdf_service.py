"""Generate and persist prescription PDFs at consultation completion."""

from __future__ import annotations

from io import BytesIO

from django.core.files.base import ContentFile
from django.template.loader import render_to_string

from shared.logging import LogModule, logger

from consultations_core.services.consultation_summary_service import build_consultation_summary


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
            logger.warning(
                f"prescription_pdf_empty_summary prescription_id={prescription.id}",
                module=LogModule.PRESCRIPTION,
                action="prescription.pdf.empty_summary",
                metadata={
                    "prescription_id": str(prescription.id),
                    "consultation_id": str(consultation_id),
                },
            )
            return False

        html = render_to_string("prescriptions/prescription.html", summary).strip()
        from weasyprint import HTML

        pdf_binary = HTML(string=html, base_url=base_url).write_pdf()
        filename = f"prescription-{prescription.id}.pdf"
        # Finalized prescriptions are immutable — persist PDF without re-running save() validation.
        prescription.pdf_file.save(filename, ContentFile(pdf_binary), save=False)
        type(prescription).objects.filter(pk=prescription.pk).update(pdf_file=prescription.pdf_file.name)
        logger.info(
            f"prescription_pdf_persisted prescription_id={prescription.id} consultation_id={consultation_id}",
            module=LogModule.PRESCRIPTION,
            action="prescription.pdf.persisted",
            metadata={
                "prescription_id": str(prescription.id),
                "consultation_id": str(consultation_id),
            },
        )
        return True
    except Exception:
        logger.exception(
            f"prescription_pdf_generation_failed prescription_id={prescription.id} consultation_id={consultation_id}",
            module=LogModule.PRESCRIPTION,
            action="prescription.pdf.generation_failed",
            metadata={
                "prescription_id": str(prescription.id),
                "consultation_id": str(consultation_id),
            },
        )
        return False
