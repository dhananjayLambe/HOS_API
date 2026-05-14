"""
Print why routing would accept or reject each marketplace branch for one diagnostic order,
including BranchServicePricing row counts per required catalog service_id.

Usage:
  python manage.py inspect_diagnostic_routing_order <diagnostic_order_uuid>
  python manage.py inspect_diagnostic_routing_order DX26051370D5C569 --by-order-number

Manual shell verification (FK on test lines is ``order``, not ``diagnostic_order``)::

  from diagnostics_engine.models.orders import DiagnosticOrder, DiagnosticOrderTestLine
  order = DiagnosticOrder.objects.get(order_number="DX26051370D5C569")
  for line in DiagnosticOrderTestLine.objects.filter(order=order).select_related("service"):
      print("SERVICE_ID:", line.service_id, "CODE:", line.service.code, "NAME:", line.service.name)

  from labs.models.branch_pricing import BranchServicePricing
  BranchServicePricing.objects.filter(
      branch_id="<lab-branch-uuid>",
      service_id=line.service_id,
      is_deleted=False,
  ).count()
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from django.utils import timezone

from diagnostics_engine.models.orders import DiagnosticOrder, DiagnosticOrderTestLine
from diagnostics_engine.services.routing.eligibility_engine import EligibilityEngine
from diagnostics_engine.services.routing.routing_helpers import resolve_routing_location
from labs.models.branch_pricing import BranchServicePricing


class Command(BaseCommand):
    help = "Inspect routing eligibility per branch for a single DiagnosticOrder (read-only)."

    def add_arguments(self, parser):
        parser.add_argument(
            "order_id",
            help="DiagnosticOrder UUID (pk), or order_number when --by-order-number is set.",
        )
        parser.add_argument(
            "--by-order-number",
            action="store_true",
            help="Treat order_id as DiagnosticOrder.order_number (e.g. DX26051370D5C569).",
        )

    def handle(self, *args, **options):
        raw = options["order_id"].strip()
        by_num = options["by_order_number"]
        try:
            if by_num:
                order = DiagnosticOrder.objects.select_related(
                    "encounter",
                    "encounter__clinic",
                    "encounter__clinic__address",
                    "patient_profile",
                    "patient_profile__account",
                    "patient_profile__account__user",
                ).get(order_number=raw)
            else:
                order = DiagnosticOrder.objects.select_related(
                    "encounter",
                    "encounter__clinic",
                    "encounter__clinic__address",
                    "patient_profile",
                    "patient_profile__account",
                    "patient_profile__account__user",
                ).get(pk=raw)
        except DiagnosticOrder.DoesNotExist as exc:
            raise CommandError(f"DiagnosticOrder not found: {raw!r} (by_number={by_num})") from exc

        lines = list(
            DiagnosticOrderTestLine.objects.filter(order_id=order.pk)
            .select_related("service")
            .order_by("id")
        )
        self.stdout.write(self.style.NOTICE(f"Order {order.pk}  order_number={order.order_number}"))
        self.stdout.write(f"  routing_status={order.routing_status}")
        self.stdout.write(f"  sample_collection_mode={order.sample_collection_mode!r}")
        self.stdout.write(f"  branch_id (order header)={order.branch_id}")

        if not lines:
            self.stdout.write(self.style.ERROR("No DiagnosticOrderTestLine rows — routing evaluates zero services."))
            return

        self.stdout.write("  Test lines (use filter(order=order) or order_id= in shell; not diagnostic_order):")
        unique_sids: list = []
        seen = set()
        for ln in lines:
            sc = getattr(ln.service, "code", None) if ln.service_id else None
            sn = getattr(ln.service, "name", None) if ln.service_id else None
            self.stdout.write(f"    - line_id={ln.pk} service_id={ln.service_id} code={sc!r} name={sn!r}")
            if ln.service_id and ln.service_id not in seen:
                seen.add(ln.service_id)
                unique_sids.append(ln.service_id)

        resolved = resolve_routing_location(order)
        self.stdout.write("  Resolved location:")
        self.stdout.write(
            f"    source={resolved.source!r} pincode={resolved.pincode!r} "
            f"lat={resolved.latitude} lon={resolved.longitude} city={resolved.city!r}"
        )

        today = timezone.now().date()
        all_c = EligibilityEngine.evaluate_all(order, resolved)
        eligible = [c for c in all_c if not c.ineligibility_reasons]
        self.stdout.write(self.style.NOTICE(f"  Eligible branches: {len(eligible)} / evaluated {len(all_c)}"))

        for c in sorted(all_c, key=lambda x: (bool(x.ineligibility_reasons), x.branch.branch_code)):
            status = "ELIGIBLE" if not c.ineligibility_reasons else "reject"
            self.stdout.write(
                f"  [{status}] {c.branch.branch_code} org={c.lab.organization_code} "
                f"branch_id={c.branch.pk} branch_home={c.branch.home_collection_available} "
                f"org_home={c.lab.home_collection_available}"
            )
            if c.eligibility_reasons:
                self.stdout.write(f"         ok: {c.eligibility_reasons}")
            if c.ineligibility_reasons:
                self.stdout.write(self.style.WARNING(f"         ir: {c.ineligibility_reasons}"))
            self.stdout.write("         BranchServicePricing (service_id must match order line exactly):")
            for sid in unique_sids:
                base = BranchServicePricing.objects.filter(branch=c.branch, service_id=sid, is_deleted=False)
                n_any = base.count()
                n_strict = (
                    base.filter(is_active=True, is_available=True, valid_from__lte=today)
                    .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today))
                    .count()
                )
                self.stdout.write(
                    f"           service_id={sid}  rows_deleted_false={n_any}  rows_eligibility_strict={n_strict}"
                )
