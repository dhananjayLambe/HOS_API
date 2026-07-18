"""Canonical unit tests for search normalization and predicates."""

from __future__ import annotations

from django.db.models import Q
from django.test import SimpleTestCase

from doctor_report_workspace.search.normalize import normalize_search_term
from doctor_report_workspace.search.search_predicates import WorkspaceSearchPredicates


class NormalizeSearchTermTests(SimpleTestCase):
    def test_collapses_internal_whitespace(self):
        self.assertEqual(normalize_search_term("  John   Smith "), "John Smith")

    def test_preserves_leading_zeros_and_punctuation(self):
        self.assertEqual(normalize_search_term(" PAT-001 "), "PAT-001")
        self.assertEqual(normalize_search_term(" 00123 "), "00123")

    def test_empty_and_none(self):
        self.assertEqual(normalize_search_term(""), "")
        self.assertEqual(normalize_search_term("   "), "")
        self.assertEqual(normalize_search_term(None), "")


class WorkspaceSearchPredicatesTests(SimpleTestCase):
    def test_empty_term_returns_empty_q(self):
        self.assertEqual(WorkspaceSearchPredicates.build(""), Q())

    def test_identifier_exact_and_prefix(self):
        q = WorkspaceSearchPredicates.build("PAT-100")
        children = q.children
        keys = {c[0] for c in children if isinstance(c, tuple)}
        # Flatten OR tree — check string representation for strategy lookups
        text = str(q)
        self.assertIn("public_id__iexact", text)
        self.assertIn("public_id__istartswith", text)

    def test_report_number_exact_and_prefix(self):
        text = str(WorkspaceSearchPredicates.build("R-100"))
        self.assertIn("report_number__iexact", text)
        self.assertIn("report_number__istartswith", text)

    def test_mobile_exact_and_suffix(self):
        text = str(WorkspaceSearchPredicates.build("9876543210"))
        self.assertIn("username__iexact", text)
        self.assertIn("username__iendswith", text)

    def test_patient_name_partial(self):
        text = str(WorkspaceSearchPredicates.build("Ada"))
        self.assertIn("first_name__icontains", text)
        self.assertIn("last_name__icontains", text)

    def test_service_and_lab_partial(self):
        text = str(WorkspaceSearchPredicates.build("CBC"))
        self.assertIn("service__name__icontains", text)
        self.assertIn("branch_name__icontains", text)

    def test_order_line_variant_omits_report_number(self):
        text = str(WorkspaceSearchPredicates.build_for_order_line("CBC"))
        self.assertNotIn("report_number", text)
        self.assertIn("order__patient_profile", text)
        self.assertIn("service__name__icontains", text)

    def test_multi_token_patient_name(self):
        text = str(WorkspaceSearchPredicates.build("Ada Lovelace"))
        self.assertIn("first_name__icontains", text)
        self.assertIn("last_name__icontains", text)
