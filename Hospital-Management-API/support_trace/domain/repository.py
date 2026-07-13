"""Mutable persistence for Support Trace projection records."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from django.db import transaction
from django.db.models import F

from support_trace.domain.lookup_keys import IDENTIFIER_FIELDS
from support_trace.exceptions import SupportTraceConcurrencyError, TraceRepositoryError
from support_trace.models import SupportTrace


class SupportTraceRepository:
    """Database access for mutable support trace projections."""

    def create(self, fields: dict[str, Any]) -> SupportTrace:
        try:
            return SupportTrace.objects.create(**fields)
        except Exception as exc:
            raise TraceRepositoryError(str(exc)) from exc

    def update(self, trace: SupportTrace, fields: dict[str, Any]) -> SupportTrace:
        for key, value in fields.items():
            setattr(trace, key, value)
        try:
            trace.save()
            return trace
        except Exception as exc:
            raise TraceRepositoryError(str(exc)) from exc

    @transaction.atomic
    def upsert(
        self,
        fields: dict[str, Any],
        *,
        expected_trace_version: int | None = None,
    ) -> tuple[SupportTrace, bool]:
        """Create or update by workflow_instance_id with row locking."""
        workflow_id = fields["workflow_instance_id"]
        existing = (
            SupportTrace.objects.select_for_update(skip_locked=False)
            .filter(workflow_instance_id=workflow_id)
            .first()
        )
        if existing is None:
            create_fields = dict(fields)
            create_fields.setdefault("trace_version", 1)
            trace = self.create(create_fields)
            return trace, True

        version = expected_trace_version or existing.trace_version
        update_fields = dict(fields)
        update_fields.pop("workflow_instance_id", None)
        update_fields["trace_version"] = F("trace_version") + 1

        updated_count = SupportTrace.objects.filter(
            pk=existing.pk,
            trace_version=version,
        ).update(**update_fields)

        if updated_count == 0:
            raise SupportTraceConcurrencyError(
                f"Concurrent update conflict for workflow {workflow_id} "
                f"(expected trace_version={version})."
            )

        existing.refresh_from_db()
        return existing, False

    def get_by_workflow(self, workflow_instance_id: str) -> SupportTrace | None:
        return SupportTrace.objects.filter(
            workflow_instance_id=str(workflow_instance_id)
        ).first()

    def get_by_correlation(self, correlation_id: str) -> list[SupportTrace]:
        return list(
            SupportTrace.objects.filter(correlation_id=str(correlation_id)).order_by(
                "-updated_at"
            )
        )

    def find_by_identifier(self, field: str, value: str) -> SupportTrace | None:
        if field not in IDENTIFIER_FIELDS:
            raise TraceRepositoryError(f"Unknown identifier field: {field}")
        return SupportTrace.objects.filter(**{field: str(value)}).order_by(
            "-updated_at"
        ).first()

    def find_all_by_identifier(self, field: str, value: str) -> list[SupportTrace]:
        if field not in IDENTIFIER_FIELDS:
            raise TraceRepositoryError(f"Unknown identifier field: {field}")
        return list(
            SupportTrace.objects.filter(**{field: str(value)}).order_by("-updated_at")
        )

    def exists(self, workflow_instance_id: str) -> bool:
        return SupportTrace.objects.filter(
            workflow_instance_id=str(workflow_instance_id)
        ).exists()

    def get_by_id(self, trace_id: UUID | str) -> SupportTrace | None:
        try:
            return SupportTrace.objects.get(pk=trace_id)
        except SupportTrace.DoesNotExist:
            return None

    def update_state(self, trace: SupportTrace, **fields: Any) -> SupportTrace:
        payload = dict(fields)
        payload["workflow_instance_id"] = trace.workflow_instance_id
        updated, _ = self.upsert(payload, expected_trace_version=trace.trace_version)
        return updated

    def mark_completed(
        self,
        trace: SupportTrace,
        *,
        completed_at: Any,
        duration_ms: int | None,
    ) -> SupportTrace:
        return self.update_state(
            trace,
            status="Completed",
            completed_at=completed_at,
            duration_ms=duration_ms,
        )

    def mark_failed(self, trace: SupportTrace, **fields: Any) -> SupportTrace:
        payload = {"status": "Failed", **fields}
        return self.update_state(trace, **payload)

    def increment_retry(self, trace: SupportTrace) -> SupportTrace:
        return self.update_state(trace, retry_count=trace.retry_count + 1)

    def update_current_step(self, trace: SupportTrace, step: str) -> SupportTrace:
        return self.update_state(trace, workflow_step=step)

    def update_last_event(self, trace: SupportTrace, event: str) -> SupportTrace:
        return self.update_state(trace, last_event=event)

    @transaction.atomic
    def bulk_upsert(self, updates: list[dict[str, Any]]) -> list[SupportTrace]:
        """Batch upsert for M5.3 projection rebuild. Stub-ready in M5.2."""
        results: list[SupportTrace] = []
        for fields in updates:
            trace, _ = self.upsert(fields)
            results.append(trace)
        return results

    def update_runtime(self, trace: SupportTrace, metadata: dict[str, Any]) -> SupportTrace:
        merged = {**(trace.runtime_metadata or {}), **metadata}
        return self.update(trace, {"runtime_metadata": merged})

    def get_by_request_id(self, request_id: str) -> list[SupportTrace]:
        if not request_id:
            return []
        qs = SupportTrace.objects.filter(request_id=request_id)
        meta_qs = SupportTrace.objects.filter(runtime_metadata__request_id=request_id)
        ids = set(qs.values_list("id", flat=True)) | set(meta_qs.values_list("id", flat=True))
        return list(SupportTrace.objects.filter(id__in=ids).order_by("-updated_at"))

    def get_by_celery_task(self, task_id: str) -> list[SupportTrace]:
        return list(
            SupportTrace.objects.filter(runtime_metadata__celery_task_id=task_id).order_by(
                "-updated_at"
            )
        )

    def get_by_lambda_request(self, lambda_request_id: str) -> list[SupportTrace]:
        return list(
            SupportTrace.objects.filter(
                runtime_metadata__lambda_request_id=lambda_request_id
            ).order_by("-updated_at")
        )

    def get_by_deployment(self, version: str) -> list[SupportTrace]:
        return list(
            SupportTrace.objects.filter(
                runtime_metadata__deployment_version=version
            ).order_by("-updated_at")
        )

    def get_by_environment(self, env: str) -> list[SupportTrace]:
        return list(
            SupportTrace.objects.filter(runtime_metadata__environment=env).order_by(
                "-updated_at"
            )
        )
