
from django.urls import path, include
from rest_framework.routers import DefaultRouter # URL Routing
from patient_account.api.views import (
    PatientRegistrationViewSet,
    PatientLoginViewSet)

#app_name = 'patient_account'

router = DefaultRouter()
router.register(r'registration', PatientRegistrationViewSet, basename='patients')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', PatientLoginViewSet.as_view({'post': 'login'}), name='patient_login'),

]