"""Render plain-text WhatsApp bodies from structured prescription summaries."""

from __future__ import annotations

import re

WHATSAPP_ITEM_SEPARATOR = " • "
_TIMING_PATTERN_RE = re.compile(r"\b(\d-\d-\d)\b")

# Meta template {{3}} / {{4}} — must be non-empty (Meta rejects blank variables).
EMPTY_MEDICINE_BLOCK = "No medicines prescribed."
EMPTY_TEST_BLOCK = "No tests advised"


def _resolve_timing_pattern(med: dict) -> str:
    pattern = (med.get("timing_pattern") or "").strip()
    if pattern:
        return pattern
    dose_display = (med.get("dose_display") or "").strip()
    match = _TIMING_PATTERN_RE.search(dose_display)
    if match:
        return match.group(1)
    return "-"


def format_whatsapp_medicine_block(
    medicines: list[dict],
    *,
    truncated_count: int = 0,
) -> str:
    """Meta-safe compact medicine list for template variable {{3}}."""
    entries: list[str] = []
    for med in medicines:
        name = (med.get("name") or "").strip()
        if not name:
            continue
        frequency = _resolve_timing_pattern(med)
        duration = (med.get("duration_display") or "").strip() or "-"
        entries.append(f"• {name} ({frequency}, {duration})")

    if truncated_count > 0:
        label = "medicine" if truncated_count == 1 else "medicines"
        entries.append(f"• + {truncated_count} more {label}")

    return " ".join(entries)


def format_whatsapp_test_block(
    tests: list[dict],
    *,
    truncated_count: int = 0,
) -> str:
    """Compact test list for template variable {{4}}."""
    entries: list[str] = []
    for test in tests:
        name = str(test.get("name") or "").strip()
        if name:
            entries.append(name)

    if truncated_count > 0:
        label = "test" if truncated_count == 1 else "tests"
        entries.append(f"+ {truncated_count} more {label}")

    return WHATSAPP_ITEM_SEPARATOR.join(entries)


def resolve_medicine_block_text(
    medicines: list[dict],
    *,
    truncated_count: int = 0,
) -> str:
    text = format_whatsapp_medicine_block(medicines, truncated_count=truncated_count)
    return text if text.strip() else EMPTY_MEDICINE_BLOCK


def resolve_test_block_text(
    tests: list[dict],
    *,
    truncated_count: int = 0,
) -> str:
    text = format_whatsapp_test_block(tests, truncated_count=truncated_count)
    return text if text.strip() else EMPTY_TEST_BLOCK


def render_prescription_whatsapp_body(summary: dict) -> str:
    """Build the patient-facing WhatsApp message body."""
    patient_name = (summary.get("patient_name") or "Patient").strip()
    doctor_name = (summary.get("doctor_name") or "Doctor").strip()
    lines: list[str] = [
        f"Hello {patient_name},",
        "",
        f"{doctor_name} has completed your consultation.",
        "",
    ]

    medicine_summary = summary.get("medicine_summary") or []
    med_truncated = int(summary.get("medicine_truncated_count") or 0)
    medicine_text = resolve_medicine_block_text(medicine_summary, truncated_count=med_truncated)
    lines.append("Medicines Prescribed:")
    lines.append(medicine_text)
    lines.append("")

    test_summary = summary.get("test_summary") or []
    test_truncated = int(summary.get("test_truncated_count") or 0)
    test_text = resolve_test_block_text(test_summary, truncated_count=test_truncated)
    if test_text != EMPTY_TEST_BLOCK:
        lines.append("Tests Recommended:")
        lines.append(test_text)
        lines.append("")

    prescription_url = (summary.get("prescription_url") or "").strip()
    if prescription_url:
        lines.extend(
            [
                "View Full Prescription:",
                prescription_url,
                "",
            ]
        )

    lines.extend(["Regards,", "DoctorPro"])
    return "\n".join(lines)


def build_template_components(summary: dict) -> dict[str, str]:
    """Map summary fields to Meta template variable slots (filtered to configured keys)."""
    medicine_text = resolve_medicine_block_text(
        summary.get("medicine_summary") or [],
        truncated_count=int(summary.get("medicine_truncated_count") or 0),
    )
    test_text = resolve_test_block_text(
        summary.get("test_summary") or [],
        truncated_count=int(summary.get("test_truncated_count") or 0),
    )
    prescription_link = (summary.get("prescription_url") or "").strip()

    from notifications.services.delivery.meta_client import (
        filter_template_components,
        sanitize_template_parameter,
    )

    all_components = {
        "patient_name": (summary.get("patient_name") or "Patient").strip(),
        "doctor_name": (summary.get("doctor_name") or "Doctor").strip(),
        "medicine_block": medicine_text,
        "test_block": test_text,
        "prescription_url": prescription_link or "-",
    }
    sanitized = {
        key: sanitize_template_parameter(value, empty_fallback="-")
        for key, value in all_components.items()
    }
    return filter_template_components(sanitized)


