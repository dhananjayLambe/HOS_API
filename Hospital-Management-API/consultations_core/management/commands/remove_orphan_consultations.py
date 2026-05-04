"""
Remove orphan (non-finalized, clinically empty) consultations and repair stranded rows.

Also cancel active encounters stuck in pre-consultation with no consultation row and no
clinical pre data (empty-pre-phase).

Also remove leftover empty PreConsultation rows on already-cancelled/no-show encounters
(cancelled-empty-pre) — e.g. after the user cancels from the API, the encounter is inactive
and empty-pre-phase no longer applies.

Usage:
  python manage.py remove_orphan_consultations --kind both              # dry-run (default)
  python manage.py remove_orphan_consultations --kind both --apply
  python manage.py remove_orphan_consultations --kind empty-draft --apply --older-than-days 1
  python manage.py remove_orphan_consultations --kind empty-pre-phase --apply --older-than-days 1
  python manage.py remove_orphan_consultations --kind cancelled-empty-pre --apply
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone

from consultations_core.domain.preconsultation_clinical import preconsultation_is_clinically_empty
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.investigation import ConsultationInvestigations, InvestigationItem
from consultations_core.models.pre_consultation import PreConsultation
from consultations_core.services.encounter_state_machine import EncounterStateMachine

logger = logging.getLogger(__name__)

TERMINAL_STRANDED = ("cancelled", "no_show")

PRE_PHASE_STATUSES = (
    "created",
    "pre_consultation",
    "pre_consultation_in_progress",
    "pre_consultation_completed",
)


def _empty_summary_q() -> Q:
    return (Q(closure_note__isnull=True) | Q(closure_note="")) & Q(follow_up_date__isnull=True)


def _annotate_child_counts(qs):
    """Annotate consultation queryset with counts used to detect clinical emptiness."""
    inv_has_note = Exists(
        ConsultationInvestigations.objects.filter(consultation_id=OuterRef("pk")).exclude(
            Q(notes__isnull=True) | Q(notes="")
        )
    )
    inv_has_items = Exists(
        InvestigationItem.objects.filter(
            investigations__consultation_id=OuterRef("pk"),
            is_deleted=False,
        )
    )
    return qs.annotate(
        n_rx=Count("prescriptions", distinct=True),
        n_symptoms=Count("symptoms", distinct=True),
        n_custom_symptoms=Count("custom_symptoms", distinct=True),
        n_diagnoses=Count("diagnoses", distinct=True),
        n_custom_diagnoses=Count("custom_diagnoses", distinct=True),
        n_findings=Count("findings", distinct=True),
        n_custom_findings=Count("custom_findings", distinct=True),
        n_procedures=Count("procedures", distinct=True),
        n_follow_ups=Count("follow_ups", distinct=True),
        n_diagnostic_orders=Count("diagnostic_orders", distinct=True),
        _inv_note=inv_has_note,
        _inv_items=inv_has_items,
    )


def _empty_children_filter():
    return (
        Q(n_rx=0)
        & Q(n_symptoms=0)
        & Q(n_custom_symptoms=0)
        & Q(n_diagnoses=0)
        & Q(n_custom_diagnoses=0)
        & Q(n_findings=0)
        & Q(n_custom_findings=0)
        & Q(n_procedures=0)
        & Q(n_follow_ups=0)
        & Q(n_diagnostic_orders=0)
        & Q(_inv_note=False)
        & Q(_inv_items=False)
    )


def queryset_stranded():
    return (
        Consultation.objects.filter(is_finalized=False)
        .filter(encounter__status__in=TERMINAL_STRANDED)
        .select_related("encounter")
        .order_by("id")
    )


def queryset_empty_draft(*, older_than_days: int | None):
    qs = (
        Consultation.objects.filter(is_finalized=False)
        .filter(encounter__status="consultation_in_progress")
        .filter(_empty_summary_q())
        .select_related("encounter")
    )
    qs = _annotate_child_counts(qs).filter(_empty_children_filter())
    if older_than_days is not None and older_than_days > 0:
        cutoff = timezone.now() - timedelta(days=older_than_days)
        qs = qs.filter(started_at__lt=cutoff)
    return qs.order_by("id")


def encounter_matches_empty_pre_phase(enc: ClinicalEncounter, *, older_than_days: int | None) -> bool:
    if not enc.is_active or enc.status not in PRE_PHASE_STATUSES:
        return False
    if Consultation.objects.filter(encounter_id=enc.pk).exists():
        return False
    if older_than_days is not None and older_than_days > 0:
        cutoff = timezone.now() - timedelta(days=older_than_days)
        if enc.created_at >= cutoff:
            return False
    return preconsultation_is_clinically_empty(enc)


def collect_empty_pre_phase_encounter_pks(*, older_than_days: int | None):
    qs = (
        ClinicalEncounter.objects.filter(is_active=True, status__in=PRE_PHASE_STATUSES)
        .filter(~Exists(Consultation.objects.filter(encounter_id=OuterRef("pk"))))
        .order_by("pk")
    )
    if older_than_days is not None and older_than_days > 0:
        cutoff = timezone.now() - timedelta(days=older_than_days)
        qs = qs.filter(created_at__lt=cutoff)
    pks = []
    for enc in qs.iterator(chunk_size=100):
        if preconsultation_is_clinically_empty(enc):
            pks.append(enc.pk)
    return pks


def queryset_empty_pre_phase(*, older_than_days: int | None):
    pks = collect_empty_pre_phase_encounter_pks(older_than_days=older_than_days)
    if not pks:
        return ClinicalEncounter.objects.none()
    return ClinicalEncounter.objects.filter(pk__in=pks).order_by("pk")


def _cancelled_pre_age_ref(enc: ClinicalEncounter):
    return enc.cancelled_at or enc.updated_at


def encounter_matches_cancelled_empty_pre(enc: ClinicalEncounter, *, older_than_days: int | None) -> bool:
    """Cancelled/no-show, inactive, no consultation, has PreConsultation, pre clinically empty."""
    if enc.is_active:
        return False
    if enc.status not in TERMINAL_STRANDED:
        return False
    if Consultation.objects.filter(encounter_id=enc.pk).exists():
        return False
    if not PreConsultation.objects.filter(encounter_id=enc.pk).exists():
        return False
    if older_than_days is not None and older_than_days > 0:
        cutoff = timezone.now() - timedelta(days=older_than_days)
        if _cancelled_pre_age_ref(enc) >= cutoff:
            return False
    return preconsultation_is_clinically_empty(enc)


def collect_cancelled_empty_pre_encounter_pks(*, older_than_days: int | None):
    qs = (
        ClinicalEncounter.objects.filter(is_active=False, status__in=TERMINAL_STRANDED)
        .filter(~Exists(Consultation.objects.filter(encounter_id=OuterRef("pk"))))
        .filter(Exists(PreConsultation.objects.filter(encounter_id=OuterRef("pk"))))
        .order_by("pk")
    )
    if older_than_days is not None and older_than_days > 0:
        cutoff = timezone.now() - timedelta(days=older_than_days)
        qs = qs.filter(
            Q(cancelled_at__lt=cutoff)
            | Q(cancelled_at__isnull=True, updated_at__lt=cutoff)
        )
    pks = []
    for enc in qs.iterator(chunk_size=100):
        if encounter_matches_cancelled_empty_pre(enc, older_than_days=older_than_days):
            pks.append(enc.pk)
    return pks


def queryset_cancelled_empty_pre(*, older_than_days: int | None):
    pks = collect_cancelled_empty_pre_encounter_pks(older_than_days=older_than_days)
    if not pks:
        return ClinicalEncounter.objects.none()
    return ClinicalEncounter.objects.filter(pk__in=pks).order_by("pk")


def _safeguard_encounter_inactive(encounter: ClinicalEncounter) -> None:
    if encounter.is_active:
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(
            is_active=False,
            updated_at=timezone.now(),
        )
        encounter.refresh_from_db()


class Command(BaseCommand):
    help = (
        "List or remove orphan consultations: stranded (terminal encounter + draft row), "
        "empty-draft (in-progress, no clinical data), empty-pre-phase (active pre-status, "
        "no consultation, empty pre data), or cancelled-empty-pre (inactive cancelled/no-show "
        "with leftover empty PreConsultation). Default is dry-run; use --apply to mutate."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--kind",
            choices=("stranded", "empty-draft", "empty-pre-phase", "cancelled-empty-pre", "both"),
            default="both",
            help="Which orphan class to process (default: both includes all four buckets).",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Perform deletes / cancels. Without this flag, only a dry-run is performed.",
        )
        parser.add_argument(
            "--older-than-days",
            type=int,
            default=None,
            metavar="N",
            help=(
                "Age filter (N>0 only): empty-draft uses consultation.started_at; "
                "empty-pre-phase uses encounter.created_at; cancelled-empty-pre uses "
                "encounter.cancelled_at if set else updated_at. "
                "Omit this flag or pass 0 to apply no age cutoff (includes same-day rows)."
            ),
        )

    def handle(self, *args, **options):
        kind: str = options["kind"]
        apply: bool = options["apply"]
        older: int | None = options.get("older_than_days")

        style = self.style
        self.stdout.write(
            f"remove_orphan_consultations: kind={kind} "
            f"mode={'APPLY' if apply else 'DRY-RUN'}"
            + (f" older_than_days={older}" if older is not None else "")
        )

        stranded_qs = queryset_stranded() if kind in ("stranded", "both") else Consultation.objects.none()
        draft_qs = queryset_empty_draft(older_than_days=older) if kind in ("empty-draft", "both") else Consultation.objects.none()
        pre_pks = (
            collect_empty_pre_phase_encounter_pks(older_than_days=older)
            if kind in ("empty-pre-phase", "both")
            else []
        )
        pre_qs = (
            ClinicalEncounter.objects.filter(pk__in=pre_pks).order_by("pk")
            if pre_pks
            else ClinicalEncounter.objects.none()
        )
        cancelled_pre_pks = (
            collect_cancelled_empty_pre_encounter_pks(older_than_days=older)
            if kind in ("cancelled-empty-pre", "both")
            else []
        )
        cancelled_pre_qs = (
            ClinicalEncounter.objects.filter(pk__in=cancelled_pre_pks).order_by("pk")
            if cancelled_pre_pks
            else ClinicalEncounter.objects.none()
        )

        n_stranded = stranded_qs.count()
        n_draft = draft_qs.count()
        n_pre = len(pre_pks)
        n_cancelled_pre = len(cancelled_pre_pks)
        if kind in ("stranded", "both"):
            self.stdout.write(f"Candidates (stranded, terminal encounter + non-finalized): {n_stranded}")
        if kind in ("empty-draft", "both"):
            self.stdout.write(
                f"Candidates (empty-draft, in_progress + empty clinical + non-finalized): {n_draft}"
            )
        if kind in ("empty-pre-phase", "both"):
            self.stdout.write(
                f"Candidates (empty-pre-phase, no consultation + empty pre + active): {n_pre}"
            )
        if kind in ("cancelled-empty-pre", "both"):
            self.stdout.write(
                f"Candidates (cancelled-empty-pre, terminal + no consultation + leftover empty pre): "
                f"{n_cancelled_pre}"
            )

        removed_stranded = skipped_stranded = 0
        removed_draft = skipped_draft = 0
        removed_pre = skipped_pre = 0
        removed_cancelled_pre = skipped_cancelled_pre = 0

        if kind in ("stranded", "both"):
            removed_stranded, skipped_stranded = self._process_stranded(stranded_qs, apply=apply)
        if kind in ("empty-draft", "both"):
            removed_draft, skipped_draft = self._process_empty_draft(
                draft_qs, apply=apply, older_than_days=older
            )
        if kind in ("empty-pre-phase", "both"):
            removed_pre, skipped_pre = self._process_empty_pre_phase(
                pre_qs, apply=apply, older_than_days=older
            )
        if kind in ("cancelled-empty-pre", "both"):
            removed_cancelled_pre, skipped_cancelled_pre = self._process_cancelled_empty_pre(
                cancelled_pre_qs, apply=apply, older_than_days=older
            )

        total_consult_removed = removed_stranded + removed_draft
        total_skipped = (
            skipped_stranded + skipped_draft + skipped_pre + skipped_cancelled_pre
        )

        if not apply:
            parts = []
            if n_stranded + n_draft:
                parts.append(f"{n_stranded + n_draft} orphan consultation(s)")
            if n_pre:
                parts.append(f"{n_pre} empty pre-phase encounter(s)")
            if n_cancelled_pre:
                parts.append(f"{n_cancelled_pre} cancelled encounter(s) with empty pre to scrub")
            if parts:
                self.stdout.write(
                    style.WARNING(
                        f"Would remove/cancel {' and '.join(parts)} (dry-run; no DB writes)."
                    )
                )
            else:
                self.stdout.write(style.WARNING("Would remove 0 candidates (dry-run; no DB writes)."))
            if older is not None and older > 0:
                self.stdout.write(
                    style.NOTICE(
                        "Tip: --older-than-days excludes rows newer than N days. "
                        "Omit it or use --older-than-days=0 to include visits from the last 24 hours."
                    )
                )
        else:
            self.stdout.write(
                style.SUCCESS(
                    f"Removed {total_consult_removed} orphan consultation(s); "
                    f"cancelled {removed_pre} empty pre-phase encounter(s); "
                    f"scrubbed empty pre on {removed_cancelled_pre} cancelled encounter(s)."
                )
            )
            if kind == "both":
                self.stdout.write(f"  stranded: {removed_stranded} removed")
                self.stdout.write(f"  empty-draft: {removed_draft} removed")
                self.stdout.write(f"  empty-pre-phase: {removed_pre} cancelled")
                self.stdout.write(f"  cancelled-empty-pre: {removed_cancelled_pre} pre rows removed")
            self.stdout.write(f"Skipped: {total_skipped}")
            if total_consult_removed == 0 and removed_pre == 0 and removed_cancelled_pre == 0:
                self.stdout.write(style.WARNING("No orphan rows removed (none matched or all skipped)."))
                if older is not None and older > 0:
                    self.stdout.write(
                        style.NOTICE(
                            "Tip: same-day visits are excluded when --older-than-days > 0. "
                            "Retry without the flag or with --older-than-days=0."
                        )
                    )

        self._print_samples(
            stranded_qs,
            draft_qs,
            pre_qs,
            cancelled_pre_qs,
            kind,
            n_stranded,
            n_draft,
            n_pre,
            n_cancelled_pre,
        )

    def _print_samples(
        self,
        stranded_qs,
        draft_qs,
        pre_qs,
        cancelled_pre_qs,
        kind: str,
        n_stranded: int,
        n_draft: int,
        n_pre: int,
        n_cancelled_pre: int,
        limit: int = 20,
    ):
        lines = []
        if kind in ("stranded", "both"):
            for c in stranded_qs[:limit]:
                pnr = getattr(c.encounter, "visit_pnr", None) or ""
                lines.append(f"  stranded  consultation={c.pk}  visit_pnr={pnr}  encounter_status={c.encounter.status}")
        if kind in ("empty-draft", "both"):
            for c in draft_qs[:limit]:
                pnr = getattr(c.encounter, "visit_pnr", None) or ""
                lines.append(f"  empty-draft  consultation={c.pk}  visit_pnr={pnr}")
        if kind in ("empty-pre-phase", "both"):
            for enc in pre_qs[:limit]:
                pnr = getattr(enc, "visit_pnr", None) or ""
                lines.append(f"  empty-pre-phase  encounter={enc.pk}  visit_pnr={pnr}  status={enc.status}")
        if kind in ("cancelled-empty-pre", "both"):
            for enc in cancelled_pre_qs[:limit]:
                pnr = getattr(enc, "visit_pnr", None) or ""
                lines.append(
                    f"  cancelled-empty-pre  encounter={enc.pk}  visit_pnr={pnr}  status={enc.status}"
                )
        if lines:
            self.stdout.write("Sample (up to %d rows per bucket):" % limit)
            for ln in lines:
                self.stdout.write(ln)
            truncated = (
                (
                    kind == "both"
                    and (
                        n_stranded > limit
                        or n_draft > limit
                        or n_pre > limit
                        or n_cancelled_pre > limit
                    )
                )
                or (kind == "stranded" and n_stranded > limit)
                or (kind == "empty-draft" and n_draft > limit)
                or (kind == "empty-pre-phase" and n_pre > limit)
                or (kind == "cancelled-empty-pre" and n_cancelled_pre > limit)
            )
            if truncated:
                self.stdout.write(self.style.NOTICE("… (samples truncated; see candidate counts above)"))

    def _process_stranded(self, qs, *, apply: bool) -> tuple[int, int]:
        removed = 0
        skipped = 0
        for c in qs.iterator(chunk_size=100):
            if not apply:
                continue
            try:
                with transaction.atomic():
                    enc = ClinicalEncounter.objects.select_for_update().get(pk=c.encounter_id)
                    if enc.status not in TERMINAL_STRANDED:
                        skipped += 1
                        continue
                    row = Consultation.objects.select_for_update().filter(pk=c.pk, is_finalized=False).first()
                    if not row:
                        skipped += 1
                        continue
                    row.delete()
                    removed += 1
            except Exception as exc:
                logger.exception("remove_orphan_consultations stranded failed consultation_id=%s", c.pk)
                self.stderr.write(self.style.ERROR(f"stranded skip consultation={c.pk}: {exc}"))
                skipped += 1
        return removed, skipped

    def _process_empty_draft(self, qs, *, apply: bool, older_than_days: int | None) -> tuple[int, int]:
        removed = 0
        skipped = 0
        for c in qs.iterator(chunk_size=100):
            if not apply:
                continue
            try:
                with transaction.atomic():
                    enc = ClinicalEncounter.objects.select_for_update().get(pk=c.encounter_id)
                    if enc.status != "consultation_in_progress":
                        skipped += 1
                        continue
                    locked = (
                        Consultation.objects.select_for_update()
                        .filter(pk=c.pk, is_finalized=False)
                        .first()
                    )
                    if not locked:
                        skipped += 1
                        continue
                    if not queryset_empty_draft(older_than_days=older_than_days).filter(pk=locked.pk).exists():
                        skipped += 1
                        continue
                    try:
                        EncounterStateMachine.cancel(enc, user=None)
                    except DjangoValidationError as e:
                        self.stderr.write(self.style.ERROR(f"empty-draft skip consultation={c.pk}: cancel: {e}"))
                        skipped += 1
                        continue
                    enc.refresh_from_db()
                    _safeguard_encounter_inactive(enc)
                    Consultation.objects.filter(pk=locked.pk).delete()
                    removed += 1
            except Exception as exc:
                logger.exception("remove_orphan_consultations empty-draft failed consultation_id=%s", c.pk)
                self.stderr.write(self.style.ERROR(f"empty-draft skip consultation={c.pk}: {exc}"))
                skipped += 1
        return removed, skipped

    def _process_empty_pre_phase(self, qs, *, apply: bool, older_than_days: int | None) -> tuple[int, int]:
        removed = 0
        skipped = 0
        for enc in qs.iterator(chunk_size=100):
            if not apply:
                continue
            try:
                with transaction.atomic():
                    locked = ClinicalEncounter.objects.select_for_update().get(pk=enc.pk)
                    if not encounter_matches_empty_pre_phase(locked, older_than_days=older_than_days):
                        skipped += 1
                        continue
                    try:
                        EncounterStateMachine.cancel(locked, user=None)
                    except DjangoValidationError as e:
                        self.stderr.write(
                            self.style.ERROR(f"empty-pre-phase skip encounter={enc.pk}: cancel: {e}")
                        )
                        skipped += 1
                        continue
                    locked.refresh_from_db()
                    _safeguard_encounter_inactive(locked)
                    PreConsultation.objects.filter(encounter_id=locked.pk).delete()
                    removed += 1
            except Exception as exc:
                logger.exception("remove_orphan_consultations empty-pre-phase failed encounter_id=%s", enc.pk)
                self.stderr.write(self.style.ERROR(f"empty-pre-phase skip encounter={enc.pk}: {exc}"))
                skipped += 1
        return removed, skipped

    def _process_cancelled_empty_pre(self, qs, *, apply: bool, older_than_days: int | None) -> tuple[int, int]:
        """Delete empty PreConsultation (and cascaded sections) on inactive cancelled/no-show visits."""
        removed = 0
        skipped = 0
        for enc in qs.iterator(chunk_size=100):
            if not apply:
                continue
            try:
                with transaction.atomic():
                    locked = ClinicalEncounter.objects.select_for_update().get(pk=enc.pk)
                    if not encounter_matches_cancelled_empty_pre(
                        locked, older_than_days=older_than_days
                    ):
                        skipped += 1
                        continue
                    deleted, _ = PreConsultation.objects.filter(encounter_id=locked.pk).delete()
                    if deleted < 1:
                        skipped += 1
                        continue
                    removed += 1
            except Exception as exc:
                logger.exception(
                    "remove_orphan_consultations cancelled-empty-pre failed encounter_id=%s", enc.pk
                )
                self.stderr.write(
                    self.style.ERROR(f"cancelled-empty-pre skip encounter={enc.pk}: {exc}")
                )
                skipped += 1
        return removed, skipped
