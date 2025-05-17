from django.urls import path
from rest_framework.routers import DefaultRouter
from diagnostic.api.views import (
    MedicalTestViewSet,
    TestCategoryViewSet,
    ImagingViewViewSet,
    TestRecommendationViewSet
)
urlpatterns =[]
router = DefaultRouter()
router.register(r'medical-tests', MedicalTestViewSet, basename='medical-test')
router.register(r'test-categories', TestCategoryViewSet, basename='test-category')
router.register(r'imaging-views', ImagingViewViewSet, basename='imaging-view')
urlpatterns += router.urls

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
]
