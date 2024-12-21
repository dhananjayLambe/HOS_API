from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HospitalViewSet, FrontDeskUserViewSet

router = DefaultRouter()
router.register(r'hospitals', HospitalViewSet, basename='hospital')
router.register(r'frontdesk-users', FrontDeskUserViewSet, basename='frontdeskuser')

urlpatterns = [
    path('', include(router.urls)),
]
