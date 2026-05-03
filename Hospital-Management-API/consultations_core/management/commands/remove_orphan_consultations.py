"""
Remove orphan (non-finalized, clinically empty) consultations and repair stranded rows.

Usage:
  python manage.py remove_orphan_consultations --kind both              # dry-run (default)
  python manage.py remove_orphan_consultations --kind both --apply
  python manage.py remove_orphan_consultations --kind empty-draft --apply --older-than-days 1
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone

from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.investigation import ConsultationInvestigations, InvestigationItem
from consultations_core.services.encounter_state_machine import EncounterStateMachine

logger = logging.getLogger(__name__)

TERMINAL_STRANDED = ("cancelled", "no_show")


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


def _safeguard_encounter_inactive(encounter: ClinicalEncounter) -> None:
    if encounter.is_active:
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(
            is_active=False,
            updated_at=timezone.now(),
        )
        encounter.refresh_from_db()


class Command(BaseCommand):
    help = (
        "List or remove orphan consultations: stranded (terminal encounter + draft row) or "
        "empty-draft (in-progress, no clinical data). Default is dry-run; use --apply to mutate."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--kind",
            choices=("stranded", "empty-draft", "both"),
            default="both",
            help="Which orphan class to process (default: both).",
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
            help="For empty-draft only: only consultations whose started_at is older than N days.",
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

        n_stranded = stranded_qs.count()
        n_draft = draft_qs.count()
        if kind in ("stranded", "both"):
            self.stdout.write(f"Candidates (stranded, terminal encounter + non-finalized): {n_stranded}")
        if kind in ("empty-draft", "both"):
            self.stdout.write(
                f"Candidates (empty-draft, in_progress + empty clinical + non-finalized): {n_draft}"
            )

        removed_stranded = skipped_stranded = 0
        removed_draft = skipped_draft = 0

        if kind in ("stranded", "both"):
            removed_stranded, skipped_stranded = self._process_stranded(stranded_qs, apply=apply)
        if kind in ("empty-draft", "both"):
            removed_draft, skipped_draft = self._process_empty_draft(
                draft_qs, apply=apply, older_than_days=older
            )

        total_removed = removed_stranded + removed_draft
        total_skipped = skipped_stranded + skipped_draft

        if not apply:
            would = n_stranded + n_draft
            self.stdout.write(style.WARNING(f"Would remove {would} orphan consultation(s) (dry-run; no DB writes)."))
        else:
            self.stdout.write(style.SUCCESS(f"Removed {total_removed} orphan consultation(s)."))
            if kind == "both":
                self.stdout.write(f"  stranded: {removed_stranded} removed")
                self.stdout.write(f"  empty-draft: {removed_draft} removed")
            self.stdout.write(f"Skipped: {total_skipped}")
            if total_removed == 0:
                self.stdout.write(style.WARNING("No orphan consultations removed (none matched or all skipped)."))

        self._print_samples(stranded_qs, draft_qs, kind, n_stranded, n_draft)

    def _print_samples(self, stranded_qs, draft_qs, kind: str, n_stranded: int, n_draft: int, limit: int = 20):
        lines = []
        if kind in ("stranded", "both"):
            for c in stranded_qs[:limit]:
                pnr = getattr(c.encounter, "visit_pnr", None) or ""
                lines.append(f"  stranded  consultation={c.pk}  visit_pnr={pnr}  encounter_status={c.encounter.status}")
        if kind in ("empty-draft", "both"):
            for c in draft_qs[:limit]:
                pnr = getattr(c.encounter, "visit_pnr", None) or ""
                lines.append(f"  empty-draft  consultation={c.pk}  visit_pnr={pnr}")
        if lines:
            self.stdout.write("Sample (up to %d rows per bucket):" % limit)
            for ln in lines:
                self.stdout.write(ln)
            truncated = (kind in ("both") and (n_stranded > limit or n_draft > limit)) or (
                kind == "stranded" and n_stranded > limit
            ) or (kind == "empty-draft" and n_draft > limit)
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
