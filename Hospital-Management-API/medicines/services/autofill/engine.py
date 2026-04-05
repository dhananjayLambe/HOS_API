from __future__ import annotations

from typing import Any

from medicines.models import DrugMaster
from medicines.services.autofill.defaults import (
    DEFAULT_DURATION_UNIT,
    DEFAULT_DURATION_VALUE,
    DEFAULT_TIME_SLOTS,
    DEFAULT_TIMING_RELATION,
    FREQUENCY_CODE,
    FREQUENCY_DISPLAY,
)
from medicines.services.autofill.rules import (
    DOSE_UNIT_ALIASES,
    dose_unit_for_type,
    instruction_texts_for_type,
    resolve_effective_drug_type,
    route_for_type,
)


def _lookup_dose_unit(master_cache: dict[str, Any], unit_name: str) -> dict[str, Any] | None:
    units: dict[str, Any] = master_cache.get("dose_units") or {}
    key = (unit_name or "").strip().lower()
    if key in units:
        return units[key]
    alt = DOSE_UNIT_ALIASES.get(key)
    if alt and alt in units:
        return units[alt]
    return None


def _lookup_route(master_cache: dict[str, Any], code: str) -> dict[str, Any] | None:
    routes: dict[str, Any] = master_cache.get("routes") or {}
    ck = (code or "").strip().lower()
    return routes.get(ck)


def _lookup_frequency_bd(master_cache: dict[str, Any]) -> dict[str, Any] | None:
    freq: dict[str, Any] = master_cache.get("frequencies") or {}
    return freq.get("bd")


def build_autofill(drug: DrugMaster | None, *, master_cache: dict[str, Any]) -> dict[str, Any]:
    """
    Returns the autofill contract: dose, frequency, timing, duration, route, instructions.
    If drug is None (e.g. custom medicine with no DrugMaster), returns {}.
    """
    if drug is None:
        return {}

    dt = resolve_effective_drug_type(drug)

    dose_unit_str = dose_unit_for_type(dt)
    route_code, route_label = route_for_type(dt)

    du_row = _lookup_dose_unit(master_cache, dose_unit_str)
    unit_id = du_row["id"] if du_row else None
    # Prefer DB unit label when present
    unit_display = du_row["name"] if du_row else dose_unit_str

    freq_row = _lookup_frequency_bd(master_cache)
    frequency = {
        "id": freq_row["id"] if freq_row else None,
        "code": FREQUENCY_CODE,
        "display": (freq_row.get("display") if freq_row else None) or FREQUENCY_DISPLAY,
        "source": "default",
    }

    timing = {
        "relation": DEFAULT_TIMING_RELATION,
        "time_slots": list(DEFAULT_TIME_SLOTS),
        "source": "default",
    }

    duration = {
        "value": DEFAULT_DURATION_VALUE,
        "unit": DEFAULT_DURATION_UNIT,
        "source": "default",
    }

    rt_row = _lookup_route(master_cache, route_code)
    route_name = rt_row["name"] if rt_row else route_label
    route = {
        "id": rt_row["id"] if rt_row else None,
        "name": route_name,
        "source": "system",
    }

    texts = instruction_texts_for_type(dt)
    instructions = [{"text": t, "source": "template"} for t in texts]

    dose = {
        "value": 1,
        "unit": unit_display,
        "unit_id": unit_id,
        "source": "system",
    }

    return {
        "dose": dose,
        "frequency": frequency,
        "timing": timing,
        "duration": duration,
        "route": route,
        "instructions": instructions,
    }
