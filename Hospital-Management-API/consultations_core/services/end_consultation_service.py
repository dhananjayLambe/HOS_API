import logging
import uuid

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.text import slugify

from consultations_core.api.serializers.investigations import AddInvestigationItemSerializer
from consultations_core.models.diagnosis import (
    ConsultationDiagnosis,
    CustomDiagnosis,
    DiagnosisMaster,
)
from consultations_core.models.findings import (
    ConsultationFinding,
    CustomFinding,
    FindingMaster,
)
from consultations_core.models.investigation import (
    CustomInvestigation,
    InvestigationSource,
    InvestigationUrgency,
)
from consultations_core.models.instruction import (
    EncounterInstruction,
    InstructionTemplate,
    InstructionTemplateVersion,
)
from consultations_core.models.prescription import CustomMedicine, Prescription, PrescriptionLine
from consultations_core.models.symptoms import (
    ConsultationSymptom,
    CustomSymptom,
    SymptomMaster,
)
from consultations_core.services.finding_master_service import (
    get_or_create_finding_master_for_code,
)
from consultations_core.services.investigation_api_service import (
    add_investigation_item,
    get_or_create_custom_investigation_master,
    get_or_create_investigations_container,
)
from diagnostics_engine.models import DiagnosticPackage, DiagnosticServiceMaster
from medicines.models import DoseUnitMaster, DrugMaster, FrequencyMaster, RouteMaster

logger = logging.getLogger(__name__)


def _medicine_validation_error(message):
    raise DjangoValidationError({"medicines": [message]})


def _investigations_validation_error(message):
    raise DjangoValidationError({"investigations": [message]})


def _instructions_validation_error(message):
    raise DjangoValidationError({"instructions": [message]})


def _validate_symptom(item):
    name = str(item.get("name") or item.get("label") or "").strip()
    if not name:
        raise DjangoValidationError({"symptoms": ["Symptom name is required."]})


def _validate_finding(item):
    custom_name = str(item.get("custom_name") or "").strip()
    finding_code = str(item.get("finding_code") or "").strip()
    finding_id = str(item.get("finding_id") or "").strip()
    note = str(item.get("note") or "").strip()
    ext = item.get("extension_data") if isinstance(item.get("extension_data"), dict) else {}
    value = str(ext.get("value") or "").strip() if isinstance(ext, dict) else ""
    is_custom = bool(item.get("is_custom"))
    if is_custom and not custom_name:
        raise DjangoValidationError({"findings": ["Custom finding name is required."]})
    if not is_custom and not (finding_code or finding_id):
        raise DjangoValidationError({"findings": ["Finding code or finding_id is required."]})
    if not (value or note):
        raise DjangoValidationError({"findings": ["Finding value or observation is required."]})


def _validate_diagnosis(item):
    diagnosis_label = str(item.get("diagnosis_label") or "").strip()
    diagnosis_key = str(item.get("diagnosis_key") or "").strip()
    diagnosis_icd_code = str(item.get("diagnosis_icd_code") or "").strip()
    custom_name = str(item.get("custom_name") or "").strip()
    is_custom = bool(item.get("is_custom"))
    if is_custom and not custom_name:
        raise DjangoValidationError({"diagnosis": ["Custom diagnosis name is required."]})
    if not is_custom and not (diagnosis_label or diagnosis_key or diagnosis_icd_code):
        raise DjangoValidationError({"diagnosis": ["Diagnosis label or valid ICD/code is required."]})


def _validate_medicine(item, med):
    dose_value = med.get("dose_value")
    frequency_id = med.get("frequency_id")
    duration_value = med.get("duration_value")
    duration_unit = med.get("duration_unit")
    duration_special = med.get("duration_special")
    if dose_value in (None, ""):
        _medicine_validation_error("Medicine dose_value is required.")
    if frequency_id in (None, ""):
        _medicine_validation_error("Medicine frequency_id is required.")
    has_duration_value = duration_value not in (None, "")
    has_duration_special = duration_special not in (None, "")
    if not (has_duration_value or has_duration_special):
        _medicine_validation_error("Medicine duration is required.")
    if has_duration_value and duration_unit in (None, ""):
        _medicine_validation_error("Medicine duration_unit is required when duration_value is set.")


def _as_uuid_or_none(raw_value):
    token = str(raw_value or "").strip()
    if not token:
        return None
    try:
        return uuid.UUID(token)
    except (ValueError, TypeError, AttributeError):
        return None


def _resolve_dose_unit(raw_value):
    if raw_value in (None, ""):
        _medicine_validation_error("Medicine dose_unit_id is required.")
    token = str(raw_value).strip()
    token_uuid = _as_uuid_or_none(token)
    if token_uuid:
        unit = DoseUnitMaster.objects.filter(id=token_uuid, is_active=True).first()
        if unit:
            return unit
    unit = DoseUnitMaster.objects.filter(name__iexact=token, is_active=True).first()
    if unit:
        return unit
    _medicine_validation_error(f"Invalid dose unit '{token}'.")


