"""Serializers for diagnostic catalog (categories, services, packages)."""

from rest_framework import serializers

from diagnostics_engine.models import (
    DiagnosticCategory,
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticServiceMaster,
)


class DiagnosticCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticCategory
        fields = ["id", "name", "code", "parent", "ordering", "is_active"]


class DiagnosticServiceMasterSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = DiagnosticServiceMaster
        fields = [
            "id",
            "code",
            "name",
            "category",
            "category_name",
            "sample_type",
            "home_collection_possible",
            "appointment_required",
            "tat_hours_default",
            "preparation_notes",
            "is_active",
        ]


class DiagnosticPackageItemSerializer(serializers.ModelSerializer):
    service = DiagnosticServiceMasterSerializer(read_only=True)
    service_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = DiagnosticPackageItem
        fields = [
            "id",
            "service",
            "service_id",
            "quantity",
            "is_mandatory",
            "display_order",
        ]


class DiagnosticPackageSerializer(serializers.ModelSerializer):
    items = DiagnosticPackageItemSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = DiagnosticPackage
        fields = [
            "id",
            "lineage_code",
            "version",
            "is_latest",
            "category",
            "category_name",
            "name",
            "description",
            "is_active",
            "is_featured",
            "is_promoted",
            "priority_score",
            "package_type",
            "collection_type",
            "min_tat_hours",
            "max_tat_hours",
            "fasting_required",
            "gender_applicability",
            "age_min",
            "age_max",
            "tags",
            "conditions_supported",
            "items",
        ]


class PackageQuoteRequestSerializer(serializers.Serializer):
    branch_id = serializers.UUIDField()
    package_id = serializers.UUIDField()


class PackageQuoteResponseSerializer(serializers.Serializer):
    selling_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    mrp = serializers.DecimalField(max_digits=12, decimal_places=2)
    is_price_derived = serializers.BooleanField()
    branch_package_pricing_id = serializers.UUIDField(allow_null=True)


class ProvidersForPackageQuerySerializer(serializers.Serializer):
    pincode = serializers.CharField(max_length=10, required=False, allow_blank=True)


class UnifiedSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True, default="")
