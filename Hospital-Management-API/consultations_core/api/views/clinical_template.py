from django.db import IntegrityError, transaction
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.api.serializers.clinical_template import ClinicalTemplateSerializer
from consultations_core.models.clinical_templates import ClinicalTemplate


class ClinicalTemplateViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = ClinicalTemplateSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    pagination_class = None

    def get_queryset(self):
        qs = ClinicalTemplate.objects.filter(
            doctor=self.request.user.doctor,
            is_active=True,
        ).order_by("-created_at")
        consultation_type = self.request.query_params.get("type")
        if consultation_type:
            qs = qs.filter(consultation_type=consultation_type)
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user.doctor)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except IntegrityError:
            raise ValidationError(
                {
                    "name": [
                        "A clinical template with this name already exists for this doctor."
                    ]
                }
            )
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
