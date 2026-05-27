"""Shared patient name search for lab and report list APIs."""

from __future__ import annotations

from django.db.models import Q


def patient_profile_name_search_q(term: str, profile_path: str) -> Q:
    """
    Match patient by first name, last name, phone (username), or multi-token full name.

    ``profile_path`` is the ORM prefix to ``PatientProfile``, e.g.
    ``diagnostic_order__patient_profile``.
    """
    cleaned = (term or "").strip()
    if not cleaned:
        return Q()

    first_key = f"{profile_path}__first_name__icontains"
    last_key = f"{profile_path}__last_name__icontains"
    phone_key = f"{profile_path}__account__user__username__icontains"

    name_q = (
        Q(**{first_key: cleaned})
        | Q(**{last_key: cleaned})
        | Q(**{phone_key: cleaned})
    )

    tokens = cleaned.split()
    if len(tokens) >= 2:
        token_q = Q()
        for token in tokens:
            if not token:
                continue
            token_q &= Q(**{first_key: token}) | Q(**{last_key: token})
        name_q |= token_q

    return name_q
