"""
Backfill LabCollectionRequest and LabOrderTestExecution for accepted assignments.

Usage:
  python manage.py backfill_home_collection_executions
  python manage.py backfill_home_collection_executions --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from labs.choices.workflow import AppointmentStatus, CollectionStatus, LabAssignmentStatus
from labs.models import LabCollectionRequest, LabOrderAssignment, LabOrderTestExecution
from labs.services.collection_request_provisioning import ensure_lab_collection_request
from labs.services.test_execution_provisioning import ensure_test_executions


class Command(BaseCommand):
    help = "Backfill collection requests and test executions for accepted lab assignments."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report counts only; do not write.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        qs = LabOrderAssignment.objects.filter(
            status=LabAssignmentStatus.ACCEPTED,
            is_deleted=False,
        ).select_related("diagnostic_order", "lab_branch")

        collections_created = 0
        executions_created = 0

        for assignment in qs.iterator(chunk_size=200):
            order = assignment.diagnostic_order
            mode = order.sample_collection_mode or "lab"

            if mode == "home":
                exists = LabCollectionRequest.objects.filter(diagnostic_order=order).exists()
                if not exists:
                    if dry_run:
                        collections_created += 1
                    else:
                        with transaction.atomic():
                            ensure_lab_collection_request(assignment=assignment)
                        collections_created += 1
                order.refresh_from_db()

                collection = getattr(order, "collection_request", None)
                if collection and collection.collection_status == CollectionStatus.COLLECTED:
                    before = LabOrderTestExecution.objects.filter(assignment=assignment).count()
                    if dry_run:
                        missing = order.test_lines.count() - before
                        if missing > 0:
                            executions_created += missing
                    else:
                        with transaction.atomic():
                            created = ensure_test_executions(
                                assignment=assignment,
                                collection_request=collection,
                            )
                        executions_created += len(created)

            elif mode == "lab":
                visit = getattr(order, "visit_appointment", None)
                if visit and visit.status in (
                    AppointmentStatus.CHECKED_IN,
                    AppointmentStatus.IN_PROGRESS,
                ):
                    before = LabOrderTestExecution.objects.filter(assignment=assignment).count()
                    if dry_run:
                        missing = order.test_lines.count() - before
                        if missing > 0:
                            executions_created += missing
                    else:
                        with transaction.atomic():
                            created = ensure_test_executions(
                                assignment=assignment,
                                visit_appointment=visit,
                            )
                        executions_created += len(created)

        prefix = "[dry-run] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"{prefix}Collections ensured: {collections_created}, "
                f"execution rows created: {executions_created}",
            ),
        )