def _resolve_route(raw_value):
    if raw_value in (None, ""):
        _medicine_validation_error("Medicine route_id is required.")
    token = str(raw_value).strip()
    token_uuid = _as_uuid_or_none(token)
    if token_uuid:
        route = RouteMaster.objects.filter(id=token_uuid, is_active=True).first()
        if route:
            return route
    route = RouteMaster.objects.filter(code__iexact=token, is_active=True).first()
    if route:
        return route
    route = RouteMaster.objects.filter(name__iexact=token, is_active=True).first()
    if route:
        return route
    _medicine_validation_error(f"Invalid route '{token}'.")


def _resolve_frequency(raw_value):
    if raw_value in (None, ""):
        _medicine_validation_error("Medicine frequency_id is required.")
    token = str(raw_value).strip()
    token_uuid = _as_uuid_or_none(token)
    if token_uuid:
        frequency = FrequencyMaster.objects.filter(id=token_uuid, is_active=True).first()
        if frequency:
            return frequency
    frequency = FrequencyMaster.objects.filter(code__iexact=token, is_active=True).first()
    if frequency:
        return frequency
    frequency = FrequencyMaster.objects.filter(display_name__iexact=token, is_active=True).first()
    if frequency:
        return frequency
    # Fallback for environments where frequency masters were not seeded yet.
    # We keep code/display minimal so commit flow is not blocked on catalog setup.
    normalized = token.strip().upper()
    display_map = {
        "OD": "Once Daily",
        "BD": "Twice Daily",
        "TDS": "Three Times Daily",
        "QID": "Four Times Daily",
        "HS": "At Bedtime",
        "SOS": "As Needed",
        "STAT": "Immediate",
    }
    frequency = FrequencyMaster.objects.filter(code__iexact=normalized).first()
    if frequency:
        if not frequency.is_active:
            frequency.is_active = True
            frequency.save(update_fields=["is_active"])
        return frequency
    # FrequencyMaster.save() currently assumes existing pk on create in this codebase;
    # use bulk_create to bypass save() and avoid blocking end-consultation commit.
    try:
        FrequencyMaster.objects.bulk_create(
            [
                FrequencyMaster(
                    code=normalized,
                    display_name=display_map.get(normalized, normalized),
                    is_active=True,
                )
            ]
        )
    except IntegrityError:
        pass
    frequency = FrequencyMaster.objects.filter(code__iexact=normalized).first()
    if frequency:
        return frequency
    _medicine_validation_error(f"Invalid frequency '{token}'.")


def _extract_symptoms_payload(payload):
    store = payload.get("store", {}) if isinstance(payload, dict) else {}
    section_items = store.get("sectionItems", {}) if isinstance(store, dict) else {}
    symptoms = section_items.get("symptoms")
    if isinstance(symptoms, list) and symptoms:
        normalized = []
        for item in symptoms:
            if not isinstance(item, dict):
                continue
            name = item.get("label") or item.get("name")
            detail = item.get("detail")
            normalized.append({"name": name, "detail": detail})
        return normalized
    store_symptoms = store.get("symptoms")
    if isinstance(store_symptoms, list):
        return store_symptoms
    return payload.get("symptoms", [])


def _extract_findings_payload(payload):
    store = payload.get("store", {}) if isinstance(payload, dict) else {}
    draft_findings = store.get("draftFindings")
    if isinstance(draft_findings, list):
        return draft_findings
    section_items = store.get("sectionItems", {}) if isinstance(store, dict) else {}
    findings = section_items.get("findings")
    if isinstance(findings, list):
        normalized = []
        for item in findings:
            if not isinstance(item, dict):
                continue
            detail = item.get("detail")
            detail = detail if isinstance(detail, dict) else {}
            extension_data = dict(detail)
            extension_data.pop("notes", None)
            extension_data.pop("severity", None)
            normalized.append(
                {
                    "finding_code": item.get("findingKey") or item.get("finding_code"),
                    "display_label": item.get("label") or item.get("display_label"),
                    "is_custom": bool(item.get("isCustom") or item.get("is_custom")),
                    "custom_name": item.get("custom_name"),
                    "note": detail.get("notes") or item.get("note"),
                    "severity": detail.get("severity") or item.get("severity"),
                    "extension_data": item.get("extension_data") or extension_data or None,
                    "is_deleted": bool(item.get("is_deleted", False)),
                }
            )
        return normalized
    return payload.get("findings", [])


