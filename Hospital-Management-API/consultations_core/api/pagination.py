"""Pagination for clinical visits list API."""

from labs.api.pagination import LabOrdersPageNumberPagination


class ClinicalVisitsPageNumberPagination(LabOrdersPageNumberPagination):
    page_size = 25
    max_page_size = 100
