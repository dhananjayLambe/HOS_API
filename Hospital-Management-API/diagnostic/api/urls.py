from django.urls import path
from rest_framework.routers import DefaultRouter
from diagnostic.api.views import (
    MedicalTestViewSet,
    TestCategoryViewSet,
    ImagingViewViewSet,
    TestRecommendationViewSet,
    PackageRecommendationViewSet,
    TestPackageListCreateView,
    TestPackageDetailView,
    BulkTestPackageCreateView,LabAdminRegisterView,DiagnosticLabViewSet,
    DiagnosticLabAddressViewSet,LabAdminLoginView,LabAdminTokenRefreshView,
    LabAdminTokenVerifyView,ImagingViewSet,TestPackageViewSet,
)
urlpatterns =[]
router = DefaultRouter()
router.register(r'labs', DiagnosticLabViewSet, basename='lab')
router.register(r'lab-addresses', DiagnosticLabAddressViewSet, basename='lab-address')
router.register(r'test-categories', TestCategoryViewSet, basename='test-category')
router.register(r'imaging-views', ImagingViewSet, basename='imaging-view')
router.register(r'medical-tests', MedicalTestViewSet, basename='medical-test')
router.register(r'test-packages', TestPackageViewSet, basename='test-package')

test_recommendation_list = TestRecommendationViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

test_recommendation_detail = TestRecommendationViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})
package_recommendation_list = PackageRecommendationViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

package_recommendation_detail = PackageRecommendationViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})

urlpatterns += router.urls

urlpatterns += [
    path(
        'test-recommendation/<uuid:consultation_id>/tests/',
        test_recommendation_list,
        name='test-recommendation-list'
    ),
    path(
        'test-recommendation/<uuid:consultation_id>/tests/<uuid:pk>/',
        test_recommendation_detail,
        name='test-recommendation-detail'
    ),
    path('package-recommendation/<uuid:consultation_id>/test-packages/', 
         package_recommendation_list, name='package-recommendation-list'),
    path('package-recommendation/<uuid:consultation_id>/test-packages/<uuid:pk>/',
        package_recommendation_detail, name='package-recommendation-detail'),

    # Lab Admin Registration
    path("lab-admin/register/", LabAdminRegisterView.as_view(), name="lab-register"),
    path("lab-admin/login/", LabAdminLoginView.as_view(), name="lab-admin-login"),
    path("lab-admin/token/refresh/", LabAdminTokenRefreshView.as_view(), name="lab-admin-token-refresh"),
    path("lab-admin/token/verify/", LabAdminTokenVerifyView.as_view(), name="lab-admin-token-verify"),

]
