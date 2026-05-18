"""Centralized visit workflow API response orchestration."""

from __future__ import annotations

from collections.abc import Callable

from rest_framework import status
from rest_framework.response import Response

from labs.api.serializers.visit_appointments import (
    VisitWorkflowResponseSerializer,
    visit_workflow_response_to_representation,
)
from labs.models import LabVisitAppointment
from labs.services.visit_workflow import (
    VisitNotFoundError,
    VisitWorkflowError,
    workflow_response_fields,
)

VISIT_NOT_FOUND_DETAIL = "Visit appointment not found."


def visit_workflow_success_response(visit: LabVisitAppointment, *, message: str) -> Response:
    payload = visit_workflow_response_to_representation(
        workflow_response_fields(visit, message=message),
    )
    return Response(
        VisitWorkflowResponseSerializer(payload).data,
        status=status.HTTP_200_OK,
    )


def visit_workflow_conflict_response(exc: VisitWorkflowError) -> Response:
    return Response({"detail": exc.message}, status=status.HTTP_409_CONFLICT)


def visit_workflow_not_found_response() -> Response:
    return Response({"detail": VISIT_NOT_FOUND_DETAIL}, status=status.HTTP_404_NOT_FOUND)


def run_visit_workflow_action(
    *,
    action: Callable[[], LabVisitAppointment],
    message: str,
) -> Response:
    try:
        visit = action()
    except VisitNotFoundError:
        return visit_workflow_not_found_response()
    except VisitWorkflowError as exc:
        return visit_workflow_conflict_response(exc)
    return visit_workflow_success_response(visit, message=message)
