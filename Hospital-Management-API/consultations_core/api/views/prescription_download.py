"""Public prescription PDF download (Phase 1 — no token)."""

from django.http import FileResponse, Http404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from consultations_core.models.prescription import Prescription, PrescriptionStatus


class PrescriptionDownloadAPIView(APIView):
    """GET /api/v1/prescriptions/<uuid:prescription_id>/download/"""

    permission_classes = [AllowAny]

    def get(self, request, prescription_id):
        try:
            prescription = Prescription.objects.get(
                pk=prescription_id,
                is_active=True,
                status=PrescriptionStatus.FINALIZED,
            )
        except Prescription.DoesNotExist as exc:
            raise Http404("Prescription not found.") from exc

        if not prescription.pdf_file:
            raise Http404("Prescription PDF is not available.")

        filename = prescription.pdf_file.name.split("/")[-1] or f"prescription-{prescription_id}.pdf"
        return FileResponse(
            prescription.pdf_file.open("rb"),
            as_attachment=False,
            filename=filename,
            content_type="application/pdf",
        )
