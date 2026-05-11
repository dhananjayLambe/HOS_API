from django.urls import include, path
from rest_framework.routers import DefaultRouter

from diagnostics_engine.api.views.catalog import (
    DiagnosticPackageViewSet,
    DiagnosticServiceMasterViewSet,
    PackageQuoteView,
    ProvidersForPackageView,
    UnifiedCatalogSearchView,
)
from diagnostics_engine.api.views.search import InvestigationSearchView
from diagnostics_engine.api.views.suggestions import InvestigationSuggestionsAPIView
from diagnostics_engine.api.views.order_creation import CreateDiagnosticOrderFromConsultationView

router = DefaultRouter()
router.register(r"catalog/services", DiagnosticServiceMasterViewSet, basename="diagnostic-services")
router.register(r"catalog/packages", DiagnosticPackageViewSet, basename="diagnostic-packages")

urlpatterns = [
    path(
        "orders/create-from-consultation/",
        CreateDiagnosticOrderFromConsultationView.as_view(),
        name="diagnostic-order-create-from-consultation",
    ),
    path("search/", InvestigationSearchView.as_view(), name="diagnostic-investigation-search"),
    path("", include(router.urls)),
    path(
        "investigations/suggestions/",
        InvestigationSuggestionsAPIView.as_view(),
        name="diagnostic-investigation-suggestions",
    ),
    path("catalog/quote/package/", PackageQuoteView.as_view(), name="diagnostic-package-quote"),
    path(
        "catalog/packages/<uuid:package_id>/providers/",
        ProvidersForPackageView.as_view(),
        name="diagnostic-package-providers",
    ),
    path("catalog/search/", UnifiedCatalogSearchView.as_view(), name="diagnostic-catalog-search"),
]
