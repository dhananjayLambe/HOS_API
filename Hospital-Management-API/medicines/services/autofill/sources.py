from __future__ import annotations

from functools import lru_cache
from typing import Any

from medicines.models import DoseUnitMaster, FrequencyMaster, RouteMaster
from medicines.services.autofill.defaults import FREQUENCY_CODE
from medicines.services.autofill.rules import ALL_DOSE_UNIT_NAMES, ALL_ROUTE_CODES


def _empty_cache() -> dict[str, Any]:
    return {
        "dose_units": {},
        "routes": {},
        "frequencies": {},
    }


def _fetch_master_cache() -> dict[str, Any]:
    out = _empty_cache()
    try:
        dose_names = list(ALL_DOSE_UNIT_NAMES)
        for du in DoseUnitMaster.objects.filter(is_active=True, name__in=dose_names).only("id", "name"):
            key = (du.name or "").strip().lower()
            if key:
                out["dose_units"][key] = {"id": str(du.id), "name": du.name}

        for rt in RouteMaster.objects.filter(is_active=True).only("id", "code", "name"):
            ck = (rt.code or "").strip().lower()
            if ck in ALL_ROUTE_CODES:
                out["routes"][ck] = {"id": str(rt.id), "code": rt.code, "name": rt.name}

        bd = FREQUENCY_CODE.strip().lower()
        for fr in FrequencyMaster.objects.filter(is_active=True).only("id", "code", "display_name"):
            if (fr.code or "").strip().lower() != bd:
                continue
            out["frequencies"]["bd"] = {
                "id": str(fr.id),
                "code": fr.code,
                "display": fr.display_name,
            }
            break
    except Exception:
        return _empty_cache()
    return out


@lru_cache(maxsize=1)
def load_master_cache() -> dict[str, Any]:
    """
    Batched master lookups; safe to call once per response. Cached per process.
    On DB failure returns empty inner dicts so build_autofill still returns literals + null ids.
    """
    return _fetch_master_cache()


def clear_master_cache() -> None:
    """Test helper: invalidate process-local master cache."""
    load_master_cache.cache_clear()