def _extract_diagnoses_payload(payload):
    store = payload.get("store", {}) if isinstance(payload, dict) else {}
    section_items = store.get("sectionItems", {}) if isinstance(store, dict) else {}
    diagnosis = section_items.get("diagnosis")
    if isinstance(diagnosis, list):
        normalized = []
        for item in diagnosis:
            if not isinstance(item, dict):
                continue
            detail = item.get("detail")
            detail = detail if isinstance(detail, dict) else {}
            normalized.append(
                {
                    "is_custom": bool(item.get("isCustom") or item.get("is_custom")),
                    "diagnosis_key": item.get("diagnosisKey") or item.get("diagnosis_key"),
                    "diagnosis_icd_code": item.get("diagnosisIcdCode") or item.get("diagnosis_icd_code"),
                    "diagnosis_label": item.get("label") or item.get("diagnosis_label"),
                    "custom_name": item.get("custom_name"),
                    "custom_diagnosis_id": item.get("custom_diagnosis_id"),
                    "doctor_note": detail.get("notes") or item.get("doctor_note"),
                    "is_primary": bool(item.get("is_primary", False)),
                    "diagnosis_type": item.get("diagnosis_type"),
                    "severity": item.get("severity"),
                    "is_chronic": bool(item.get("is_chronic", False)),
                }
            )
        return normalized
    return payload.get("diagnoses", [])


def _extract_medicines_payload(payload):
    store = payload.get("store", {}) if isinstance(payload, dict) else {}
    section_items = store.get("sectionItems", {}) if isinstance(store, dict) else {}
    medicines = section_items.get("medicines")
    if isinstance(medicines, list):
        return medicines
    store_medicines = store.get("medicines")
    if isinstance(store_medicines, list):
        return store_medicines
    return payload.get("medicines", [])


def _extract_investigations_payload(payload):
    store = payload.get("store", {}) if isinstance(payload, dict) else {}
    section_items = store.get("sectionItems", {}) if isinstance(store, dict) else {}
    investigations = section_items.get("investigations")
    if isinstance(investigations, list):
        return investigations
    store_inv = store.get("investigations")
    if isinstance(store_inv, list):
        return store_inv
    return payload.get("investigations", [])


def _extract_instructions_payload(payload):
    store = payload.get("store", {}) if isinstance(payload, dict) else {}
    section_items = store.get("sectionItems", {}) if isinstance(store, dict) else {}
    instructions = section_items.get("instructions")
    if isinstance(instructions, list):
        return instructions
    store_inst = store.get("instructionsList")
    if isinstance(store_inst, list):
        return store_inst
    return payload.get("instructions", [])


def _looks_like_uuid(token) -> bool:
    if token in (None, ""):
        return False
    try:
        uuid.UUID(str(token).strip())
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _uuid_after_custom_prefix(service_id: str | None) -> str | None:
    """MedixPro uses service_id like 'custom-<uuid>' for custom investigation rows."""
    if not service_id or not isinstance(service_id, str):
        return None
    s = service_id.strip()
    if not s.lower().startswith("custom-"):
        return None
    rest = s[7:].strip()
    return rest if _looks_like_uuid(rest) else None


def _coerce_investigation_instructions(val):
    """MedixPro sends instructions as a list of lines; API expects a string."""
    if val is None:
        return ""
    if isinstance(val, list):
        parts = []
        for x in val:
            if isinstance(x, dict):
                parts.append(str(x.get("text") or x.get("label") or x).strip())
            else:
                parts.append(str(x).strip())
        return "\n".join(p for p in parts if p)
    return str(val)


def _merge_investigation_ui_detail(d: dict) -> dict:
    """Merge detail / detail.investigation into top-level keys (UI section item shape)."""
    detail = d.get("detail")
    if isinstance(detail, dict):
        inner = detail.get("investigation") if isinstance(detail.get("investigation"), dict) else detail
        if isinstance(inner, dict):
            for key in (
                "source",
                "catalog_item_id",
                "catalogItemId",
                "service_id",
                "serviceId",
                "custom_investigation_id",
                "diagnostic_package_id",
                "diagnosticPackageId",
                "bundle_id",
                "bundleId",
                "name",
                "label",
                "investigation_type",
                "custom_investigation_type",
                "type",
                "position",
                "instructions",
                "notes",
                "urgency",
            ):
                if key not in d or d.get(key) in (None, ""):
                    if inner.get(key) is not None:
                        d[key] = inner[key]
    return d


