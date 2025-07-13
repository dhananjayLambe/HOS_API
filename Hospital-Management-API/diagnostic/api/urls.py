from django.urls import path
from rest_framework.routers import DefaultRouter
from diagnostic.api.views import (
    MedicalTestViewSet,
    TestCategoryViewSet,
    TestRecommendationViewSet,
    LabAdminRegisterView,DiagnosticLabViewSet,
    DiagnosticLabAddressViewSet,LabAdminLoginView,LabAdminTokenRefreshView,
    LabAdminTokenVerifyView,ImagingViewSet,TestPackageViewSet,TestLabMappingViewSet,
    PackageLabMappingViewSet,FilterLabsByTestView,PackageRecommendationViewSet,
    AutoBookTestsView,ManualBookTestsView,
)
urlpatterns =[]
router = DefaultRouter()
router.register(r'labs', DiagnosticLabViewSet, basename='lab')
router.register(r'lab-addresses', DiagnosticLabAddressViewSet, basename='lab-address')
router.register(r'test-categories', TestCategoryViewSet, basename='test-category')
router.register(r'imaging-views', ImagingViewSet, basename='imaging-view')
router.register(r'medical-tests', MedicalTestViewSet, basename='medical-test')
router.register(r'test-packages', TestPackageViewSet, basename='test-package')
router.register(r'test-lab-mappings', TestLabMappingViewSet, basename='test-lab-mapping')
router.register(r'package-lab-mappings', PackageLabMappingViewSet, basename='package-lab-mapping')
router.register(r'test-recommendations', TestRecommendationViewSet, basename='test-recommendation')
router.register(r'package-recommendations', PackageRecommendationViewSet, basename='package-recommendation')

urlpatterns += router.urls

urlpatterns += [
    # Lab Admin Registration
    path("lab-admin/register/", LabAdminRegisterView.as_view(), name="lab-register"),
    path("lab-admin/login/", LabAdminLoginView.as_view(), name="lab-admin-login"),
    path("lab-admin/token/refresh/", LabAdminTokenRefreshView.as_view(), name="lab-admin-token-refresh"),
    path("lab-admin/token/verify/", LabAdminTokenVerifyView.as_view(), name="lab-admin-token-verify"),
    
    path('labs-by-test/', FilterLabsByTestView.as_view(), name='labs-by-test'),

    #Booking and Auto Booking
    path('bookings/auto-book/', AutoBookTestsView.as_view(), name='auto-book-tests'),
    path('bookings/auto-book/<uuid:id>/', AutoBookTestsView.as_view(), name='auto-book-tests-detail'),
    path('bookings/manual-book/', ManualBookTestsView.as_view(), name='manual-book-tests'),
]
