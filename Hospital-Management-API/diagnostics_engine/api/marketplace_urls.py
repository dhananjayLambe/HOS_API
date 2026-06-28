"""Marketplace Platform API routes (diagnostics domain)."""

from django.urls import path

from diagnostics_engine.api.views.marketplace_recommendation import MarketplaceRecommendationView

urlpatterns = [
    path(
        "recommendations/",
        MarketplaceRecommendationView.as_view(),
        name="v1-marketplace-diagnostics-recommendations",
    ),
]