def _prepare_investigation_item_for_add_serializer(raw) -> dict | None:
    """
    Map MedixPro end-consultation investigation rows to AddInvestigationItemSerializer input.
    Returns None to skip placeholders that cannot be persisted (no UUID / no custom name).
    """
    if not isinstance(raw, dict):
        return None
    d = _merge_investigation_ui_detail(dict(raw))

    is_custom_flag = bool(d.get("is_custom") or d.get("isCustom"))
    sid = str(d.get("service_id") or d.get("serviceId") or "").strip()
    cust_master_uuid = _uuid_after_custom_prefix(sid)
    if cust_master_uuid:
        d["custom_investigation_id"] = cust_master_uuid
    elif sid and _looks_like_uuid(sid) and not is_custom_flag:
        d["catalog_item_id"] = sid
    # Do not copy custom-… or custom rows onto catalog_item_id (serializer forbids mixing).

    if not d.get("catalog_item_id"):
        for k in ("catalogItemId",):
            if d.get(k) not in (None, ""):
                cand = str(d[k]).strip()
                if _looks_like_uuid(cand) and not is_custom_flag:
                    d["catalog_item_id"] = cand
                break
    if not d.get("diagnostic_package_id"):
        for k in ("diagnosticPackageId", "bundle_id", "bundleId"):
            if d.get(k) not in (None, ""):
                d["diagnostic_package_id"] = d[k]
                break
    if not d.get("custom_investigation_id") and d.get("customInvestigationId"):
        d["custom_investigation_id"] = d["customInvestigationId"]

    d["instructions"] = _coerce_investigation_instructions(d.get("instructions"))
    d["notes"] = _coerce_investigation_instructions(d.get("notes"))

    explicit = (d.get("source") or "").strip().lower()
    if explicit in (
        InvestigationSource.CATALOG,
        InvestigationSource.CUSTOM,
        InvestigationSource.PACKAGE,
    ):
        d["source"] = explicit
        if explicit == InvestigationSource.CATALOG and not d.get("catalog_item_id"):
            for k in ("catalogItemId", "service_id", "serviceId"):
                if d.get(k) not in (None, ""):
                    cand = str(d[k]).strip()
                    if _uuid_after_custom_prefix(cand):
                        break
                    if _looks_like_uuid(cand):
                        d["catalog_item_id"] = cand
                    break
        if explicit == InvestigationSource.PACKAGE and not d.get("diagnostic_package_id"):
            for k in ("diagnosticPackageId", "bundle_id", "bundleId"):
                if d.get(k) not in (None, ""):
                    d["diagnostic_package_id"] = d[k]
                    break
        return d

    is_custom = bool(d.get("is_custom") or d.get("isCustom"))
    pkg = d.get("diagnostic_package_id")
    if pkg not in (None, "") and _looks_like_uuid(str(pkg).strip()):
        d["source"] = InvestigationSource.PACKAGE
        d["diagnostic_package_id"] = str(pkg).strip()
    elif is_custom or cust_master_uuid:
        d["source"] = InvestigationSource.CUSTOM
        d.pop("catalog_item_id", None)
        d.pop("diagnostic_package_id", None)
        name = (d.get("name") or d.get("label") or "").strip()
        d["name"] = name
        itype = (
            d.get("investigation_type")
            or d.get("type")
            or d.get("custom_investigation_type")
            or "other"
        )
        d["investigation_type"] = itype
        if not d.get("custom_investigation_id") and not name:
            return None
    else:
        cid = d.get("catalog_item_id")
        st = str(cid or "").strip()
        if _looks_like_uuid(st):
            d["source"] = InvestigationSource.CATALOG
            d["catalog_item_id"] = st
        else:
            return None

    return d


def _persist_investigations(consultation, user, raw_investigations):
    if not isinstance(raw_investigations, list) or not raw_investigations:
        return

    container = get_or_create_investigations_container(consultation)
    urgency_choices = {c[0] for c in InvestigationUrgency.choices}

    for idx, raw in enumerate(raw_investigations):
        item = _prepare_investigation_item_for_add_serializer(raw)
        if not isinstance(item, dict):
            continue

        ser = AddInvestigationItemSerializer(data=item)
        if not ser.is_valid():
            _investigations_validation_error(f"Item {idx}: {ser.errors}")

        data = ser.validated_data
        urgency = (data.get("urgency") or "").strip() or None
        if urgency and urgency not in urgency_choices:
            _investigations_validation_error(f"Item {idx}: invalid urgency '{urgency}'.")

        try:
            if data["source"] == InvestigationSource.CATALOG:
                catalog_item = (
                    DiagnosticServiceMaster.objects.filter(is_active=True, deleted_at__isnull=True)
                    .filter(pk=data["catalog_item_id"])
                    .first()
                )
                if not catalog_item:
                    _investigations_validation_error(
                        f"Item {idx}: catalog_item_id not found or inactive."
                    )
                add_investigation_item(
                    container=container,
                    source=InvestigationSource.CATALOG,
                    user=user,
                    catalog_item=catalog_item,
                    position=data.get("position"),
                    instructions=data.get("instructions"),
                    notes=data.get("notes"),
                    urgency=urgency,
                )

            elif data["source"] == InvestigationSource.CUSTOM:
                custom_inv = None
                if data.get("custom_investigation_id"):
                    custom_inv = CustomInvestigation.objects.filter(pk=data["custom_investigation_id"]).first()
                adhoc_name = (data.get("name") or "").strip() or None
                adhoc_type = data.get("investigation_type") or "other"
                # Synthetic custom-<uuid> from UI often has no DB row yet — create master like POST /investigations/custom/
                if custom_inv is None and adhoc_name:
                    try:
                        custom_inv, _ = get_or_create_custom_investigation_master(
                            name=adhoc_name,
                            investigation_type=str(adhoc_type),
                            user=user,
                            clinic=consultation.encounter.clinic,
                        )
                    except ValueError as e:
                        _investigations_validation_error(f"Item {idx}: {e}")
                if custom_inv is None:
                    _investigations_validation_error(
                        f"Item {idx}: custom investigation master not found and name is empty."
                    )
                add_investigation_item(
                    container=container,
                    source=InvestigationSource.CUSTOM,
                    user=user,
                    custom_investigation=custom_inv,
                    adhoc_name=None,
                    adhoc_type=None,
                    position=data.get("position"),
                    instructions=data.get("instructions"),
                    notes=data.get("notes"),
                    urgency=urgency,
                )

            else:
                package = (
                    DiagnosticPackage.objects.filter(is_active=True, is_latest=True, deleted_at__isnull=True)
                    .filter(pk=data["diagnostic_package_id"])
                    .first()
                )
                if not package:
                    _investigations_validation_error(
                        f"Item {idx}: diagnostic_package_id not found or inactive."
                    )
                add_investigation_item(
                    container=container,
                    source=InvestigationSource.PACKAGE,
                    user=user,
                    diagnostic_package=package,
                    position=data.get("position"),
                    instructions=data.get("instructions"),
                    notes=data.get("notes"),
                    urgency=urgency,
                )

        except ValueError as e:
            _investigations_validation_error(str(e))


