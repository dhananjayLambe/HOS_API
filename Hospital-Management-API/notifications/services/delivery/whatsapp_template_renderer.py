"""Render plain-text WhatsApp bodies from structured prescription summaries."""

from __future__ import annotations


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
    if medicine_summary:
        lines.append("Medicines Prescribed:")
        for index, med in enumerate(medicine_summary, start=1):
            name = (med.get("name") or "").strip()
            dose = (med.get("dose_display") or "").strip()
            timing = (med.get("timing_display") or "").strip()
            duration = (med.get("duration_display") or "").strip()
            detail_parts = [p for p in (dose, timing, duration) if p]
            lines.append(f"{index}. {name}")
            if detail_parts:
                lines.append(f"   {' · '.join(detail_parts)}")
        truncated = int(summary.get("medicine_truncated_count") or 0)
        if truncated > 0:
            label = "medicine" if truncated == 1 else "medicines"
            lines.append(f"+ {truncated} more {label}")
        lines.append("")

    test_summary = summary.get("test_summary") or []
    if test_summary:
        lines.append("Tests Recommended:")
        for test in test_summary:
            name = (test.get("name") or "").strip()
            if name:
                lines.append(f"• {name}")
        truncated = int(summary.get("test_truncated_count") or 0)
        if truncated > 0:
            label = "test" if truncated == 1 else "tests"
            lines.append(f"+ {truncated} more {label}")
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
    """Map summary fields to Meta template variable slots (prescription_template)."""
    medicine_lines: list[str] = []
    for index, med in enumerate(summary.get("medicine_summary") or [], start=1):
        name = (med.get("name") or "").strip() 
        dose = (med.get("dose_display") or "").strip()
        timing = (med.get("timing_display") or "").strip()
        duration = (med.get("duration_display") or "").strip()
        detail_parts = [p for p in (dose, timing, duration) if p]
        line = f"{index}. {name}"
        if detail_parts:
            line = f"{line} {' '.join(detail_parts)}"
        medicine_lines.append(line)
    truncated_meds = int(summary.get("medicine_truncated_count") or 0)
    if truncated_meds > 0:
        label = "medicine" if truncated_meds == 1 else "medicines"
        medicine_lines.append(f"+ {truncated_meds} more {label}")

    test_lines = []
    for test in summary.get("test_summary") or []:
        name = (test.get("name") or "").strip()
        if name:
            test_lines.append(name)
    truncated_tests = int(summary.get("test_truncated_count") or 0)
    if truncated_tests > 0:
        label = "test" if truncated_tests == 1 else "tests"
        test_lines.append(f"+ {truncated_tests} more {label}")

    # Meta templates use static "View prescription: {{5}}" — variable is URL only.
    prescription_link = (summary.get("prescription_url") or "").strip()

    from notifications.services.delivery.meta_client import sanitize_template_parameter

    components = {
        "patient_name": (summary.get("patient_name") or "Patient").strip(),
        "doctor_name": (summary.get("doctor_name") or "Doctor").strip(),
        "medicine_block": " | ".join(medicine_lines) if medicine_lines else "",
        "test_block": ", ".join(test_lines) if test_lines else "",
        "prescription_url": prescription_link,
    }
    return {
        key: sanitize_template_parameter(value, empty_fallback="-")
        for key, value in components.items()
    }
