from django.urls import path

from consultation_config.api.views import ConsultationRenderSchemaAPIView


urlpatterns = [
    path(
        "render-schema/",
        ConsultationRenderSchemaAPIView.as_view(),
        name="consultation-render-schema",
    ),
]

