from typing import Any

from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.worksheet import Worksheet

from diagnostics_engine.services.pricing_templates.excel_utils import (
    parse_bool,
    parse_decimal,
    parse_int,
)

IMPORT_REQUIRED_HEADERS = frozenset(
    {
        "service_code",
        "selling_price",
        "cost_price",
        "report_delivery_hours",
        "home_collection_supported",
        "is_available",
        "remarks",
    }
)


def validate_import_headers(fieldnames: list[str]) -> None:
    present = {h for h in fieldnames if h}
    missing = IMPORT_REQUIRED_HEADERS - present
    if missing:
        raise ValueError(
            f"pricing_catalog missing required columns: {', '.join(sorted(missing))}"
        )


def validate_supported_pricing_row(row: dict[str, Any]) -> str | None:
    """
    Validate a row that will be imported (is_available already TRUE).
    Does not check is_available.
    """
    svc_code = row.get("service_code")
    if svc_code is None or str(svc_code).strip() == "":
        return "Missing service_code"

    selling_raw = row.get("selling_price")
    if selling_raw in (None, ""):
        return "selling_price is required for supported (is_available=TRUE) rows"
    try:
        sp = parse_decimal(selling_raw)
    except ValueError as exc:
        return str(exc)
    if sp is None or sp <= 0:
        return "selling_price must be > 0"

    cost_raw = row.get("cost_price")
    if cost_raw in (None, ""):
        return "cost_price is required for supported rows"
    try:
        cp = parse_decimal(cost_raw)
    except ValueError as exc:
        return str(exc)
    if cp is None or cp < 0:
        return "cost_price must be >= 0"
    if sp < cp:
        return "selling_price must be >= cost_price"

    tat_raw = row.get("report_delivery_hours")
    if tat_raw not in (None, ""):
        try:
            tat = parse_int(tat_raw)
        except ValueError as exc:
            return str(exc)
        if tat is not None and not (1 <= tat <= 240):
            return "report_delivery_hours must be between 1 and 240"

    hc_raw = row.get("home_collection_supported")
    if hc_raw not in (None, ""):
        try:
            parse_bool(hc_raw)
        except ValueError as exc:
            return str(exc)

    return None


def add_boolean_dropdown(
    ws: Worksheet,
    col_letter: str,
    start_row: int,
    end_row: int,
    *,
    false_first: bool = False,
    allow_blank: bool = True,
) -> None:
    # FALSE first so Excel pick-list defaults to unavailable for lab onboarding.
    formula = '"FALSE,TRUE"' if false_first else '"TRUE,FALSE"'
    dv = DataValidation(type="list", formula1=formula, allow_blank=allow_blank)
    ws.add_data_validation(dv)
    dv.add(f"{col_letter}{start_row}:{col_letter}{end_row}")


def add_positive_decimal_validation(ws: Worksheet, col_letter: str, start_row: int, end_row: int) -> None:
    dv = DataValidation(
        type="decimal",
        operator="greaterThan",
        formula1="0",
        allow_blank=True,
    )
    ws.add_data_validation(dv)
    dv.add(f"{col_letter}{start_row}:{col_letter}{end_row}")


def add_tat_integer_validation(ws: Worksheet, col_letter: str, start_row: int, end_row: int) -> None:
    dv = DataValidation(
        type="whole",
        operator="between",
        formula1="1",
        formula2="240",
        allow_blank=True,
    )
    ws.add_data_validation(dv)
    dv.add(f"{col_letter}{start_row}:{col_letter}{end_row}")