def _persist_medicines(consultation, user, raw_medicines):
    if not isinstance(raw_medicines, list) or not raw_medicines:
        return

    prescription = Prescription.objects.create(
        consultation=consultation,
        created_by=user,
    )
    created_any_line = False

    for item in raw_medicines:
        if not isinstance(item, dict):
            continue
        med = item.get("detail", {}).get("medicine", {}) if isinstance(item.get("detail"), dict) else {}
        if not isinstance(med, dict) or not med:
            med = item.get("medicine", item)
        if not isinstance(med, dict):
            continue
        _validate_medicine(item, med)

        dose_value = med.get("dose_value")
        if dose_value in (None, ""):
            _medicine_validation_error("Medicine dose_value is required.")

        duration_value = med.get("duration_value")
        duration_unit = med.get("duration_unit")
        if duration_value in ("", None):
            duration_value = None
            duration_unit = None

        drug = None
        custom_medicine = None
        is_custom_medicine = bool(
            med.get("is_custom")
            or item.get("isCustom")
            or item.get("is_custom")
        )
        drug_id = med.get("drug_id")
        if drug_id and not is_custom_medicine:
            token_uuid = _as_uuid_or_none(drug_id)
            if token_uuid:
                drug = DrugMaster.objects.filter(id=token_uuid, is_active=True).first()
            else:
                drug = DrugMaster.objects.filter(code__iexact=str(drug_id).strip(), is_active=True).first()
            if drug is None:
                _medicine_validation_error(f"Invalid medicine drug_id '{drug_id}'.")
        else:
            custom_name = str(
                med.get("name")
                or item.get("label")
                or med.get("composition")
                or ""
            ).strip()
            if not custom_name:
                _medicine_validation_error("Custom medicine requires a name.")
            custom_medicine = CustomMedicine.objects.create(
                name=custom_name,
                dose_type="other",
                strength_value=med.get("custom_strength_value"),
                strength_unit=med.get("custom_strength_unit"),
                clinic=consultation.encounter.clinic,
                created_by=user,
            )

        line = PrescriptionLine(
            prescription=prescription,
            drug=drug,
            custom_medicine=custom_medicine,
            dose_value=dose_value,
            dose_unit=_resolve_dose_unit(med.get("dose_unit_id")),
            route=_resolve_route(med.get("route_id")),
            frequency=_resolve_frequency(med.get("frequency_id")),
            duration_value=duration_value,
            duration_unit=duration_unit,
            instructions=med.get("instructions") or None,
            is_prn=bool(med.get("is_prn", False)),
            is_stat=bool(med.get("is_stat", False)),
        )
        line.save()
        created_any_line = True

    if created_any_line:
        prescription.finalize()
    else:
        prescription.delete()


