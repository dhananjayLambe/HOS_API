"""
Lab order assignment workflow — accept / reject.

POST /api/labs/orders/<assignment_id>/accept/
POST /api/labs/orders/<assignment_id>/reject/
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from labs.api.permissions import IsLabAdminUser
from labs.api.serializers.lab_order_workflow import LabOrderRejectRequestSerializer
from labs.api.services.lab_session_resolver import LabSessionDenied, resolve_lab_user
from labs.choices.workflow import LabAssignmentStatus
from labs.services.workflow_transitions import (
    AssignmentNotFoundError,
    RejectReasonRequiredError,
    WorkflowTransitionError,
    accept_assignment,
    get_assignment_for_lab_user,
    reject_assignment,
)


def _workflow_success_response(
    assignment,
    *,
    message: str,
) -> dict:
    payload = {
        "success": True,
        "status": assignment.status,
        "message": message,
        "assignment_id": str(assignment.id),
    }
    if assignment.status == LabAssignmentStatus.ACCEPTED and assignment.accepted_at:
        payload["accepted_at"] = assignment.accepted_at.isoformat()
    if assignment.status == LabAssignmentStatus.REJECTED:
        if assignment.rejected_at:
            payload["rejected_at"] = assignment.rejected_at.isoformat()
        payload["rejection_reason"] = assignment.rejection_reason or ""
    return payload


class LabOrderAcceptView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, assignment_id):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        try:
            get_assignment_for_lab_user(assignment_id, resolved.lab_user)
        except AssignmentNotFoundError:
            return Response({"detail": "Assignment not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            assignment = accept_assignment(assignment_id, resolved.lab_user)
        except AssignmentNotFoundError:
            return Response({"detail": "Assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        except WorkflowTransitionError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_409_CONFLICT)

        return Response(
            _workflow_success_response(
                assignment,
                message="Order accepted successfully",
            ),
            status=status.HTTP_200_OK,
        )


class LabOrderRejectView(APIView):
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, assignment_id):
        resolved = resolve_lab_user(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response

        serializer = LabOrderRejectRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        reason = serializer.validated_data["reason"]

        try:
            get_assignment_for_lab_user(assignment_id, resolved.lab_user)
        except AssignmentNotFoundError:
            return Response({"detail": "Assignment not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            assignment = reject_assignment(assignment_id, resolved.lab_user, reason)
        except RejectReasonRequiredError:
            return Response(
                {"reason": ["This field may not be blank."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except AssignmentNotFoundError:
            return Response({"detail": "Assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        except WorkflowTransitionError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_409_CONFLICT)

        return Response(
            _workflow_success_response(
                assignment,
                message="Order rejected successfully",
            ),
            status=status.HTTP_200_OK,
        )
