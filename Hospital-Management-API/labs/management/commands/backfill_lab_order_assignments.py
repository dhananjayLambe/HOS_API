"""Create missing LabOrderAssignment rows for routed diagnostic orders."""

from django.core.management.base import BaseCommand
from django.db.models import Q

from diagnostics_engine.models.routing import RoutingLabOrderAssignment
from labs.api.services.lab_assignment_provisioning import ensure_lab_order_assignment
from labs.models import LabOrderAssignment


class Command(BaseCommand):
    help = "Backfill LabOrderAssignment from RoutingLabOrderAssignment and DiagnosticOrder.branch_id."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report counts without creating rows.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        created = 0
        skipped = 0

        routing_qs = RoutingLabOrderAssignment.objects.select_related(
            "diagnostic_order",
            "branch",
        ).filter(branch_id__isnull=False)

        for routing in routing_qs.iterator():
            order = routing.diagnostic_order
            branch = routing.branch
            if LabOrderAssignment.objects.filter(diagnostic_order_id=order.pk).exists():
                skipped += 1
                continue
            if dry_run:
                created += 1
                continue
            ensure_lab_order_assignment(
                diagnostic_order=order,
                lab_branch=branch,
                assigned_by=routing.assigned_by,
            )
            created += 1

        from diagnostics_engine.models.orders import DiagnosticOrder

        branch_orders = DiagnosticOrder.objects.filter(branch_id__isnull=False).exclude(
            Q(lab_assignment__isnull=False)
        )
        for order in branch_orders.select_related("branch").iterator():
            if dry_run:
                created += 1
                continue
            ensure_lab_order_assignment(
                diagnostic_order=order,
                lab_branch=order.branch,
                assigned_by=None,
            )
            created += 1

        mode = "would create" if dry_run else "created"
        self.stdout.write(
            self.style.SUCCESS(f"Backfill complete: {mode} {created} assignment(s), skipped {skipped} existing.")
        )
