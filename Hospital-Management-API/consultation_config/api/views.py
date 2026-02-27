from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from consultation_config.services.schema_builder import get_render_schema


class ConsultationRenderSchemaAPIView(APIView):
    """
    GET /api/consultation/render-schema/?specialty=physician&section=symptoms
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        specialty = request.query_params.get("specialty")
        section = request.query_params.get("section")

        try:
            schema = get_render_schema(specialty=specialty, section=section)
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except LookupError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except PermissionError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_403_FORBIDDEN,
            )

        # All symptom-level rules like `no_hard_required` and dependencies are
        # passed through in the field definitions/meta; frontend is responsible
        # for respecting them visually without blocking workflow.
        return Response(schema, status=status.HTTP_200_OK)

