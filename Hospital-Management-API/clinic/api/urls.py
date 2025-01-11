from django.urls import path
from clinic.api.views import ClinicCreateView, ClinicListView, ClinicDetailView, ClinicUpdateView, ClinicDeleteView

urlpatterns = [
    path('clinics/', ClinicListView.as_view(), name='clinic-list'),
    path('clinic/create/', ClinicCreateView.as_view(), name='clinic-create'),
    path('clinic/<uuid:pk>/', ClinicDetailView.as_view(), name='clinic-detail'),
    path('clinic/<uuid:pk>/update/', ClinicUpdateView.as_view(), name='clinic-update'),
    path('clinic/<uuid:pk>/delete/', ClinicDeleteView.as_view(), name='clinic-delete'),
]