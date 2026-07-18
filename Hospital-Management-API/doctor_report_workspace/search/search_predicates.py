"""Workspace search language — field strategies as ORM Q objects.

Repository orchestrates these predicates; it must not redefine field matching.
"""

from __future__ import annotations

from django.db.models import Q


class WorkspaceSearchPredicates:
    """Single source of truth for workspace report search matching."""

    @classmethod
    def build(
        cls,
        term: str,
        *,
        profile_path: str = "order_test_line__order__patient_profile",
        include_report_number: bool = True,
        service_name_path: str = "order_test_line__service__name",
        branch_name_path: str = "order_test_line__order__branch__branch_name",
        report_number_path: str = "report_number",
    ) -> Q:
        """
        Build OR'd predicates for a normalized search term.

        Strategies (Phase 1):
        - Patient name: case-insensitive partial / multi-token
        - Identifier (public_id): exact or prefix
        - Mobile (user.username): exact or suffix
        - Report number: exact or prefix (when include_report_number)
        - Test name: case-insensitive partial
        - Laboratory (branch_name): case-insensitive partial
        """
        cleaned = (term or "").strip()
        if not cleaned:
            return Q()

        q = (
            cls._patient_name_q(cleaned, profile_path)
            | cls._identifier_q(cleaned, profile_path)
            | cls._mobile_q(cleaned, profile_path)
            | Q(**{f"{service_name_path}__icontains": cleaned})
            | Q(**{f"{branch_name_path}__icontains": cleaned})
        )
        if include_report_number:
            q |= cls._report_number_q(cleaned, report_number_path)
        return q

    @classmethod
    def build_for_order_line(cls, term: str) -> Q:
        """Predicates for DiagnosticOrderTestLine-rooted querysets (awaiting)."""
        return cls.build(
            term,
            profile_path="order__patient_profile",
            include_report_number=False,
            service_name_path="service__name",
            branch_name_path="order__branch__branch_name",
        )

    @staticmethod
    def _patient_name_q(term: str, profile_path: str) -> Q:
        first_key = f"{profile_path}__first_name__icontains"
        last_key = f"{profile_path}__last_name__icontains"
        name_q = Q(**{first_key: term}) | Q(**{last_key: term})
        tokens = term.split()
        if len(tokens) >= 2:
            token_q = Q()
            for token in tokens:
                if not token:
                    continue
                token_q &= Q(**{first_key: token}) | Q(**{last_key: token})
            name_q |= token_q
        return name_q

    @staticmethod
    def _identifier_q(term: str, profile_path: str) -> Q:
        return Q(**{f"{profile_path}__public_id__iexact": term}) | Q(
            **{f"{profile_path}__public_id__istartswith": term}
        )

    @staticmethod
    def _mobile_q(term: str, profile_path: str) -> Q:
        phone = f"{profile_path}__account__user__username"
        return Q(**{f"{phone}__iexact": term}) | Q(**{f"{phone}__iendswith": term})

    @staticmethod
    def _report_number_q(term: str, report_number_path: str) -> Q:
        return Q(**{f"{report_number_path}__iexact": term}) | Q(
            **{f"{report_number_path}__istartswith": term}
        )
