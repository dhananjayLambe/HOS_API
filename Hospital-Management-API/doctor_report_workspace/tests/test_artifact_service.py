"""Unit tests for ArtifactService presentation pipeline."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from django.test import SimpleTestCase

from doctor_report_workspace.services.artifacts.artifact_service import ArtifactService
from doctor_report_workspace.services.artifacts.label_resolver import ArtifactLabelResolver


def _art(**kwargs):
    base = dict(
        id="a1",
        artifact_type="PDF",
        is_primary=False,
        uploaded_at=datetime(2026, 7, 1, 12, 0, 0),
        content_type="application/pdf",
        file_extension="pdf",
        download_filename="report.pdf",
        original_filename="report.pdf",
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


class ArtifactLabelResolverTests(SimpleTestCase):
    def test_label_matrix(self):
        self.assertEqual(
            ArtifactLabelResolver.resolve(artifact_type="PDF", is_primary=True),
            "Primary Report",
        )
        self.assertEqual(
            ArtifactLabelResolver.resolve(artifact_type="IMAGE", is_primary=True),
            "Primary Image",
        )
        self.assertEqual(
            ArtifactLabelResolver.resolve(artifact_type="OTHER", is_primary=True),
            "Primary Attachment",
        )
        self.assertEqual(
            ArtifactLabelResolver.resolve(artifact_type="IMAGE", is_primary=False),
            "Supplementary Image",
        )
        self.assertEqual(
            ArtifactLabelResolver.resolve(artifact_type="PDF", is_primary=False),
            "Supplementary Report",
        )
        self.assertEqual(
            ArtifactLabelResolver.resolve(artifact_type="DICOM", is_primary=False),
            "Imaging Study",
        )
        self.assertEqual(
            ArtifactLabelResolver.resolve(artifact_type="CSV", is_primary=True),
            "Primary CSV",
        )
        self.assertEqual(
            ArtifactLabelResolver.resolve(artifact_type="DOCX", is_primary=False),
            "Word Document",
        )


class ArtifactServiceTests(SimpleTestCase):
    def test_empty(self):
        self.assertEqual(ArtifactService.present([]), ())

    def test_primary_first_and_labels(self):
        primary = _art(id="p", is_primary=True, uploaded_at=datetime(2026, 7, 1))
        secondary = _art(
            id="s",
            artifact_type="IMAGE",
            is_primary=False,
            uploaded_at=datetime(2026, 7, 2),
            content_type="image/png",
            file_extension="png",
            download_filename="scan.png",
        )
        out = ArtifactService.present([secondary, primary])
        self.assertEqual(len(out), 2)
        self.assertEqual(out[0].artifact_id, "p")
        self.assertTrue(out[0].is_primary)
        self.assertEqual(out[0].label, "Primary Report")
        self.assertEqual(out[1].label, "Supplementary Image")
        self.assertFalse(out[1].is_primary)

    def test_type_bucketing_and_preview_metadata(self):
        dicom = _art(
            id="d",
            artifact_type="DICOM",
            is_primary=True,
            content_type="application/dicom",
            file_extension="dcm",
            download_filename="study.dcm",
        )
        out = ArtifactService.present([dicom])
        self.assertEqual(out[0].artifact_type, "DICOM")
        self.assertEqual(out[0].preview_metadata.content_category, "OTHER")
        self.assertFalse(out[0].preview_metadata.preview_supported)
        self.assertEqual(out[0].preview_metadata.display_title, "study.dcm")

        csv = _art(
            id="c1",
            artifact_type="CSV",
            is_primary=True,
            content_type="text/csv",
            file_extension="csv",
            download_filename="results.csv",
        )
        csv_meta = ArtifactService.present([csv])[0]
        self.assertEqual(csv_meta.artifact_type, "CSV")
        self.assertTrue(csv_meta.preview_metadata.preview_supported)
        self.assertEqual(csv_meta.preview_metadata.content_category, "TEXT")

        docx = _art(
            id="w1",
            artifact_type="DOCX",
            is_primary=True,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            file_extension="docx",
            download_filename="report.docx",
        )
        docx_pres = ArtifactService.present([docx])[0]
        self.assertEqual(docx_pres.artifact_type, "DOCX")
        self.assertFalse(docx_pres.preview_metadata.preview_supported)
        self.assertEqual(docx_pres.preview_metadata.content_category, "OFFICE")

        pdf = _art(id="pdf1", is_primary=True)
        meta = ArtifactService.present([pdf])[0].preview_metadata
        self.assertEqual(meta.content_category, "DOCUMENT")
        self.assertTrue(meta.preview_supported)
        self.assertEqual(meta.mime_type, "application/pdf")

    def test_fallback_primary_newest(self):
        older = _art(id="old", is_primary=False, uploaded_at=datetime(2026, 6, 1))
        newer = _art(id="new", is_primary=False, uploaded_at=datetime(2026, 7, 1))
        out = ArtifactService.present([older, newer])
        self.assertEqual(out[0].artifact_id, "new")
        self.assertTrue(out[0].is_primary)
        self.assertEqual(sum(1 for p in out if p.is_primary), 1)

    def test_secondaries_ordered_uploaded_at_asc(self):
        primary = _art(id="p", is_primary=True, uploaded_at=datetime(2026, 7, 1))
        older = _art(
            id="old",
            is_primary=False,
            uploaded_at=datetime(2026, 6, 1),
            artifact_type="IMAGE",
        )
        newer = _art(
            id="new",
            is_primary=False,
            uploaded_at=datetime(2026, 7, 2),
            artifact_type="CSV",
        )
        out = ArtifactService.present([newer, primary, older])
        self.assertEqual([p.artifact_id for p in out], ["p", "old", "new"])

    def test_resolve_preview_prefers_primary_pdf(self):
        primary = _art(id="p", is_primary=True, artifact_type="PDF")
        image = _art(
            id="i",
            is_primary=False,
            artifact_type="IMAGE",
            uploaded_at=datetime(2026, 7, 2),
            content_type="image/png",
            file_extension="png",
        )
        chosen = ArtifactService.resolve_preview([image, primary])
        self.assertIsNotNone(chosen)
        self.assertEqual(chosen.artifact_id, "p")
        self.assertEqual(chosen.artifact_type, "PDF")

    def test_resolve_preview_image_when_primary_other(self):
        other = _art(
            id="o",
            is_primary=True,
            artifact_type="OTHER",
            content_type="application/zip",
            file_extension="zip",
            download_filename="pack.zip",
        )
        image = _art(
            id="i",
            is_primary=False,
            artifact_type="IMAGE",
            uploaded_at=datetime(2026, 7, 2),
            content_type="image/png",
            file_extension="png",
            download_filename="scan.png",
        )
        chosen = ArtifactService.resolve_preview([other, image])
        self.assertIsNotNone(chosen)
        self.assertEqual(chosen.artifact_id, "i")
        self.assertEqual(chosen.artifact_type, "IMAGE")

    def test_resolve_preview_other_only_returns_none(self):
        other = _art(
            id="o",
            is_primary=True,
            artifact_type="DICOM",
            content_type="application/dicom",
            file_extension="dcm",
            download_filename="study.dcm",
        )
        self.assertIsNone(ArtifactService.resolve_preview([other]))
