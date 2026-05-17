"""
Backfill LabCollectionRequest and LabOrderTestExecution for accepted assignments.

Usage:
  python manage.py backfill_home_collection_executions
  python manage.py backfill_home_collection_executions --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from labs.api.services.collection_request_provisioning import ensure_lab_collection_request
from labs.choices.workflow import LabAssignmentStatus
from labs.models import LabCollectionRequest, LabOrderAssignment, LabOrderTestExecution
from labs.services.test_execution_provisioning import ensure_test_executions_for_assignment


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
                            ensure_lab_collection_request(
                                diagnostic_order=order,
                                lab_branch=assignment.lab_branch,
                            )
                        collections_created += 1
                order.refresh_from_db()

            before = LabOrderTestExecution.objects.filter(assignment=assignment).count()
            if dry_run:
                missing = order.test_lines.count() - before
                if missing > 0:
                    executions_created += missing
            else:
                with transaction.atomic():
                    created = ensure_test_executions_for_assignment(assignment)
                executions_created += len(created)

        prefix = "[dry-run] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"{prefix}Collections ensured: {collections_created}, "
                f"execution rows created: {executions_created}",
            ),
        )
