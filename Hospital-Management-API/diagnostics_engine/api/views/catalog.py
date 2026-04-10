"""REST views for diagnostic catalog: services, packages, quote, search, providers."""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from diagnostics_engine.domain.fulfillment import FulfillmentValidationService
from diagnostics_engine.domain.pricing import PricingQuoteService
from diagnostics_engine.models import DiagnosticPackage, DiagnosticProviderBranch, DiagnosticServiceMaster

from ..serializers.catalog import (
    DiagnosticPackageSerializer,
    DiagnosticServiceMasterSerializer,
    PackageQuoteRequestSerializer,
    PackageQuoteResponseSerializer,
    ProvidersForPackageQuerySerializer,
    UnifiedSearchQuerySerializer,
)


class DiagnosticServiceMasterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DiagnosticServiceMaster.objects.filter(is_active=True, deleted_at__isnull=True).select_related(
        "category"
    )
    serializer_class = DiagnosticServiceMasterSerializer


class DiagnosticPackageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        DiagnosticPackage.objects.filter(is_active=True, is_latest=True, deleted_at__isnull=True)
        .select_related("category")
        .prefetch_related("items__service", "items__service__category")
    )
    serializer_class = DiagnosticPackageSerializer


class PackageQuoteView(APIView):
    """POST: resolve price for a versioned package at a branch (hierarchy in PricingQuoteService)."""

    def post(self, request, *args, **kwargs):
        ser = PackageQuoteRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        branch = get_object_or_404(DiagnosticProviderBranch, pk=ser.validated_data["branch_id"])
        package = get_object_or_404(DiagnosticPackage, pk=ser.validated_data["package_id"])
        try:
            quote = PricingQuoteService.quote_package_line(branch, package)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        out = PackageQuoteResponseSerializer(
            {
                "selling_price": quote["selling_price"],
                "mrp": quote["mrp"],
                "is_price_derived": quote["is_price_derived"],
                "branch_package_pricing_id": quote["branch_package_pricing_id"],
            }
        )
        return Response(out.data)


class ProvidersForPackageView(APIView):
    """GET: branches that STRICT-fulfill a package; optional ?pincode= """

    def get(self, request, package_id, *args, **kwargs):
        qser = ProvidersForPackageQuerySerializer(data=request.query_params)
        qser.is_valid(raise_exception=True)
        pincode = (qser.validated_data.get("pincode") or "").strip() or None
        package = get_object_or_404(DiagnosticPackage, pk=package_id)
        branches = DiagnosticProviderBranch.objects.filter(is_active=True, deleted_at__isnull=True).select_related(
            "provider"
        )
        ok_ids = []
        for br in branches:
            ok, _msg = FulfillmentValidationService.branch_fulfills_package(br, package, pincode=pincode)
            if ok:
                ok_ids.append(str(br.id))
        return Response({"branch_ids": ok_ids, "count": len(ok_ids)})


class UnifiedCatalogSearchView(APIView):
    """GET ?q= — search services and latest packages by name/code."""

    def get(self, request, *args, **kwargs):
        qser = UnifiedSearchQuerySerializer(data=request.query_params)
        qser.is_valid(raise_exception=True)
        q = (qser.validated_data.get("q") or "").strip()
        services = DiagnosticServiceMaster.objects.filter(
            is_active=True, deleted_at__isnull=True
        ).filter(Q(name__icontains=q) | Q(code__icontains=q))[:25]
        packages = DiagnosticPackage.objects.filter(
            is_active=True, is_latest=True, deleted_at__isnull=True
        ).filter(Q(name__icontains=q) | Q(lineage_code__icontains=q))[:25]
        return Response(
            {
                "services": DiagnosticServiceMasterSerializer(services, many=True).data,
                "packages": DiagnosticPackageSerializer(packages, many=True).data,
            }
        )
