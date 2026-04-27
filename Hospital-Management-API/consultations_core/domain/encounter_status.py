LEGACY_STATUS_MAP = {
    "pre_consultation": "pre_consultation_in_progress",
    "in_consultation": "consultation_in_progress",
    "completed": "consultation_completed",
}


def normalize_encounter_status(value: str) -> str:
    status = (value or "").strip()
    return LEGACY_STATUS_MAP.get(status, status)


def encounter_status_for_api(value: str) -> str:
    return normalize_encounter_status(value).upper()
