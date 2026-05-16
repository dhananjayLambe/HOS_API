from django.urls import include, path
from rest_framework.routers import DefaultRouter

from labs.api.views.lab_onboarding import LabOnboardingView
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
]
