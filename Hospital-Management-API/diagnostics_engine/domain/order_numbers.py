"""Unique human-readable diagnostic order numbers (max 20 chars on DiagnosticOrder)."""

import secrets

from django.db import IntegrityError
from django.utils import timezone

from diagnostics_engine.models.orders import DiagnosticOrder


def allocate_diagnostic_order_number(max_attempts: int = 12) -> str:
    """
    Generate a unique order_number. Caller should run inside transaction.atomic.
    Retries on rare collision (IntegrityError handled by caller on full save).
    """
    day = timezone.now().strftime("%y%m%d")
    for _ in range(max_attempts):
        token = secrets.token_hex(4).upper()[:8]
        candidate = f"DX{day}{token}"
        if len(candidate) > 20:
            candidate = candidate[:20]
        if not DiagnosticOrder.objects.filter(order_number=candidate).exists():
            return candidate
    return f"DX{day}{secrets.token_hex(5).upper()}"[:20]
