from django.urls import include, path
from rest_framework.routers import DefaultRouter

from labs.api.views.lab_onboarding import LabOnboardingView
from labs.api.views.home_collections import (
    HomeCollectionAssignView,
    HomeCollectionCollectView,
    HomeCollectionFailView,
    HomeCollectionRetryView,
    HomeCollectionStartView,
    HomeCollectionsListView,
    HomeCollectionsSummaryView,
    PhlebotomistsListView,
)
from labs.api.views.lab_order_workflow import LabOrderAcceptView, LabOrderRejectView
from labs.api.views.lab_orders import LabOrdersListView
from labs.api.views.lab_session import LabSessionView

router = DefaultRouter()

urlpatterns = [
    path("", include(router.urls)),
    path("investigations/", include("labs.api.investigation_urls")),
    path("onboarding/", LabOnboardingView.as_view(), name="lab-onboarding"),
    path("me/", LabSessionView.as_view(), name="lab-session-me"),
    path("orders/", LabOrdersListView.as_view(), name="lab-orders-list"),
    path(
        "orders/<uuid:assignment_id>/accept/",
        LabOrderAcceptView.as_view(),
        name="lab-order-accept",
    ),
    path(
        "orders/<uuid:assignment_id>/reject/",
        LabOrderRejectView.as_view(),
        name="lab-order-reject",
    ),
    path(
        "home-collections/",
        HomeCollectionsListView.as_view(),
        name="lab-home-collections-list",
    ),
    path(
        "home-collections/summary/",
        HomeCollectionsSummaryView.as_view(),
        name="lab-home-collections-summary",
    ),
    path(
        "phlebotomists/",
        PhlebotomistsListView.as_view(),
        name="lab-phlebotomists-list",
    ),
    path(
        "home-collections/<uuid:collection_id>/assign/",
        HomeCollectionAssignView.as_view(),
        name="lab-home-collection-assign",
    ),
    path(
        "home-collections/<uuid:collection_id>/start/",
        HomeCollectionStartView.as_view(),
        name="lab-home-collection-start",
    ),
    path(
        "home-collections/<uuid:collection_id>/collect/",
        HomeCollectionCollectView.as_view(),
        name="lab-home-collection-collect",
    ),
    path(
        "home-collections/<uuid:collection_id>/fail/",
        HomeCollectionFailView.as_view(),
        name="lab-home-collection-fail",
    ),
    path(
        "home-collections/<uuid:collection_id>/retry/",
        HomeCollectionRetryView.as_view(),
        name="lab-home-collection-retry",
    ),
]
