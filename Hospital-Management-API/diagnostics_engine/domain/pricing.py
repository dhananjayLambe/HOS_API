"""Quote and price resolution for diagnostic services and versioned packages."""

from decimal import Decimal

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from diagnostics_engine.models.catalog import DiagnosticPackage
from diagnostics_engine.models.providers import BranchPackagePricing, BranchServicePricing, DiagnosticProviderBranch


class PricingQuoteService:
    """Primary: BranchPackagePricing for exact package version; optional derived sum."""

    @classmethod
    def quote_package_line(
        cls,
        branch: DiagnosticProviderBranch,
        package: DiagnosticPackage,
    ) -> dict:
        today = timezone.now().date()
        bpp = (
            BranchPackagePricing.objects.filter(
                branch=branch,
                package=package,
                is_active=True,
                is_available=True,
                valid_from__lte=today,
            )
            .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today))
            .order_by("-valid_from")
            .first()
        )
        if bpp:
            return {
                "selling_price": bpp.selling_price,
                "mrp": bpp.mrp,
                "is_price_derived": False,
                "branch_package_pricing_id": bpp.id,
                "platform_margin_type": bpp.platform_margin_type,
                "platform_margin_value": bpp.platform_margin_value,
                "doctor_commission_type": bpp.doctor_commission_type,
                "doctor_commission_value": bpp.doctor_commission_value,
                "lab_payout_snapshot": bpp.lab_payout_snapshot,
            }

        allow = getattr(settings, "DIAGNOSTICS_ALLOW_DERIVED_PACKAGE_PRICING", False)
        if not allow:
            raise ValueError("No branch package price and derived pricing is disabled.")

        total = Decimal("0.00")
        for item in package.items.filter(deleted_at__isnull=True):
            sp = cls._quote_service(branch, item.service, today)
            total += sp * item.quantity

        return {
            "selling_price": total,
            "mrp": total,
            "is_price_derived": True,
            "branch_package_pricing_id": None,
            "platform_margin_type": None,
            "platform_margin_value": Decimal("0"),
            "doctor_commission_type": None,
            "doctor_commission_value": Decimal("0"),
            "lab_payout_snapshot": None,
        }

    @staticmethod
    def _quote_service(branch, service, today) -> Decimal:
        row = (
            BranchServicePricing.objects.filter(
                branch=branch,
                service=service,
                is_active=True,
                is_available=True,
                valid_from__lte=today,
            )
            .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today))
            .order_by("-valid_from")
            .first()
        )
        if not row:
            raise ValueError(f"No active price for service {service.code} at branch.")
        return row.selling_price
