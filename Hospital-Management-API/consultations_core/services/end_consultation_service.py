import logging
import uuid

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.text import slugify

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
from consultations_core.models.prescription import CustomMedicine, Prescription, PrescriptionLine
from consultations_core.models.symptoms import (
    ConsultationSymptom,
    CustomSymptom,
    SymptomMaster,
)
from consultations_core.services.finding_master_service import (
    get_or_create_finding_master_for_code,
)
from medicines.models import DoseUnitMaster, DrugMaster, FrequencyMaster, RouteMaster

logger = logging.getLogger(__name__)


def _medicine_validation_error(message):
    raise DjangoValidationError({"medicines": [message]})


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
