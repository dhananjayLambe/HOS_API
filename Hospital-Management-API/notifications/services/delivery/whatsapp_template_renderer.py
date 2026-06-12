"""Render plain-text WhatsApp bodies from structured prescription summaries."""

from __future__ import annotations

import re

WHATSAPP_ITEM_SEPARATOR = " • "
_TIMING_PATTERN_RE = re.compile(r"\b(\d-\d-\d)\b")


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
    if medicine_summary or med_truncated > 0:
        lines.append("Medicines Prescribed:")
        medicine_text = format_whatsapp_medicine_block(
            medicine_summary,
            truncated_count=med_truncated,
        )
        if medicine_text:
            lines.append(medicine_text)
        lines.append("")

    test_summary = summary.get("test_summary") or []
    test_truncated = int(summary.get("test_truncated_count") or 0)
    if test_summary or test_truncated > 0:
        lines.append("Tests Recommended:")
        test_text = format_whatsapp_test_block(
            test_summary,
            truncated_count=test_truncated,
        )
        if test_text:
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
    """Map summary fields to Meta template variable slots."""
    medicine_text = format_whatsapp_medicine_block(
        summary.get("medicine_summary") or [],
        truncated_count=int(summary.get("medicine_truncated_count") or 0),
    )
    test_text = format_whatsapp_test_block(
        summary.get("test_summary") or [],
        truncated_count=int(summary.get("test_truncated_count") or 0),
    )
    prescription_link = (summary.get("prescription_url") or "").strip()

    from notifications.services.delivery.meta_client import sanitize_template_parameter

    components = {
        "patient_name": (summary.get("patient_name") or "Patient").strip(),
        "doctor_name": (summary.get("doctor_name") or "Doctor").strip(),
        "medicine_block": medicine_text,
        "test_block": test_text,
        "prescription_url": prescription_link,
    }
    return {
        key: sanitize_template_parameter(value, empty_fallback="-")
        for key, value in components.items()
    }
