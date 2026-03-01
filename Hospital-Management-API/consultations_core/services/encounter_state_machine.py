"""
encounter_state_machine.py

Enterprise-grade state machine controller for ClinicalEncounter lifecycle.

Purpose:
--------
This module strictly controls all status transitions of a ClinicalEncounter.
It prevents invalid state jumps, enforces lifecycle integrity, maintains
audit logs, and ensures clinical data consistency.

Why This Exists:
----------------
1. Prevents invalid transitions (e.g., completed → pre_consultation).
2. Centralizes lifecycle control in one place.
3. Automatically manages timestamps and activation flags.
4. Enables legal-grade audit tracking.
5. Protects against accidental direct status updates.
6. Makes Encounter a true immutable clinical backbone.

Usage:
------
EncounterStateMachine.transition(encounter, "in_consultation", user=request.user)
"""

from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction

from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.encounter import EncounterStatusLog
from consultations_core.domain.audit import AuditService
from account.models import User


# =====================================================
# 🔒 ALLOWED STATE TRANSITIONS (strict forward-only)
# =====================================================

ALLOWED_TRANSITIONS = {
    "created": ["pre_consultation_in_progress", "consultation_in_progress", "cancelled", "no_show"],
    "pre_consultation_in_progress": ["pre_consultation_completed", "consultation_in_progress", "cancelled"],
    "pre_consultation_completed": ["consultation_in_progress", "cancelled"],
    "consultation_in_progress": ["consultation_completed", "cancelled"],
    "consultation_completed": ["closed", "cancelled"],
    "closed": [],
    "cancelled": [],
    "no_show": [],
    # Legacy (existing rows)
    "pre_consultation": ["pre_consultation_completed", "consultation_in_progress", "in_consultation", "cancelled"],
    "in_consultation": ["consultation_completed", "completed", "cancelled"],
    "completed": ["closed"],
}


# =====================================================
# 🧠 STATE MACHINE CLASS
# =====================================================

