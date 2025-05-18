from rest_framework.response import Response

def api_response(status, message, data=None, http_status=200):
    return Response({
        "status": status,
        "message": message,
        "data": data
    }, status=http_status)