"""Cursor pagination for appointment lists (stable ordering for concurrent writes)."""

from rest_framework.pagination import CursorPagination


class AppointmentCursorPagination(CursorPagination):
    page_size = 20
    ordering = ("-appointment_date", "-slot_start_time", "-id")
    page_size_query_param = "page_size"
    max_page_size = 50
