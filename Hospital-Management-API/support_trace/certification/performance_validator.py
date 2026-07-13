"""Performance certification validator — soft SLA asserts."""

from __future__ import annotations

import time

from support_trace.incident import IncidentReconstructionService
from support_trace.incident.constants import PERFORMANCE_TARGETS_MS
from support_trace.lookup import TraceLookupService
from support_trace.runtime.constants import PERFORMANCE_TARGET_RUNTIME_LINK_MS
from support_trace.runtime.runtime_service import RuntimeIntegrationService


class PerformanceValidator:
    @classmethod
    def validate(
        cls,
        *,
        workflow_id: str | None = None,
        booking_id: str | None = None,
    ) -> tuple[list[str], float]:
        warnings: list[str] = []
        checks = 0
        passed = 0

        if workflow_id:
            checks += 1
            start = time.perf_counter()
            TraceLookupService.lookup_by_workflow(workflow_id)
            ms = (time.perf_counter() - start) * 1000
            if ms < PERFORMANCE_TARGETS_MS.get("workflow", 350) * 5:
                passed += 1
            else:
                warnings.append(f"workflow lookup slow: {ms:.1f}ms")

        if booking_id:
            checks += 1
            start = time.perf_counter()
            IncidentReconstructionService.reconstruct_booking(booking_id)
            ms = (time.perf_counter() - start) * 1000
            if ms < PERFORMANCE_TARGETS_MS.get("booking", 300) * 5:
                passed += 1
            else:
                warnings.append(f"incident reconstruction slow: {ms:.1f}ms")

        checks += 1
        start = time.perf_counter()
        RuntimeIntegrationService.capture_runtime()
        ms = (time.perf_counter() - start) * 1000
        if ms < PERFORMANCE_TARGET_RUNTIME_LINK_MS * 5:
            passed += 1
        else:
            warnings.append(f"runtime capture slow: {ms:.1f}ms")

        score = passed / checks if checks else 0.0
        return warnings, score
