from rest_framework.response import Response


def is_swagger_schema_generation(view):
    """True when drf-yasg is introspecting a view to build the OpenAPI schema."""
    return getattr(view, "swagger_fake_view", False)


def api_response(status, message, data=None, http_status=200):
    return Response({
        "status": status,
        "message": message,
        "data": data
    }, status=http_status)