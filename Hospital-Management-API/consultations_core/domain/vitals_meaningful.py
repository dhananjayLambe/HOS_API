"""Shared helpers for determining whether stored vitals JSON is clinically meaningful."""


def vitals_data_is_meaningful(data: dict | None) -> bool:
    if not data:
        return False
    bp = data.get("bp") or {}
    if isinstance(bp, dict) and bp.get("systolic") and bp.get("diastolic"):
        return True
    if data.get("weight_kg") is not None:
        return True
    if data.get("height_cm") is not None:
        return True
    if data.get("temperature") is not None:
        return True
    return False