def _persist_symptoms(consultation, user, raw_symptoms):
    if not isinstance(raw_symptoms, list):
        return

    seen_names = set()
    existing_entries = {
        (entry.display_name or "").strip().lower(): entry
        for entry in consultation.symptoms.select_related("symptom", "custom_symptom").all()
    }

    for item in raw_symptoms:
        if not isinstance(item, dict):
            continue
        _validate_symptom(item)
        name = str(item.get("name", "")).strip()
        if not name:
            continue

        lowered_name = name.lower()
        if lowered_name in seen_names:
            continue
        seen_names.add(lowered_name)

        detail = item.get("detail")
        detail_dict = detail if isinstance(detail, dict) else {}

        symptom_entry = existing_entries.get(lowered_name)
        if symptom_entry is None:
            master_symptom = SymptomMaster.objects.filter(
                display_name__iexact=name,
                is_active=True,
            ).first()

            custom_symptom = None
            if master_symptom is not None:
                symptom_entry = ConsultationSymptom.objects.filter(
                    consultation=consultation,
                    symptom=master_symptom,
                ).first()

            if master_symptom is None:
                custom_symptom = CustomSymptom.objects.filter(
                    consultation=consultation,
                    name__iexact=name,
                ).first()
                if custom_symptom is None:
                    custom_symptom = CustomSymptom.objects.create(
                        consultation=consultation,
                        name=name,
                        created_by=user,
                    )

            if symptom_entry is None:
                symptom_entry = ConsultationSymptom(
                    consultation=consultation,
                    symptom=master_symptom,
                    custom_symptom=custom_symptom,
                    created_by=user,
                )

        symptom_entry.display_name = name
        symptom_entry.extra_data = detail_dict or None
        symptom_entry.updated_by = user
        try:
            symptom_entry.save()
        except IntegrityError:
            if symptom_entry.symptom_id:
                existing = ConsultationSymptom.objects.filter(
                    consultation=consultation,
                    symptom_id=symptom_entry.symptom_id,
                ).first()
                if existing is not None:
                    existing.display_name = name
                    existing.extra_data = detail_dict or None
                    existing.updated_by = user
                    existing.save()
                    continue
            raise


def _persist_findings(consultation, user, raw_findings):
    if not isinstance(raw_findings, list):
        logger.info("EndConsultation findings: payload not a list, skipping")
        return

    seen_master = set()
    keeper_ids = set()

    for item in raw_findings:
        if not isinstance(item, dict):
            continue
        if item.get("is_deleted"):
            continue
        _validate_finding(item)

        raw_fid = item.get("finding_id")
        finding_code = (item.get("finding_code") or "").strip()
        custom_name = (item.get("custom_name") or "").strip()
        has_fid = raw_fid is not None and str(raw_fid).strip() != ""
        is_custom = bool(item.get("is_custom")) or (
            bool(custom_name) and not has_fid and not finding_code
        )

        if is_custom:
            if not custom_name:
                logger.warning("EndConsultation findings skip empty custom_name: %s", item)
                continue
            if has_fid or finding_code:
                logger.warning(
                    "EndConsultation findings skip custom with master fields: %s", item
                )
                continue
        else:
            if not has_fid and not finding_code:
                logger.warning(
                    "EndConsultation findings skip master without finding_id/code: %s", item
                )
                continue
            if custom_name:
                logger.warning(
                    "EndConsultation findings skip master with custom_name: %s", item
                )
                continue

            dedup = None
            if has_fid:
                try:
                    dedup = ("id", str(uuid.UUID(str(raw_fid))))
                except (ValueError, TypeError):
                    dedup = None
            if dedup is None and finding_code:
                dedup = ("code", finding_code.lower())
            if dedup is not None:
                if dedup in seen_master:
                    continue
                seen_master.add(dedup)

        sev = item.get("severity")
        if sev in ("", None):
            sev = None
        elif sev not in ("mild", "moderate", "severe"):
            sev = None

        raw_note = item.get("note")
        if isinstance(raw_note, str):
            note = raw_note.strip() or None
        elif raw_note is None:
            note = None
        else:
            note = str(raw_note).strip() or None

        ext = item.get("extension_data")
        if ext is not None and not isinstance(ext, dict):
            ext = None

        try:
            if is_custom:
                cf = CustomFinding.objects.create(
                    consultation=consultation,
                    name=custom_name,
                    created_by=user,
                )
                row = ConsultationFinding(
                    consultation=consultation,
                    finding=None,
                    custom_finding=cf,
                    severity=sev,
                    note=note,
                    extension_data=ext,
                    created_by=user,
                    is_active=True,
                )
                row.save()
                logger.info(
                    "EndConsultation findings created custom row consultation=%s custom_finding=%s name=%s finding_row=%s",
                    consultation.id,
                    cf.id,
                    custom_name,
                    row.id,
                )
                keeper_ids.add(row.id)
            else:
                master = None
                if has_fid:
                    try:
                        fid = uuid.UUID(str(raw_fid))
                        master = FindingMaster.objects.filter(
                            id=fid, is_active=True
                        ).first()
                    except (ValueError, TypeError):
                        master = None
                if master is None and finding_code:
                    master = get_or_create_finding_master_for_code(
                        finding_code, user=user
                    )
                if master is None:
                    logger.warning(
                        "EndConsultation findings could not resolve master, skip: %s", item
                    )
                    continue

                row = ConsultationFinding.objects.filter(
                    consultation=consultation,
                    finding=master,
                ).first()
                if row is None:
                    row = ConsultationFinding(
                        consultation=consultation,
                        finding=master,
                        custom_finding=None,
                        created_by=user,
                    )
                row.custom_finding = None
                row.severity = sev
                row.note = note
                row.extension_data = ext
                row.is_active = True
                row.updated_by = user
                if row.pk is None:
                    row.created_by = user
                row.save()
                logger.info(
                    "EndConsultation findings upserted master row consultation=%s finding=%s finding_row=%s",
                    consultation.id,
                    master.id,
                    row.id,
                )
                keeper_ids.add(row.id)
        except DjangoValidationError:
            raise
        except IntegrityError as e:
            logger.warning(
                "EndConsultation finding IntegrityError consultation=%s: %s",
                consultation.id,
                e,
            )
            raise

    stale_qs = ConsultationFinding.objects.filter(
        consultation=consultation, is_active=True
    ).exclude(pk__in=keeper_ids)
    stale_n = stale_qs.update(is_active=False, updated_at=timezone.now())
    if stale_n:
        logger.info(
            "EndConsultation findings: deactivated %s stale row(s) consultation=%s",
            stale_n,
            consultation.id,
        )

    logger.info(
        "EndConsultation findings: kept/created %s row(s) consultation=%s",
        len(keeper_ids),
        consultation.id,
    )