class EncounterStateMachine:
    """
    Strict lifecycle controller for ClinicalEncounter.
    """

    @staticmethod
    @transaction.atomic
    def transition(encounter: ClinicalEncounter, new_status: str, user: User = None, source: str = "system", reason: str = None):
        """
        Safely transition encounter to a new status.

        Args:
            encounter (ClinicalEncounter): Target encounter instance
            new_status (str): Target status
            user (User): User performing transition
            source (str): Audit source (system, doctor, helpdesk, patient, admin)
            reason (str): Optional reason for the transition

        Raises:
            ValidationError: If transition is invalid
        """

        if not isinstance(encounter, ClinicalEncounter):
            raise ValidationError("Invalid encounter instance.")

        current_status = encounter.status

        # Prevent no-op transitions
        if current_status == new_status:
            return encounter

        # Validate transition
        allowed = ALLOWED_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            raise ValidationError(
                f"Invalid transition from '{current_status}' to '{new_status}'. "
                f"Allowed: {allowed}"
            )

        # Apply lifecycle rules and timestamps
        now = timezone.now()

        if new_status == "pre_consultation_in_progress" and not encounter.check_in_time:
            encounter.check_in_time = now

        if new_status in ("consultation_in_progress", "in_consultation"):
            if not encounter.consultation_start_time:
                encounter.consultation_start_time = now
            if not encounter.started_at:
                encounter.started_at = now

        if new_status in ("consultation_completed", "completed"):
            if not encounter.consultation_end_time:
                encounter.consultation_end_time = now
            if not encounter.completed_at:
                encounter.completed_at = now

        if new_status == "closed":
            if not encounter.closed_at:
                encounter.closed_at = now
            encounter.is_active = False

        if new_status in ("consultation_completed", "completed"):
            encounter.is_active = False

        if new_status in ["cancelled", "no_show"]:
            encounter.is_active = False

        if new_status == "cancelled":
            encounter.cancelled_at = now
            encounter.cancelled_by = user

        # Update status and persist via QuerySet.update() to bypass Encounter.save()
        # validation that blocks all status changes (state machine is the only allowed path).
        encounter.status = new_status
        encounter.updated_by = user
        encounter.updated_at = now
        update_kwargs = {
            "status": new_status,
            "updated_by_id": user.id if user else None,
            "updated_at": now,
            "is_active": encounter.is_active,
            "check_in_time": encounter.check_in_time,
            "consultation_start_time": encounter.consultation_start_time,
            "consultation_end_time": encounter.consultation_end_time,
            "closed_at": encounter.closed_at,
            "started_at": encounter.started_at,
            "completed_at": encounter.completed_at,
        }
        if new_status == "cancelled":
            update_kwargs["cancelled_at"] = now
            update_kwargs["cancelled_by_id"] = user.id if user else None
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(**update_kwargs)
        encounter.refresh_from_db()

        # Legacy encounter-specific log
        EncounterStatusLog.objects.create(
            encounter=encounter,
            from_status=current_status,
            to_status=new_status,
            changed_by=user,
        )

        # Unified clinical audit log (NABH / medico-legal)
        AuditService.log_status_change(
            instance=encounter,
            field_name="status",
            old_value=current_status,
            new_value=new_status,
            user=user,
            source=source,
            reason=reason,
        )

        return encounter

    # -------------------------------------------------
    # Convenience Methods (Cleaner Service Calls)
    # -------------------------------------------------

    @staticmethod
    def start_pre_consultation(encounter, user=None):
        """CREATED → PRE_CONSULTATION_IN_PROGRESS"""
        return EncounterStateMachine.transition(
            encounter, "pre_consultation_in_progress", user
        )

    @staticmethod
    def complete_pre_consultation(encounter, user=None):
        """PRE_CONSULTATION_IN_PROGRESS → PRE_CONSULTATION_COMPLETED"""
        return EncounterStateMachine.transition(
            encounter, "pre_consultation_completed", user
        )

    @staticmethod
    def start_consultation(encounter, user=None):
        """PRE_CONSULTATION_COMPLETED → CONSULTATION_IN_PROGRESS (or CREATED → CONSULTATION_IN_PROGRESS for doctor override)"""
        return EncounterStateMachine.transition(
            encounter, "consultation_in_progress", user
        )

    @staticmethod
    def complete_consultation(encounter, user=None):
        """CONSULTATION_IN_PROGRESS → CONSULTATION_COMPLETED"""
        return EncounterStateMachine.transition(
            encounter, "consultation_completed", user
        )

    @staticmethod
    def close_encounter(encounter, user=None):
        """CONSULTATION_COMPLETED → CLOSED"""
        return EncounterStateMachine.transition(
            encounter, "closed", user
        )

    @staticmethod
    def move_to_pre_consultation(encounter, user=None):
        """Legacy: transition to pre_consultation_in_progress"""
        return EncounterStateMachine.transition(
            encounter, "pre_consultation_in_progress", user
        )

    @staticmethod
    def move_to_consultation(encounter, user=None):
        """Legacy: transition to consultation_in_progress"""
        return EncounterStateMachine.transition(
            encounter, "consultation_in_progress", user
        )

    @staticmethod
    def complete(encounter, user=None):
        """
        Complete an encounter. Routes to the correct transition:
        - consultation_in_progress -> consultation_completed
        - consultation_completed -> closed
        - in_consultation (legacy) -> completed
        """
        status = (encounter.status or "").strip()
        if status == "consultation_in_progress":
            return EncounterStateMachine.complete_consultation(encounter, user)
        if status == "consultation_completed":
            return EncounterStateMachine.close_encounter(encounter, user)
        return EncounterStateMachine.transition(encounter, "completed", user)

    @staticmethod
    def cancel(encounter, user=None):
        return EncounterStateMachine.transition(
            encounter, "cancelled", user
        )

    @staticmethod
    def mark_no_show(encounter, user=None):
        return EncounterStateMachine.transition(
            encounter, "no_show", user
        )
