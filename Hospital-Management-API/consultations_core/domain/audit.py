# consultations_core/domain/audit.py

from consultations_core.models.audit import ClinicalAuditLog, AuditSource


class AuditService:
    """
    Centralized audit logging service.
    """

    @staticmethod
    def log_status_change(
        instance,
        field_name,
        old_value,
        new_value,
        user=None,
        source="system",
        reason=None
    ):
        """
        Creates immutable audit log entry.
        """
        if old_value == new_value:
            return

        source_value = source.value if hasattr(source, "value") else source

        ClinicalAuditLog.objects.create(
            object_type=instance.__class__.__name__,
            object_id=instance.pk,
            field_name=field_name,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value),
            changed_by=user,
            source=source_value,
            reason=reason
        )