def _persist_diagnoses(consultation, user, raw_diagnoses):
    if not isinstance(raw_diagnoses, list):
        logger.info("EndConsultation diagnoses: payload not a list, skipping")
        return

    keeper_ids = set()
    seen_master = set()
    seen_custom = set()
    primary_count = 0

    for item in raw_diagnoses:
        if not isinstance(item, dict):
            continue
        _validate_diagnosis(item)

        is_custom = bool(item.get("is_custom"))
        diagnosis_key = str(item.get("diagnosis_key") or "").strip()
        diagnosis_icd_code = str(item.get("diagnosis_icd_code") or "").strip()
        diagnosis_label = str(item.get("diagnosis_label") or "").strip()
        custom_name = str(item.get("custom_name") or "").strip()
        custom_diagnosis_id = str(item.get("custom_diagnosis_id") or "").strip()

        has_master = bool(diagnosis_key or diagnosis_icd_code or (diagnosis_label and not is_custom))
        has_custom = bool(custom_name or custom_diagnosis_id)
        if has_master == has_custom:
            raise DjangoValidationError(
                "Each diagnosis must contain exactly one source: diagnosis_key or custom diagnosis."
            )

        is_primary = bool(item.get("is_primary"))
        if is_primary:
            primary_count += 1
            if primary_count > 1:
                raise DjangoValidationError(
                    "Only one primary diagnosis allowed per consultation."
                )

        diagnosis_type = str(item.get("diagnosis_type") or "provisional").strip().lower()
        if diagnosis_type not in ("provisional", "confirmed"):
            diagnosis_type = "provisional"

        severity = item.get("severity")
        if severity in ("", None):
            severity = None
        else:
            severity = str(severity).strip().lower()
            if severity not in ("mild", "moderate", "severe", "critical"):
                severity = None

        doctor_note = item.get("doctor_note")
        if isinstance(doctor_note, str):
            doctor_note = doctor_note.strip() or None
        elif doctor_note is None:
            doctor_note = None
        else:
            doctor_note = str(doctor_note).strip() or None

        is_chronic = bool(item.get("is_chronic"))

        if is_custom:
            custom_obj = None
            if custom_diagnosis_id:
                try:
                    custom_obj = CustomDiagnosis.objects.filter(
                        id=uuid.UUID(custom_diagnosis_id),
                        consultation=consultation,
                    ).first()
                except (ValueError, TypeError):
                    custom_obj = None
            if custom_obj is None:
                if not custom_name:
                    raise DjangoValidationError(
                        "Custom diagnosis requires custom_name."
                    )
                custom_obj = CustomDiagnosis.objects.create(
                    consultation=consultation,
                    name=custom_name,
                    created_by=user,
                )

            dedup_key = (custom_obj.name or "").strip().lower()
            if dedup_key in seen_custom:
                continue
            seen_custom.add(dedup_key)

            row = ConsultationDiagnosis(
                consultation=consultation,
                master=None,
                custom_diagnosis=custom_obj,
                is_primary=is_primary,
                diagnosis_type=diagnosis_type,
                severity=severity,
                doctor_note=doctor_note,
                is_chronic=is_chronic,
                created_by=user,
                updated_by=user,
                is_active=True,
            )
            row.save()
            keeper_ids.add(row.id)
            continue

        master = DiagnosisMaster.objects.filter(
            key=diagnosis_key,
            is_active=True,
        ).first()
        if master is None and diagnosis_icd_code:
            master = DiagnosisMaster.objects.filter(
                icd10_code__iexact=diagnosis_icd_code,
                is_active=True,
            ).first()
        if master is None and diagnosis_label:
            master = DiagnosisMaster.objects.filter(
                label__iexact=diagnosis_label,
                is_active=True,
            ).first()
        if master is None:
            base_key = diagnosis_key or slugify(diagnosis_label) or slugify(diagnosis_icd_code)
            if not base_key:
                raise DjangoValidationError(
                    f"Could not resolve diagnosis master for key '{diagnosis_key}' and label '{diagnosis_label}'."
                )
            candidate_key = base_key[:150]
            if DiagnosisMaster.objects.filter(key=candidate_key).exists():
                candidate_key = f"{base_key[:140]}-{uuid.uuid4().hex[:8]}"
            master = DiagnosisMaster.objects.create(
                key=candidate_key,
                label=diagnosis_label or diagnosis_key or diagnosis_icd_code,
                clinical_term=diagnosis_label or None,
                icd10_code=diagnosis_icd_code or None,
                category="general",
                is_active=True,
                version=1,
            )
            logger.info(
                "EndConsultation diagnoses created fallback master key=%s label=%s icd=%s",
                master.key,
                master.label,
                master.icd10_code,
            )

        dedup_master_key = str(master.id)
        if dedup_master_key in seen_master:
            continue
        seen_master.add(dedup_master_key)

        row = ConsultationDiagnosis.objects.filter(
            consultation=consultation,
            master=master,
        ).first()
        if row is None:
            row = ConsultationDiagnosis(
                consultation=consultation,
                master=master,
                custom_diagnosis=None,
                created_by=user,
            )
        row.custom_diagnosis = None
        row.is_primary = is_primary
        row.diagnosis_type = diagnosis_type
        row.severity = severity
        row.doctor_note = doctor_note
        row.is_chronic = is_chronic
        row.updated_by = user
        row.is_active = True
        row.save()
        keeper_ids.add(row.id)

    stale_qs = ConsultationDiagnosis.objects.filter(
        consultation=consultation, is_active=True
    ).exclude(pk__in=keeper_ids)
    stale_qs.update(is_active=False, updated_at=timezone.now())


