from __future__ import annotations

from celery import shared_task
from django.core.cache import cache
from django.db.models import Count

from diagnostics_engine.models import DiagnosisTestMapping, DiagnosticOrderItem


@shared_task
def update_doctor_stats() -> dict:
    rows = (
        DiagnosticOrderItem.objects.filter(service_id__isnull=False, deleted_at__isnull=True)
        .values("order__doctor_id", "service_id")
        .annotate(cnt=Count("id"))
    )
    grouped: dict[str, dict[str, int]] = {}
    for row in rows:
        doctor_id = str(row["order__doctor_id"])
        grouped.setdefault(doctor_id, {})[str(row["service_id"])] = int(row["cnt"] or 0)
    for doctor_id, payload in grouped.items():
        cache.set(f"inv_stats:doctor:{doctor_id}", payload, timeout=60 * 60)
    return {"doctor_count": len(grouped)}


@shared_task
def update_global_stats() -> dict:
    rows = (
        DiagnosticOrderItem.objects.filter(service_id__isnull=False, deleted_at__isnull=True)
        .values("service_id")
        .annotate(cnt=Count("id"))
    )
    payload = {str(r["service_id"]): int(r["cnt"] or 0) for r in rows}
    cache.set("inv_stats:global:test_freq", payload, timeout=6 * 60 * 60)
    return {"service_count": len(payload)}


@shared_task
def update_diagnosis_mapping() -> dict:
    rows = DiagnosisTestMapping.objects.filter(is_active=True).values("diagnosis_id", "service_id", "rule_type", "weight")
    payload: dict[str, list[dict]] = {}
    for row in rows:
        did = str(row["diagnosis_id"])
        payload.setdefault(did, []).append(
            {
                "service_id": str(row["service_id"]),
                "rule_type": row["rule_type"],
                "weight": float(row["weight"]),
            }
        )
    cache.set("inv_stats:diagnosis_map", payload, timeout=6 * 60 * 60)
    return {"diagnosis_count": len(payload)}

