"""Phone normalization for WhatsApp delivery."""

from __future__ import annotations

import re

_PHONE_DIGIT_RE = re.compile(r"\d")


def resolve_patient_mobile(*, encounter) -> str:
    """Resolve best-effort mobile from patient account."""
    account = getattr(encounter, "patient_account", None)
    if account is None:
        return ""
    candidates = []
    user = getattr(account, "user", None)
    if user is not None:
        candidates.append(getattr(user, "username", None))
    candidates.append(getattr(account, "alternate_mobile", None))
    for raw in candidates:
        text = (raw or "").strip()
        if text:
            return text
    return ""


def _default_country_code() -> str:
    from django.conf import settings

    return (getattr(settings, "WHATSAPP_DEFAULT_COUNTRY_CODE", "91") or "").strip()


def normalize_delivery_phone(phone: str) -> str:
    """
    Normalize phone for Meta WhatsApp Cloud API `to` field (E.164 digits, no +).

    - 10-digit local numbers get WHATSAPP_DEFAULT_COUNTRY_CODE prepended (default 91).
    - Numbers with + or country prefix are reduced to digits only.
    """
    raw = (phone or "").strip()
    if not raw:
        raise ValueError("Recipient phone is required.")

    digits_only = "".join(_PHONE_DIGIT_RE.findall(raw))
    if len(digits_only) < 10 or len(digits_only) > 15:
        raise ValueError("Recipient phone must contain 10–15 digits.")

    country_code = _default_country_code()

    if len(digits_only) == 10 and country_code:
        return f"{country_code}{digits_only}"

    if len(digits_only) == 11 and digits_only.startswith("0") and country_code:
        return f"{country_code}{digits_only[1:]}"

    return digits_only


def try_normalize_delivery_phone(phone: str) -> str | None:
    try:
        return normalize_delivery_phone(phone)
    except ValueError:
        return None
