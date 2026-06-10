from django.db import IntegrityError, transaction
from django.db.models import F
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.api.serializers.template_management import (
    CATEGORY_TO_CONSULTATION_TYPE,
    TemplateDetailSerializer,
    TemplateListSerializer,
)
from consultations_core.models.clinical_templates import ClinicalTemplate

ALLOWED_ORDERING = {
    "updated_at",
    "-updated_at",
    "usage_count",
    "-usage_count",
    "name",
    "-name",
}


class TemplateManagementPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


class TemplateManagementViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Doctor template management API at /api/v1/templates/."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    pagination_class = TemplateManagementPagination
    lookup_field = "pk"

    def get_queryset(self):
        qs = ClinicalTemplate.objects.filter(
            doctor=self.request.user.doctor,
            is_active=True,
        )
        category = (self.request.query_params.get("category") or "").strip()
        if category in CATEGORY_TO_CONSULTATION_TYPE:
            qs = qs.filter(consultation_type=CATEGORY_TO_CONSULTATION_TYPE[category])

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(name__icontains=search)

        ordering = (self.request.query_params.get("ordering") or "-updated_at").strip()
        if ordering not in ALLOWED_ORDERING:
            ordering = "-updated_at"
        return qs.order_by(ordering)

    def get_serializer_class(self):
        if self.action == "list":
            return TemplateListSerializer
        return TemplateDetailSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def get_object(self):
        return super().get_object()

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        allowed = {"name", "template_data"}
        extra = set(request.data.keys()) - allowed
        if extra:
            raise ValidationError(
                {key: ["This field cannot be updated."] for key in sorted(extra)}
            )
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_update(serializer)
        except IntegrityError:
            raise ValidationError(
                {
                    "name": [
                        "A clinical template with this name already exists for this doctor."
                    ]
                }
            )
        return Response(serializer.data)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"], url_path="record-use")
    def record_use(self, request, pk=None):
        """Increment usage_count when doctor applies this template during consultation."""
        template = self.get_object()
        ClinicalTemplate.objects.filter(pk=template.pk).update(
            usage_count=F("usage_count") + 1
        )
        template.refresh_from_db(fields=["usage_count"])
        return Response({"usage_count": template.usage_count}, status=status.HTTP_200_OK)
