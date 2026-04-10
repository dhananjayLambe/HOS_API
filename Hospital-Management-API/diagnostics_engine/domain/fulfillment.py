"""STRICT fulfillment: branch must cover every service in the package version."""

from django.db.models import Q
from django.utils import timezone

from diagnostics_engine.models.catalog import DiagnosticPackage
from diagnostics_engine.models.providers import (
    BranchPackagePricing,
    BranchServiceArea,
    BranchServicePricing,
    DiagnosticProviderBranch,
)


class FulfillmentValidationService:
    @classmethod
    def branch_fulfills_package(
        cls,
        branch: DiagnosticProviderBranch,
        package: DiagnosticPackage,
        pincode: str | None = None,
    ) -> tuple[bool, str]:
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
            .exists()
        )
        if not bpp:
            return False, "No active branch package pricing for this version."

        items = package.items.filter(deleted_at__isnull=True).select_related("service")
        if not items.exists():
            return False, "Package has no active line items."

        for item in items:
            svc = item.service
            ok = BranchServicePricing.objects.filter(
                branch=branch,
                service=svc,
                is_active=True,
                is_available=True,
                valid_from__lte=today,
            ).filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today)).exists()
            if not ok:
                return False, f"Branch does not offer service {svc.code} (STRICT)."

        if pincode:
            if not BranchServiceArea.objects.filter(
                branch=branch,
                pincode=pincode,
                is_active=True,
                deleted_at__isnull=True,
            ).exists():
                return False, "Pincode not in branch service area."

        if not branch.is_active:
            return False, "Branch inactive."

        return True, ""
