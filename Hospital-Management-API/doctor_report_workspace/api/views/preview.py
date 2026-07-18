"""Report preview view.

Milestone 0 placeholder. Controllers must call WorkspaceService only.
"""

from rest_framework.views import APIView


class ReportPreviewView(APIView):
    """GET /{id}/preview/ — preview payload / signed preview URL."""

    def get(self, request, *args, **kwargs):
        raise NotImplementedError("Milestone 0 scaffold — not implemented yet.")
