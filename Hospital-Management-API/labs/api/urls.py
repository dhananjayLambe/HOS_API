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
from labs.api.views.visit_appointments import (
    VisitAppointmentCheckInView,
    VisitAppointmentCompleteView,
    VisitAppointmentConfirmView,
    VisitAppointmentNoShowView,
    VisitAppointmentRescheduleView,
    VisitAppointmentsListView,
    VisitAppointmentsSummaryView,
)

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
    path(
        "visit-appointments/summary/",
        VisitAppointmentsSummaryView.as_view(),
        name="lab-visit-appointments-summary",
    ),
    path(
        "visit-appointments/",
        VisitAppointmentsListView.as_view(),
        name="lab-visit-appointments-list",
    ),
    path(
        "visit-appointments/<uuid:visit_id>/confirm/",
        VisitAppointmentConfirmView.as_view(),
        name="lab-visit-appointment-confirm",
    ),
    path(
        "visit-appointments/<uuid:visit_id>/check-in/",
        VisitAppointmentCheckInView.as_view(),
        name="lab-visit-appointment-check-in",
    ),
    path(
        "visit-appointments/<uuid:visit_id>/complete/",
        VisitAppointmentCompleteView.as_view(),
        name="lab-visit-appointment-complete",
    ),
    path(
        "visit-appointments/<uuid:visit_id>/no-show/",
        VisitAppointmentNoShowView.as_view(),
        name="lab-visit-appointment-no-show",
    ),
    path(
        "visit-appointments/<uuid:visit_id>/reschedule/",
        VisitAppointmentRescheduleView.as_view(),
        name="lab-visit-appointment-reschedule",
    ),
]
