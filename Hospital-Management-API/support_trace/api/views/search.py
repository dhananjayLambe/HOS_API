"""Search API views."""

from __future__ import annotations

from support_trace.api.exception_handler import handle_investigation_exception, invalid_identifier, validation_error
from support_trace.api.facade import SupportInvestigationFacade
from support_trace.api.investigation_request import InvestigationRequestParser
from support_trace.api.response_builder import SupportResponseBuilder
from support_trace.api.validators import allows_partial_search
from support_trace.api.views.base import SupportSearchView


class SearchView(SupportSearchView):
    def get(self, request):
        ctx = self.get_context(request)
        req = InvestigationRequestParser.from_get(request)
        if not req.query:
            return validation_error("Query parameter q is required", request=request, ctx=ctx)
        if not req.exact_only and not allows_partial_search(req.query):
            return invalid_identifier("Partial search not allowed for this identifier type", request=request, ctx=ctx)
        try:
            result = SupportInvestigationFacade.search(req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except ValueError as exc:
            return validation_error(str(exc), request=request, ctx=ctx)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)

    def post(self, request):
        ctx = self.get_context(request)
        req = InvestigationRequestParser.from_post_search(request)
        if not req.query:
            return validation_error("Search query or identifiers required in body", request=request, ctx=ctx)
        try:
            result = SupportInvestigationFacade.search(req, ctx)
            return SupportResponseBuilder.lookup_success(result, request=request, ctx=ctx, inv_req=req)
        except ValueError as exc:
            return validation_error(str(exc), request=request, ctx=ctx)
        except Exception as exc:
            return handle_investigation_exception(exc, request=request, ctx=ctx)


class SearchSuggestionsView(SupportSearchView):
    def get(self, request):
        ctx = self.get_context(request)
        return SupportResponseBuilder.not_implemented(
            "Search suggestions not yet implemented",
            request=request,
            ctx=ctx,
        )
