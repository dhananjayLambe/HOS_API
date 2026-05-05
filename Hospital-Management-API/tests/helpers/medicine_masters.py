"""Idempotent seed for RouteMaster / DoseUnitMaster when test DB lacks migration 0009 data."""

from medicines.models.masters import DoseUnitMaster, RouteMaster

_ROUTE_SEED = [
    ("oral", "oral"),
    ("iv", "iv/im"),
    ("im", "im"),
    ("topical", "topical"),
    ("inhalation", "inhalation"),
    ("sc", "subcutaneous"),
    ("rectal", "rectal"),
    ("other", "other"),
]

_DOSE_SEED = (
    "tablet",
    "ml",
    "g",
    "drops",
    "inhaler",
    "units",
    "suppository",
)


def ensure_autofill_route_and_dose_masters() -> None:
    if (
        DoseUnitMaster.objects.filter(name__iexact="tablet", is_active=True).exists()
        and RouteMaster.objects.filter(code__iexact="oral", is_active=True).exists()
    ):
        return

    # RouteMaster.save() runs full_clean() before search_vector is populated; use bulk_create
    # so rows match production codes used by end_consultation_service._resolve_route.
    existing_codes = set(RouteMaster.objects.values_list("code", flat=True))
    missing = [
        RouteMaster(code=code, name=name, is_active=True)
        for code, name in _ROUTE_SEED
        if code not in existing_codes
    ]
    if missing:
        RouteMaster.objects.bulk_create(missing)

    for name in _DOSE_SEED:
        DoseUnitMaster.objects.update_or_create(
            name=name,
            defaults={"is_active": True},
        )
