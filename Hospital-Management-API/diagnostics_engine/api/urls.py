from django.urls import include, path
from rest_framework.routers import DefaultRouter

from diagnostics_engine.api.views.catalog import (
    DiagnosticPackageViewSet,
    DiagnosticServiceMasterViewSet,
    PackageQuoteView,
    ProvidersForPackageView,
    UnifiedCatalogSearchView,
)

router = DefaultRouter()
router.register(r"catalog/services", DiagnosticServiceMasterViewSet, basename="diagnostic-services")
router.register(r"catalog/packages", DiagnosticPackageViewSet, basename="diagnostic-packages")

urlpatterns = [
    path("", include(router.urls)),
    path("catalog/quote/package/", PackageQuoteView.as_view(), name="diagnostic-package-quote"),
    path(
        "catalog/packages/<uuid:package_id>/providers/",
        ProvidersForPackageView.as_view(),
        name="diagnostic-package-providers",
    ),
    path("catalog/search/", UnifiedCatalogSearchView.as_view(), name="diagnostic-catalog-search"),
]