def format_whatsapp_price_amount(value) -> str:
    """Numeric string for Meta template variables (₹ is static in template body)."""
    if value is None:
        return "0"
    from decimal import Decimal

    amount = Decimal(str(value))
    if amount == amount.to_integral_value():
        return str(int(amount))
    return str(amount.quantize(Decimal("0.01")))


def recommendation_has_discount(result) -> bool:
    from decimal import Decimal

    savings = getattr(result, "savings", None)
    if savings is None:
        return False
    return Decimal(str(savings)) > Decimal("0")


RECOMMENDATION_BOOKING_BENEFITS_LINES = (
    "Included with Your Booking",
    "✔ Test Scheduling Support",
    "✔ Pay After Service",
    "✔ Digital Reports",
)


def build_recommendation_test_names(result) -> str:
    names: list[str] = []
    for pkg in getattr(result, "packages", None) or []:
        name = (getattr(pkg, "name", None) or "").strip()
        if name:
            names.append(name)
    for test in getattr(result, "expanded_tests", None) or []:
        if getattr(test, "package_id", None):
            continue
        name = (getattr(test, "name", None) or "").strip()
        if name and name not in names:
            names.append(name)
    return ", ".join(names) if names else "-"


def build_recommendation_template_components(*, patient_name: str, result) -> dict[str, str]:
    from notifications.services.delivery.meta_client import (
        filter_recommendation_template_components,
        sanitize_template_parameter,
    )

    all_components = {
        "patient_name": (patient_name or "Patient").strip(),
        "test_names": build_recommendation_test_names(result),
        "mrp": format_whatsapp_price_amount(getattr(result, "mrp_total", None)),
        "quoted_price": format_whatsapp_price_amount(getattr(result, "quoted_price", None)),
        "savings": format_whatsapp_price_amount(getattr(result, "savings", None)),
    }
    sanitized = {
        key: sanitize_template_parameter(value, empty_fallback="-")
        for key, value in all_components.items()
    }
    return filter_recommendation_template_components(sanitized)


def build_recommendation_flat_template_components(*, patient_name: str, result) -> dict[str, str]:
    from notifications.services.delivery.meta_client import (
        filter_recommendation_flat_template_components,
        sanitize_template_parameter,
    )

    all_components = {
        "patient_name": (patient_name or "Patient").strip(),
        "test_names": build_recommendation_test_names(result),
        "quoted_price": format_whatsapp_price_amount(getattr(result, "quoted_price", None)),
    }
    sanitized = {
        key: sanitize_template_parameter(value, empty_fallback="-")
        for key, value in all_components.items()
    }
    return filter_recommendation_flat_template_components(sanitized)


def resolve_recommendation_pricing_display_mode(result) -> str:
    """discount = MRP + savings lines; flat = single price (no zero-savings UX)."""
    return "discount" if recommendation_has_discount(result) else "flat"


def render_recommendation_flat_price_body(*, patient_name: str, result) -> str:
    components = build_recommendation_flat_template_components(patient_name=patient_name, result=result)
    lines = [
        "Doctor's Recommended Tests",
        "",
        f"Hello {components.get('patient_name', 'Patient')},",
        "",
        "Your doctor has recommended the following tests:",
        components.get("test_names", "-"),
        "",
        f"Price: ₹{components.get('quoted_price', '0')}",
        "",
        *RECOMMENDATION_BOOKING_BENEFITS_LINES,
        "",
        "Tap below to book your test.",
        "",
        "Power By DoctorProCare.com",
    ]
    return "\n".join(lines)


def render_recommendation_whatsapp_body(*, patient_name: str, result) -> str:
    if resolve_recommendation_pricing_display_mode(result) == "flat":
        return render_recommendation_flat_price_body(patient_name=patient_name, result=result)

    components = build_recommendation_template_components(patient_name=patient_name, result=result)
    lines = [
        "Doctor's Recommended Tests",
        "",
        f"Hello {components.get('patient_name', 'Patient')},",
        "",
        "Your doctor has recommended the following tests:",
        components.get("test_names", "-"),
        "",
        f"MRP: ₹{components.get('mrp', '0')}",
        f"DoctorPro Price: ₹{components.get('quoted_price', '0')}",
        f"You Save: ₹{components.get('savings', '0')}",
        "",
        *RECOMMENDATION_BOOKING_BENEFITS_LINES,
        "",
        "Tap below to book your test.",
        "",
        "Power By DoctorProCare.com",
    ]
    return "\n".join(lines)


DIAGNOSTIC_RECOMMENDATION_UNAVAILABLE_BODY = (
    "Sorry.\n\n"
    "We are currently unable to arrange your diagnostic tests in your area.\n\n"
    "No booking has been created.\n"
    "No payment has been collected.\n\n"
    "Thank you for choosing DoctorProCare."
)
