from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from consultations_core.models import ConsultationDiagnosis, ConsultationSymptom, InvestigationItem
from diagnostics_engine.models import DiagnosticOrderItem
from diagnostics_engine.services.investigation_suggestions.cache import invalidate_encounter_suggestions


def _invalidate_for_encounter(encounter_id) -> None:
    if encounter_id:
        invalidate_encounter_suggestions(str(encounter_id))


@receiver(post_save, sender=ConsultationDiagnosis)
@receiver(post_delete, sender=ConsultationDiagnosis)
def invalidate_on_diagnosis_change(sender, instance, **kwargs):
    consultation = getattr(instance, "consultation", None)
    _invalidate_for_encounter(getattr(consultation, "encounter_id", None))


@receiver(post_save, sender=ConsultationSymptom)
@receiver(post_delete, sender=ConsultationSymptom)
def invalidate_on_symptom_change(sender, instance, **kwargs):
    consultation = getattr(instance, "consultation", None)
    _invalidate_for_encounter(getattr(consultation, "encounter_id", None))


@receiver(post_save, sender=InvestigationItem)
@receiver(post_delete, sender=InvestigationItem)
def invalidate_on_investigation_change(sender, instance, **kwargs):
    investigations = getattr(instance, "investigations", None)
    consultation = getattr(investigations, "consultation", None)
    _invalidate_for_encounter(getattr(consultation, "encounter_id", None))


@receiver(post_save, sender=DiagnosticOrderItem)
@receiver(post_delete, sender=DiagnosticOrderItem)
def invalidate_on_order_item_change(sender, instance, **kwargs):
    order = getattr(instance, "order", None)
    _invalidate_for_encounter(getattr(order, "encounter_id", None))
