"""Platform certification orchestrator."""

from __future__ import annotations

import time
from datetime import datetime, timezone

from support_trace.certification.api_validator import ApiValidator
from support_trace.certification.certification_report import SupportTraceCertificationReport
from support_trace.certification.cloudwatch_validator import CloudWatchValidator
from support_trace.certification.hooks import fail_open_certification
from support_trace.certification.identifier_validator import IdentifierValidator
from support_trace.certification.incident_validator import IncidentValidator
from support_trace.certification.integrity_validator import IntegrityValidator
from support_trace.certification.lookup_validator import LookupValidator
from support_trace.certification.performance_validator import PerformanceValidator
from support_trace.certification.runtime_validator import RuntimeValidator
from support_trace.certification.timeline_validator import TimelineValidator
from support_trace.certification.workflow_validator import WorkflowValidator


class CertificationService:
    @classmethod
    def run(
        cls,
        *,
        scope: str = "platform",
        include_performance: bool = True,
        workflow_id: str | None = None,
        booking_id: str | None = None,
        correlation_id: str | None = None,
        api_envelope: dict | None = None,
    ) -> SupportTraceCertificationReport:
        return fail_open_certification(
            "run",
            lambda: cls._run_impl(
                scope=scope,
                include_performance=include_performance,
                workflow_id=workflow_id,
                booking_id=booking_id,
                correlation_id=correlation_id,
                api_envelope=api_envelope,
            ),
            default=cls._empty_report(),
        )

    @classmethod
    def _run_impl(
        cls,
        *,
        scope: str,
        include_performance: bool,
        workflow_id: str | None,
        booking_id: str | None,
        correlation_id: str | None,
        api_envelope: dict | None,
    ) -> SupportTraceCertificationReport:
        started = time.perf_counter()
        all_warnings: list[str] = []

        wf_warnings, workflow_score = WorkflowValidator.validate()
        all_warnings.extend(wf_warnings)

        id_warnings, search_score = IdentifierValidator.validate(
            booking_id=booking_id, correlation_id=correlation_id
        )
        all_warnings.extend(id_warnings)

        tl_warnings, timeline_score = TimelineValidator.validate(workflow_id)
        all_warnings.extend(tl_warnings)

        lookup_warnings, lookup_score = LookupValidator.validate(workflow_id)
        all_warnings.extend(lookup_warnings)

        inc_warnings, incident_score = IncidentValidator.validate(booking_id)
        all_warnings.extend(inc_warnings)

        rt_warnings, runtime_score = RuntimeValidator.validate(workflow_id)
        all_warnings.extend(rt_warnings)

        cw_warnings, cloudwatch_score = CloudWatchValidator.validate()
        all_warnings.extend(cw_warnings)

        api_warnings, api_score = (
            ApiValidator.validate_envelope(api_envelope)
            if api_envelope
            else ([], 1.0)
        )
        all_warnings.extend(api_warnings)

        int_warnings, integrity_score = IntegrityValidator.validate()
        all_warnings.extend(int_warnings)

        perf_warnings, performance_score = (
            PerformanceValidator.validate(workflow_id=workflow_id, booking_id=booking_id)
            if include_performance
            else ([], 1.0)
        )
        all_warnings.extend(perf_warnings)

        scores = [
            workflow_score,
            timeline_score,
            search_score,
            lookup_score,
            incident_score,
            runtime_score,
            cloudwatch_score,
            api_score,
            integrity_score,
            performance_score,
        ]
        overall = sum(scores) / len(scores)
        status = "PASS" if overall >= 0.85 and not any("not found" in w for w in all_warnings) else (
            "WARN" if overall >= 0.6 else "FAIL"
        )

        return SupportTraceCertificationReport(
            overall_score=round(overall, 3),
            workflow_score=round(workflow_score, 3),
            timeline_score=round(timeline_score, 3),
            search_score=round(search_score, 3),
            runtime_score=round(runtime_score, 3),
            cloudwatch_score=round(cloudwatch_score, 3),
            api_score=round(api_score, 3),
            performance_score=round(performance_score, 3),
            certification_status=status,
            warnings=tuple(all_warnings),
            generated_at=datetime.now(timezone.utc),
            duration_ms=(time.perf_counter() - started) * 1000,
        )

    @classmethod
    def _empty_report(cls) -> SupportTraceCertificationReport:
        now = datetime.now(timezone.utc)
        return SupportTraceCertificationReport(
            overall_score=0.0,
            workflow_score=0.0,
            timeline_score=0.0,
            search_score=0.0,
            runtime_score=0.0,
            cloudwatch_score=0.0,
            api_score=0.0,
            performance_score=0.0,
            certification_status="FAIL",
            warnings=("certification run failed",),
            generated_at=now,
            duration_ms=0.0,
        )
