"""Pagination for diagnostic report operational list endpoints."""

from rest_framework.pagination import CursorPagination


class _BoundedPageSizeMixin:
    """Clamp invalid page_size query params to safe defaults."""

    def get_page_size(self, request):
        try:
            params = getattr(request, "query_params", request.GET)
            raw = params.get(self.page_size_query_param)
            if raw is None:
                return self.page_size
            size = int(raw)
        except (TypeError, ValueError):
            return self.page_size
        if size < 1:
            return self.page_size
        return min(size, self.max_page_size)


class ReportTaskCursorPagination(_BoundedPageSizeMixin, CursorPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
    ordering = "-assigned_at"


class ReportSummaryCursorPagination(_BoundedPageSizeMixin, CursorPagination):
    """Patient report list — frozen DESC by updated_at for stable infinite scroll."""

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
    ordering = "-updated_at"
