"""Tests for shared patient name search Q builder."""

from django.test import TestCase

from labs.api.services.patient_search import patient_profile_name_search_q
from labs.tests.support.workflow_factories import lab_admin_client, lab_mode_assignment


class PatientProfileNameSearchQTests(TestCase):
    def test_full_name_matches_both_tokens(self):
        from labs.models import LabOrderAssignment
        from labs.tests.support.workflow_factories import lab_admin_client

        _client, _lab_user, branch, _org = lab_admin_client()
        assignment, order = lab_mode_assignment(branch)
        profile = order.patient_profile
        profile.first_name = "SearchFirst"
        profile.last_name = "SearchLast"
        profile.save(update_fields=["first_name", "last_name"])

        other_assignment, other_order = lab_mode_assignment(branch)
        other_profile = other_order.patient_profile
        other_profile.first_name = "Other"
        other_profile.last_name = "Person"
        other_profile.save(update_fields=["first_name", "last_name"])

        qs = LabOrderAssignment.objects.filter(
            patient_profile_name_search_q("SearchFirst SearchLast", "diagnostic_order__patient_profile"),
            lab_branch=branch,
            is_deleted=False,
        )
        self.assertEqual(set(qs.values_list("pk", flat=True)), {assignment.pk})

    def test_single_token_still_matches_first_name(self):
        from labs.models import LabOrderAssignment

        _client, _lab_user, branch, _org = lab_admin_client()
        assignment, order = lab_mode_assignment(branch)
        profile = order.patient_profile
        profile.first_name = "OnlyFirst"
        profile.last_name = "OnlyLast"
        profile.save(update_fields=["first_name", "last_name"])

        from labs.models import LabOrderAssignment

        qs = LabOrderAssignment.objects.filter(
            patient_profile_name_search_q("OnlyFirst", "diagnostic_order__patient_profile"),
            pk=assignment.pk,
        )
        self.assertTrue(qs.exists())
