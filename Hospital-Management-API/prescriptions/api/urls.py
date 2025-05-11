from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PrescriptionViewSet

router = DefaultRouter()

prescription_list = PrescriptionViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

prescription_detail = PrescriptionViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})

urlpatterns = [
    path('add/<uuid:consultation_id>/', prescription_list, name='prescription-list'),
    path('details/<uuid:consultation_id>/<uuid:pk>/', prescription_detail, name='prescription-detail')
]