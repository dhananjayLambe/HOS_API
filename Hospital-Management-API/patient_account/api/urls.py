
from django.urls import path, include
from rest_framework.routers import DefaultRouter # URL Routing
from patient_account.api.views import PatientRegistrationViewSet

#app_name = 'patient_account'

router = DefaultRouter()
router.register(r'registration', PatientRegistrationViewSet, basename='patients')

urlpatterns = [
    path('', include(router.urls)),
]