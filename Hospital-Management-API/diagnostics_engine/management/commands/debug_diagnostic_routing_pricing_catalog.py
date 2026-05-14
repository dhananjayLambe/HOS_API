"""
Print order test-line catalog UUIDs vs every BranchServicePricing row on each routable branch.

Read-only. Use to confirm ``BranchServicePricing.service_id`` matches
``DiagnosticOrderTestLine.service_id`` (marketplace eligibility is UUID-keyed).

Usage::

  python manage.py debug_diagnostic_routing_pricing_catalog <diagnostic_order_uuid>
  python manage.py debug_diagnostic_routing_pricing_catalog DX26051370D5C569 --by-order-number
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count

from diagnostics_engine.models.catalog import DiagnosticServiceMaster
from diagnostics_engine.models.orders import DiagnosticOrder, DiagnosticOrderTestLine
from diagnostics_engine.services.routing.routing_helpers import routable_lab_branches_queryset
from labs.models.branch_pricing import BranchServicePricing


class Command(BaseCommand):
    help = "Debug: order test lines vs branch pricing catalog (grouped by branch)."

    def add_arguments(self, parser):
        parser.add_argument(
            "order_id",
            help="DiagnosticOrder UUID (pk), or order_number when --by-order-number is set.",
        )
        parser.add_argument(
            "--by-order-number",
            action="store_true",
            help="Treat order_id as DiagnosticOrder.order_number.",
        )

    def handle(self, *args, **options):
        raw = options["order_id"].strip()
        by_num = options["by_order_number"]
        try:
            if by_num:
                order = DiagnosticOrder.objects.get(order_number=raw)
            else:
                order = DiagnosticOrder.objects.get(pk=raw)
        except DiagnosticOrder.DoesNotExist as exc:
            raise CommandError(f"DiagnosticOrder not found: {raw!r} (by_number={by_num})") from exc

        lines = list(
            DiagnosticOrderTestLine.objects.filter(order_id=order.pk)
            .select_related("service")
            .order_by("id")
        )
        self.stdout.write(self.style.NOTICE(f"Order {order.pk}  order_number={order.order_number}"))
        self.stdout.write(self.style.WARNING("--- Order test lines (canonical for routing) ---"))
        for tl in lines:
            s = tl.service
            self.stdout.write(
                f"  test_line_id={tl.pk}  service_id={tl.service_id}  "
                f"code={getattr(s, 'code', '')!r}  name={getattr(s, 'name', '')!r}"
            )

        self.stdout.write(self.style.WARNING("\n--- Duplicate catalog codes (deleted_at IS NULL) ---"))
        dup = (
            DiagnosticServiceMaster.objects.filter(deleted_at__isnull=True)
            .values("code")
            .annotate(n=Count("id"))
            .filter(n__gt=1)
            .order_by("code")
        )
        rows = list(dup)
        if not rows:
            self.stdout.write("  (none — ``DiagnosticServiceMaster.code`` is unique in the ORM.)")
        for r in rows:
            self.stdout.write(f"  code={r['code']!r}  count={r['n']}")
            for svc in DiagnosticServiceMaster.objects.filter(
                deleted_at__isnull=True, code=r["code"]
            ).order_by("created_at"):
                self.stdout.write(f"    id={svc.pk}  name={svc.name!r}  created_at={svc.created_at}")

        branches = list(routable_lab_branches_queryset().order_by("branch_code"))
        self.stdout.write(
            self.style.WARNING(f"\n--- BranchServicePricing per routable branch ({len(branches)}) ---")
        )
        for br in branches:
            self.stdout.write(
                self.style.NOTICE(
                    f"\nbranch_id={br.pk}  branch_code={getattr(br, 'branch_code', '')!r}  "
                    f"org={br.organization_id}"
                )
            )
            priced = (
                BranchServicePricing.objects.filter(branch=br, is_deleted=False)
                .select_related("service")
                .order_by("service__code", "id")
            )
            n = priced.count()
            if n == 0:
                self.stdout.write("  (no BranchServicePricing rows, is_deleted=False)")
                continue
            for p in priced:
                s = p.service
                self.stdout.write(
                    f"  pricing_id={p.pk}  service_id={p.service_id}  "
                    f"code={getattr(s, 'code', '')!r}  name={getattr(s, 'name', '')!r}  "
                    f"is_active={p.is_active}  is_available={p.is_available}"
                )
