"""Profile doctor_report_workspace repository query counts and EXPLAIN plans.

Usage:
  python manage.py profile_workspace_performance --seed 200
"""

from __future__ import annotations

import time

from django.core.management.base import BaseCommand
from django.db import connection, reset_queries
from django.test.utils import override_settings

from diagnostics_engine.domain.reports.active_report import active_reports_queryset

from doctor_report_workspace.repositories.criteria import (
    WorkspaceListCriteria,
    WorkspaceScope,
)
from doctor_report_workspace.repositories.workspace_report_repository import (
    WorkspaceReportRepository,
    _doctor_clinic_report_scope,
    _has_uploaded_artifact_exists,
)
from doctor_report_workspace.search.criteria import WorkspaceSearchCriteria
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
    mark_line_pending_upload,
)


class Command(BaseCommand):
    help = "Seed + profile workspace repository SQL counts and EXPLAIN plans."

    def add_arguments(self, parser):
        parser.add_argument(
            "--seed",
            type=int,
            default=100,
            help="Number of ready reports to seed for this doctor/clinic (0 = skip).",
        )
        parser.add_argument(
            "--awaiting",
            type=int,
            default=20,
            help="Number of awaiting lines to seed.",
        )

    def handle(self, *args, **options):
        seed_n = int(options["seed"])
        awaiting_n = int(options["awaiting"])

        with override_settings(DEBUG=True):
            _user, doctor, clinic = make_doctor_with_clinic()
            scope = WorkspaceScope(doctor_id=doctor.id, clinic_id=clinic.id)
            repo = WorkspaceReportRepository()
            sample_report = None
            sample_report_number = None

            if seed_n > 0:
                self.stdout.write(f"Seeding {seed_n} ready reports…")
                for i in range(seed_n):
                    line, *_ = create_order_line(
                        doctor=doctor,
                        clinic=clinic,
                        service_name=f"Perf Panel {i % 17}",
                        patient_first=f"Perf{i}",
                        patient_last="Patient",
                    )
                    report = create_ready_report(line=line)
                    if sample_report is None:
                        sample_report = report
                        sample_report_number = report.report_number
                for i in range(awaiting_n):
                    line, *_ = create_order_line(
                        doctor=doctor,
                        clinic=clinic,
                        service_name=f"Await {i}",
                        patient_first=f"Await{i}",
                        patient_last="Patient",
                    )
                    mark_line_pending_upload(line=line, minutes_ago=90)
                self.stdout.write(self.style.SUCCESS("Seed complete."))

            if sample_report is None:
                line, *_ = create_order_line(doctor=doctor, clinic=clinic)
                sample_report = create_ready_report(line=line)
                sample_report_number = sample_report.report_number

            criteria = WorkspaceListCriteria()
            results = {}

            def measure(label, fn):
                reset_queries()
                started = time.perf_counter()
                fn()
                elapsed_ms = int((time.perf_counter() - started) * 1000)
                queries = list(connection.queries)
                results[label] = {
                    "count": len(queries),
                    "ms": elapsed_ms,
                    "sql": [q["sql"][:240] for q in queries],
                }
                self.stdout.write(
                    f"{label}: queries={len(queries)} duration_ms={elapsed_ms}"
                )

            measure(
                "list",
                lambda: repo.find_reports(scope, criteria, page_size=25),
            )
            measure(
                "search_report_number",
                lambda: repo.search_reports(
                    scope,
                    WorkspaceSearchCriteria(q=(sample_report_number or "R-")[:4]),
                ),
            )
            measure(
                "awaiting",
                lambda: repo.find_pending_uploads(scope, criteria, page_size=25),
            )
            measure(
                "count_reports",
                lambda: repo.count_reports(scope, criteria),
            )
            measure(
                "count_pending",
                lambda: repo.count_pending_uploads(scope, criteria),
            )
            measure(
                "detail",
                lambda: repo.get_report_detail(scope, sample_report.id),
            )
            measure(
                "preview",
                lambda: repo.get_preview_artifact(scope, sample_report.id),
            )
            measure(
                "download",
                lambda: repo.get_download_artifact(scope, sample_report.id),
            )

            self.stdout.write("")
            self.stdout.write("=== EXPLAIN (ANALYZE, BUFFERS) samples ===")
            self._explain_reports_list(scope, criteria)
            self._explain_report_number_search(scope, sample_report_number)
            self._explain_awaiting(scope, criteria)
            self._explain_detail(scope, sample_report.id)

            self.stdout.write("")
            self.stdout.write("=== Summary (copy into PERFORMANCE.md) ===")
            for label, data in results.items():
                self.stdout.write(f"- {label}: {data['count']} queries, {data['ms']} ms")

    def _explain(self, sql: str, params=None):
        with connection.cursor() as cursor:
            cursor.execute(f"EXPLAIN (ANALYZE, BUFFERS) {sql}", params or [])
            plan = "\n".join(row[0] for row in cursor.fetchall())
        self.stdout.write(plan)
        self.stdout.write("")
        return plan

    def _explain_reports_list(self, scope, criteria):
        repo = WorkspaceReportRepository()
        qs = repo._apply_report_ordering(
            repo._reports_queryset(scope, criteria),
            criteria.ordering or "-uploaded_at",
        )[:26]
        sql, params = qs.query.sql_with_params()
        self.stdout.write("--- list ---")
        self._explain(sql, params)

    def _explain_report_number_search(self, scope, report_number):
        repo = WorkspaceReportRepository()
        prefix = (report_number or "R-")[:4]
        criteria = WorkspaceListCriteria(q=prefix)
        qs = repo._reports_queryset(scope, criteria)[:26]
        sql, params = qs.query.sql_with_params()
        self.stdout.write("--- search report_number prefix ---")
        self._explain(sql, params)

    def _explain_awaiting(self, scope, criteria):
        repo = WorkspaceReportRepository()
        qs = repo._apply_awaiting_ordering(
            repo._pending_uploads_queryset(scope, criteria),
            criteria.ordering or "-uploaded_at",
        )[:26]
        sql, params = qs.query.sql_with_params()
        self.stdout.write("--- awaiting ---")
        self._explain(sql, params)

    def _explain_detail(self, scope, report_id):
        qs = (
            active_reports_queryset()
            .filter(
                _doctor_clinic_report_scope(
                    doctor_id=scope.doctor_id, clinic_id=scope.clinic_id
                )
            )
            .filter(pk=report_id)
            .annotate(_has_artifact=_has_uploaded_artifact_exists())
            .select_related(*WorkspaceReportRepository.DETAIL_SELECT_RELATED)
        )
        sql, params = qs.query.sql_with_params()
        self.stdout.write("--- detail (report query only) ---")
        self._explain(sql, params)
