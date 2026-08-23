"""Non-sensitive liveness endpoint for container and load-balancer health checks."""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET


@csrf_exempt
@require_GET
def health(_request):
    return JsonResponse({"status": "ok"})
