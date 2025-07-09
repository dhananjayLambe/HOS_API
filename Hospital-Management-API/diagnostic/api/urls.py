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
)
urlpatterns =[]
router = DefaultRouter()
router.register(r'labs', DiagnosticLabViewSet, basename='lab')
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

router.register(r'medical-tests', MedicalTestViewSet, basename='medical-test')
router.register(r'test-categories', TestCategoryViewSet, basename='test-category')
router.register(r'imaging-views', ImagingViewViewSet, basename='imaging-view')
urlpatterns += router.urls

urlpatterns += [
    path('test-packages/', TestPackageListCreateView.as_view(), name='test-package-list-create'),
    path('test-packages/bulk-create/', BulkTestPackageCreateView.as_view(), name='bulk-create-test-packages'),
    path('test-packages/<uuid:pk>/', TestPackageDetailView.as_view(), name='test-package-detail'),

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

]
