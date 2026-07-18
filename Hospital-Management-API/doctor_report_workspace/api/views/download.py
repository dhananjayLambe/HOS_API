"""Report / artifact download views.

Milestone 0 placeholder. Controllers must call WorkspaceService only.
"""

from rest_framework.views import APIView


class ReportDownloadView(APIView):
    """GET /{id}/download/ — secure download redirect or signed URL."""

    def get(self, request, *args, **kwargs):
        raise NotImplementedError("Milestone 0 scaffold — not implemented yet.")


class BulkDownloadView(APIView):
    """POST /bulk-download/ — reserved for future bulk download."""

    def post(self, request, *args, **kwargs):
        raise NotImplementedError("Milestone 0 scaffold — not implemented yet.")
