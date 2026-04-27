import logging

from rest_framework import serializers
from queue_management.models import Queue

logger = logging.getLogger(__name__)


class QueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Queue
        fields = '__all__'


class QueueUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Queue
        fields = ['status', 'position_in_queue']


class QueueReorderSerializer(serializers.Serializer):
    queue_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="List of queue IDs in the desired order"
    )


class QueuePatientSerializer(serializers.ModelSerializer):
    queue_position = serializers.IntegerField(source='position_in_queue')
    estimated_wait_time = serializers.DurationField()
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)

    class Meta:
        model = Queue
        fields = ['id', 'status', 'queue_position', 'estimated_wait_time', 'doctor_name', 'clinic_name', 'check_in_time']


def _vitals_preview_from_encounter(encounter):
    if not encounter:
        return None
    from consultations_core.models.pre_consultation import PreConsultation, PreConsultationVitals

    try:
        pre = encounter.pre_consultation
    except PreConsultation.DoesNotExist:
        pre = PreConsultation.objects.filter(encounter=encounter).first()
    if not pre:
        return None
    try:
        row = PreConsultationVitals.objects.get(pre_consultation=pre)
        data = row.data or {}
    except PreConsultationVitals.DoesNotExist:
        return None
    bp = data.get("bp") or data.get("blood_pressure") or {}
    if isinstance(bp, dict):
        s, d = bp.get("systolic"), bp.get("diastolic")
        bp_str = f"{s}/{d}" if s and d else None
    else:
        bp_str = str(bp) if bp else None
    out = {}
    if bp_str:
        out["bp"] = bp_str
    hw = data.get("height_weight") or {}
    w = data.get("weight_kg") or hw.get("weight_kg") or data.get("weight")
    if w is not None:
        out["weight"] = w
    h = data.get("height_ft")
    if h is None:
        h_cm = data.get("height_cm") or hw.get("height_cm") or data.get("height")
        try:
            h = round(float(h_cm) / 30.48, 2) if h_cm is not None else None
        except (TypeError, ValueError):
            h = None
    if h is not None:
        out["height"] = h
    t = data.get("temperature")
    if isinstance(t, dict):
        t = t.get("value")
    if t is not None:
        out["temperature"] = t
    return out or None


class HelpdeskQueueRowSerializer(serializers.ModelSerializer):
    """Today's doctor queue row with helpdesk-oriented denormalized fields."""

    visit_id = serializers.SerializerMethodField()
    visit_pnr = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    patient_mobile = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    token = serializers.SerializerMethodField()
    vitals = serializers.SerializerMethodField()

    class Meta:
        model = Queue
        fields = (
            "id",
            "doctor",
            "clinic",
            "patient_account",
            "patient",
            "appointment",
            "encounter",
            "status",
            "check_in_time",
            "estimated_wait_time",
            "position_in_queue",
            "created_at",
            "updated_at",
            "visit_id",
            "visit_pnr",
            "patient_name",
            "patient_mobile",
            "age",
            "gender",
            "token",
            "vitals",
        )

    def get_visit_id(self, obj):
        eid = getattr(obj, "encounter_id", None)
        if not eid:
            logger.warning(
                "HelpdeskQueueRowSerializer: queue row %s has no encounter_id; visit_id will be null.",
                getattr(obj, "pk", obj),
            )
            return None
        return str(eid)

    def get_visit_pnr(self, obj):
        enc = getattr(obj, "encounter", None)
        if enc is None:
            return None
        pnr = getattr(enc, "visit_pnr", None)
        return str(pnr) if pnr else None

    def get_patient_name(self, obj):
        p = obj.patient
        parts = [p.first_name or "", p.last_name or ""]
        return " ".join(x for x in parts if x).strip() or "Patient"

    def get_patient_mobile(self, obj):
        acct = obj.patient_account
        if acct is None:
            return ""
        user = getattr(acct, "user", None)
        if user is None:
            return ""
        return (getattr(user, "username", None) or "").strip()

    def get_age(self, obj):
        p = obj.patient
        if p.date_of_birth:
            return p.age
        return p.age_years

    def get_gender(self, obj):
        g = (obj.patient.gender or "").lower()
        if g == "male":
            return "M"
        if g == "female":
            return "F"
        if g == "other":
            return "O"
        return obj.patient.gender or None

    def get_token(self, obj):
        appt = obj.appointment
        if not appt:
            return None
        for key in ("token_number", "token", "queue_number"):
            v = getattr(appt, key, None)
            if v:
                return str(v)
        return None

    def get_vitals(self, obj):
        return _vitals_preview_from_encounter(obj.encounter)
