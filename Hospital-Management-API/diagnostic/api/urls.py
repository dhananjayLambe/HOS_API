from django.urls import path
from rest_framework.routers import DefaultRouter
from diagnostic.api.views import (
    MedicalTestViewSet,
    TestCategoryViewSet,
    ImagingViewViewSet,
    TestRecommendationViewSet,
    PackageRecommendationViewSet
)
urlpatterns =[]
router = DefaultRouter()

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

]
