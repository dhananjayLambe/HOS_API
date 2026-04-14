"""Persist consultation procedures (free-text, idempotent replace-set)."""

from consultations_core.models.procedure import Procedure


def persist_procedures(consultation, procedures_text, user):
    """
    Idempotent procedure save: remove existing rows for this consultation, then optionally insert one.

    procedures_text: stripped non-empty string to persist, or None/"" to leave none.
    """
    Procedure.objects.filter(consultation=consultation).delete()
    text = (procedures_text or "").strip()
    if not text:
        return
    Procedure.objects.create(
        consultation=consultation,
        notes=text,
        created_by=user,
        updated_by=user,
    )
