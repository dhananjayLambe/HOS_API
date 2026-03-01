#consultation_core/models/consultation.py
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db import transaction
import uuid

# #region agent log
def _consultation_dlog(msg, data, hid):
    try:
        import json
        import time
        path = "/Users/dhananjaylambe/Documents/code_repo/JWT_auth_setup_test/HOS_API/.cursor/debug-c425fc.log"
        with open(path, "a") as f:
            f.write(json.dumps({"sessionId": "c425fc", "message": msg, "data": dict(data) if data else {}, "hypothesisId": hid, "location": "consultation.py:save", "timestamp": round(time.time() * 1000)}) + "\n")
    except Exception:
        pass
# #endregion


class Consultation(models.Model):
    """
    Represents the doctor interaction phase of an encounter.

    Rules:
    - One Consultation per ClinicalEncounter
    - Cannot exist if encounter is cancelled/no_show
    - Locks PreConsultation when started
    - Controls encounter lifecycle
    - Cannot be modified after finalization
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    encounter = models.OneToOneField(
        "consultations_core.ClinicalEncounter",
        on_delete=models.CASCADE,
        related_name="consultation"
    )

    # 🩺 Clinical Summary
    closure_note = models.TextField(blank=True, null=True)
    follow_up_date = models.DateField(blank=True, null=True)

    # 🔒 State Control
    is_finalized = models.BooleanField(default=False)

    # ⏱ Lifecycle Tracking
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Consultation"
        verbose_name_plural = "Consultations"
        ordering = ["-started_at"]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(is_finalized=True, ended_at__isnull=True),
                name="finalized_must_have_ended_at"
            )
        ]

    def __str__(self):
        return f"Consultation | {self.encounter.visit_pnr}"

    # ======================================================
    # CORE SAVE LOGIC
    # ======================================================
    def save(self, *args, **kwargs):
        with transaction.atomic():

            is_new = self._state.adding
            old = None

            if not is_new:
                old = type(self).objects.only(
                    "is_finalized",
                    "encounter_id"
                ).get(pk=self.pk)

                if old.encounter_id != self.encounter_id:
                    raise ValidationError(
                        "Consultation cannot be reassigned to another encounter."
                    )

                if old.is_finalized:
                    raise ValidationError(
                        "Finalized consultation cannot be modified."
                    )

            encounter = self.encounter

            if encounter.status in ["cancelled", "no_show"]:
                raise ValidationError(
                    "Cannot create consultation for cancelled or no-show encounter."
                )

            # 🔒 Enforce strict OneToOne mapping
            if is_new:
                # #region agent log
                _consultation_dlog("Consultation.save is_new check existing", {"encounter_id": str(encounter.id)}, "H1")
                # #endregion
                try:
                    existing = type(self).objects.filter(encounter=encounter).exists()
                    if existing:
                        raise ValidationError(
                            "A consultation already exists for this encounter."
                        )
                except ValidationError:
                    raise
                except Exception as e:
                    # #region agent log
                    _consultation_dlog("Consultation.save existing check error", {"error": str(e), "type": type(e).__name__}, "H1")
                    # #endregion
                    raise

            if not encounter.clinic:
                raise ValidationError("Encounter must have a clinic.")

            if not encounter.patient_profile:
                raise ValidationError("Encounter must have a patient profile.")

            # Audit is_finalized change before save
            if old and old.is_finalized != self.is_finalized:
                from consultations_core.domain.audit import AuditService
                AuditService.log_status_change(
                    instance=self,
                    field_name="is_finalized",
                    old_value=old.is_finalized,
                    new_value=self.is_finalized,
                    user=None,
                    source="system",
                    reason=None,
                )

            super().save(*args, **kwargs)

            if is_new:
                self._on_consultation_started()

            # Trigger finalize only on state change
            if old and not old.is_finalized and self.is_finalized:
                self._finalize_consultation()
    # ======================================================
    # LIFECYCLE EVENTS
    # ======================================================

    def _on_consultation_started(self):
        """
        Runs only once when consultation is created.
        Uses state machine for status transition; locks pre-consultation.
        """
        from consultations_core.services.encounter_state_machine import EncounterStateMachine

        encounter = self.encounter

        # Lock pre-consultation if it exists
        if hasattr(encounter, "pre_consultation"):
            try:
                encounter.pre_consultation.lock(reason="Consultation started")
            except Exception:
                pass  # already locked or no pre_consultation

        # Update encounter status via state machine (sets consultation_start_time etc.)
        EncounterStateMachine.start_consultation(encounter, user=None)

    def _finalize_consultation(self):
        """
        Finalizes consultation and updates encounter via state machine.
        Transitions consultation_in_progress -> consultation_completed (not legacy 'completed').
        """
        if not self.ended_at:
            self.ended_at = timezone.now()
            super().save(update_fields=["ended_at"])

        encounter = self.encounter
        if encounter.status in ("completed", "consultation_completed", "closed"):
            return
        from consultations_core.services.encounter_state_machine import EncounterStateMachine
        EncounterStateMachine.complete_consultation(encounter, user=None)