def _persist_encounter_instructions(consultation, user, raw_instructions):
    """
    Replace-set: deactivate existing active encounter instructions, then create rows from payload.
    Items must reference InstructionTemplate by UUID (instruction_template_id). Free-text-only
    draft rows without a template UUID are skipped.
    """
    encounter = consultation.encounter
    EncounterInstruction.objects.filter(encounter=encounter, is_active=True).update(
        is_active=False,
        updated_at=timezone.now(),
    )

    if not isinstance(raw_instructions, list) or not raw_instructions:
        return

    seen_template_ids = set()

    for idx, item in enumerate(raw_instructions):
        if not isinstance(item, dict):
            continue
        tid = _as_uuid_or_none(item.get("instruction_template_id"))
        if not tid:
            continue
        tid_str = str(tid)
        if tid_str in seen_template_ids:
            continue
        seen_template_ids.add(tid_str)

        template = InstructionTemplate.objects.filter(id=tid, is_active=True).first()
        if template is None:
            _instructions_validation_error(
                f"Instruction {idx}: instruction template {tid_str} not found or inactive."
            )

        raw_input = item.get("input_data")
        input_data = raw_input if isinstance(raw_input, dict) else {}
        custom_note = (item.get("custom_note") or "").strip()
        label_snapshot = str(item.get("label") or template.label).strip()[:255]

        if template.requires_input and not input_data:
            _instructions_validation_error(
                f"Instruction {idx} ({template.label}): input_data is required for this template."
            )

        version, _ = InstructionTemplateVersion.objects.get_or_create(
            template=template,
            version_number=template.version,
            defaults={
                "label_snapshot": template.label,
                "input_schema_snapshot": template.input_schema,
            },
        )

        EncounterInstruction.objects.create(
            encounter=encounter,
            instruction_template=template,
            template_version=version,
            input_data=input_data,
            custom_note=custom_note or None,
            text_snapshot=label_snapshot or template.label[:255],
            source="template",
            is_custom=False,
            is_active=True,
            added_by=user,
        )


@transaction.atomic
def persist_consultation_end_state(consultation, payload: dict, user):
    _persist_symptoms(
        consultation=consultation,
        user=user,
        raw_symptoms=_extract_symptoms_payload(payload),
    )
    _persist_findings(
        consultation=consultation,
        user=user,
        raw_findings=_extract_findings_payload(payload),
    )
    _persist_diagnoses(
        consultation=consultation,
        user=user,
        raw_diagnoses=_extract_diagnoses_payload(payload),
    )
    _persist_medicines(
        consultation=consultation,
        user=user,
        raw_medicines=_extract_medicines_payload(payload),
    )
    _persist_investigations(
        consultation=consultation,
        user=user,
        raw_investigations=_extract_investigations_payload(payload),
    )
    _persist_encounter_instructions(
        consultation=consultation,
        user=user,
        raw_instructions=_extract_instructions_payload(payload),
    )
