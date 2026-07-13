"""OpenAPI helpers for Support Investigation API."""

from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

support_api_info = openapi.Info(
    title="DoctorProCare Support Investigation API",
    default_version="v1",
    description="Read-only support investigation platform — delegates to TraceLookupService",
)

support_schema_view = get_schema_view(
    support_api_info,
    public=True,
    permission_classes=(permissions.AllowAny,),
    patterns=[],  # populated via urls include if needed
)
