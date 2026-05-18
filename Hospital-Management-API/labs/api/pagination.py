"""Pagination helpers for lab dashboard list APIs."""

from math import ceil

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from labs.api.services.pricing_catalog_presenter import API_VERSION


class LabOrdersPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_paginated_response(self, data):
        total = self.page.paginator.count
        page_size = self.get_page_size(self.request) or self.page_size
        total_pages = ceil(total / page_size) if total else 0
        return Response(
            {
                "results": data,
                "page": self.page.number,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
            }
        )


class PricingCatalogPageNumberPagination(LabOrdersPageNumberPagination):
    """List responses include contract version for catalog APIs."""

    def get_paginated_response(self, data):
        base = super().get_paginated_response(data)
        payload = base.data
        payload["version"] = API_VERSION
        return Response(payload)
