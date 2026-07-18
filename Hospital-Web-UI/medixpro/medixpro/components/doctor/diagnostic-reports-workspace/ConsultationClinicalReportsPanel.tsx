"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { ClinicalModalityChips } from "@/components/doctor/diagnostic-reports-workspace/ClinicalModalityChips";
import { ClinicalReportsEmptyState } from "@/components/doctor/diagnostic-reports-workspace/ClinicalReportsEmptyState";
import {
  ClinicalReportsSummary,
  type ClinicalReportsSummaryModel,
} from "@/components/doctor/diagnostic-reports-workspace/ClinicalReportsSummary";
import { ClinicalReportsTimeline } from "@/components/doctor/diagnostic-reports-workspace/ClinicalReportsTimeline";
import { PatientSearchBar } from "@/components/doctor/diagnostic-reports-workspace/PatientSearchBar";
import { ReportPreviewWorkspace } from "@/components/doctor/diagnostic-reports-workspace/ReportPreviewWorkspace";
import { WorkspaceAdvancedFilters } from "@/components/doctor/diagnostic-reports-workspace/WorkspaceAdvancedFilters";
import {
  createLiveWorkspaceProvider,
  WORKSPACE_MIN_SEARCH_LENGTH,
} from "@/components/doctor/diagnostic-reports-workspace/live-workspace-provider";
import {
  EMPTY_ADVANCED_FILTERS,
  type AdvancedWorkspaceFilters,
  type OperationalQueueCounts,
  type WorkspaceReport,
} from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import {
  matchesClinicalModality,
  type ClinicalModality,
} from "@/lib/doctor/diagnostic-reports-workspace/clinical-modality";
import { countActiveAdvancedFilters } from "@/lib/doctor/diagnostic-reports-workspace/filter-workspace-reports";
import { workspaceUuidOrNull } from "@/lib/doctor/diagnostic-reports-workspace/workspace-ids";
import { PatientLabHistoryService } from "@/components/patients/patient-summary/clinical-lab-history/services/patient-lab-history-service";

const EMPTY_COUNTS: OperationalQueueCounts = {
  reports_ready: 0,
  critical: 0,
  awaiting: 0,
};

type ConsultationClinicalReportsPanelProps = {
  patientId: string;
  /** Display only — list is patient-scoped (all prior reports), not locked to this visit. */
  consultationId?: string | null;
  onOrderTests?: () => void;
};

function pickLatestReady(reports: WorkspaceReport[]): WorkspaceReport | null {
  const ready = reports.filter(
    (r) =>
      r.clinicalStatus === "AVAILABLE" || r.clinicalStatus === "UPDATED"
  );
  const pool = ready.length > 0 ? ready : reports;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => {
    const ta = Date.parse(
      a.reportDate || a.uploadedAt || a.collectionDate || ""
    );
    const tb = Date.parse(
      b.reportDate || b.uploadedAt || b.collectionDate || ""
    );
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  })[0];
}

/**
 * Mid-consultation Clinical Decision Support reports panel.
 * Patient-locked browse / timeline / preview — not an operational queue.
 */
export function ConsultationClinicalReportsPanel({
  patientId,
  onOrderTests,
}: ConsultationClinicalReportsPanelProps) {
  const lockedPatientId = workspaceUuidOrNull(patientId);
  const toast = useToastNotification();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const provider = useMemo(() => createLiveWorkspaceProvider(), []);
  const providerRef = useRef(provider);
  providerRef.current = provider;

  const [searchInput, setSearchInput] = useState("");
  const debouncedQ = useDebouncedValue(searchInput, 300);
  const searchQ =
    debouncedQ.trim().length >= WORKSPACE_MIN_SEARCH_LENGTH
      ? debouncedQ.trim()
      : "";

  const [advanced, setAdvanced] =
    useState<AdvancedWorkspaceFilters>(EMPTY_ADVANCED_FILTERS);
  const advancedKey = JSON.stringify(advanced);
  const [modality, setModality] = useState<ClinicalModality | null>(null);

  const [counts, setCounts] = useState<OperationalQueueCounts>(EMPTY_COUNTS);
  const [reports, setReports] = useState<WorkspaceReport[]>([]);
  const [labLatestDate, setLabLatestDate] = useState<string | null>(null);
  const [labLatestLab, setLabLatestLab] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const [previewReport, setPreviewReport] = useState<WorkspaceReport | null>(
    null
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const summaryRequestIdRef = useRef(0);
  const listRequestIdRef = useRef(0);

  const refresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!lockedPatientId) return;
    const requestId = ++summaryRequestIdRef.current;
    setLoadingSummary(true);
    void (async () => {
      try {
        const [queue, labSummary] = await Promise.all([
          providerRef.current.getQueueCounts({
            patientId: lockedPatientId,
            q: searchQ || undefined,
          }),
          PatientLabHistoryService.getSummary(lockedPatientId).catch(() => null),
        ]);
        if (requestId !== summaryRequestIdRef.current) return;
        setCounts(queue);
        if (labSummary) {
          setLabLatestDate(labSummary.latestDate);
          setLabLatestLab(labSummary.latestLab);
        }
      } catch (e) {
        if (requestId !== summaryRequestIdRef.current) return;
        toastRef.current.error(
          e instanceof Error ? e.message : "Failed to load report summary"
        );
      } finally {
        if (requestId === summaryRequestIdRef.current) {
          setLoadingSummary(false);
        }
      }
    })();
  }, [lockedPatientId, searchQ, refreshToken]);

  useEffect(() => {
    if (!lockedPatientId) return;
    const requestId = ++listRequestIdRef.current;
    setLoadingReports(true);
    void (async () => {
      try {
        // Always keep patient_id — free-text search never unlocks other patients.
        const result = await providerRef.current.listReports({
          q: searchQ || undefined,
          patientId: lockedPatientId,
          consultationId: null,
          advanced,
        });
        if (requestId !== listRequestIdRef.current) return;
        setReports(result.reports);
      } catch (e) {
        if (requestId !== listRequestIdRef.current) return;
        setReports([]);
        toastRef.current.error(
          e instanceof Error ? e.message : "Failed to load reports"
        );
      } finally {
        if (requestId === listRequestIdRef.current) {
          setLoadingReports(false);
        }
      }
    })();
  }, [lockedPatientId, searchQ, advancedKey, refreshToken, advanced]);

  const filteredReports = useMemo(
    () =>
      reports.filter((r) =>
        matchesClinicalModality(r.category, r.testName, modality)
      ),
    [reports, modality]
  );

  const summaryModel = useMemo((): ClinicalReportsSummaryModel => {
    const latest = pickLatestReady(reports);
    const contextPatient = reports[0]?.patient;
    return {
      reportsReady: counts.reports_ready,
      pending: counts.awaiting,
      critical: counts.critical,
      latestTestName:
        latest?.testName ??
        (labLatestLab ? `Report · ${labLatestLab}` : null),
      latestReportAt:
        latest?.reportDate ||
        latest?.uploadedAt ||
        labLatestDate ||
        null,
      lastConsultationLabel:
        contextPatient?.currentConsultationLabel ??
        latest?.consultationLabel ??
        null,
      lastVisitAt: contextPatient?.lastVisitAt ?? null,
    };
  }, [counts, reports, labLatestDate, labLatestLab]);

  const hasActiveFilters = Boolean(
    searchQ || modality || countActiveAdvancedFilters(advanced)
  );

  const openPreview = useCallback(async (reportId: string) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const detail = await providerRef.current.getReportDetail(reportId);
      setPreviewReport(detail);
    } catch (e) {
      toastRef.current.error(
        e instanceof Error ? e.message : "Failed to open preview"
      );
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const onSelectReport = (report: WorkspaceReport) => {
    if (report.clinicalStatus === "AWAITING_REPORT") {
      toastRef.current.info(
        "This test is still awaiting results from the lab."
      );
      return;
    }
    void openPreview(report.id);
  };

  if (!lockedPatientId) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Select a patient before viewing clinical reports.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex gap-2">
          <PatientSearchBar
            value={searchInput}
            onChange={setSearchInput}
            className="min-w-0 flex-1"
            placeholder="Search CBC, sugar, MRI, lab name…"
          />
          <WorkspaceAdvancedFilters
            value={advanced}
            onChange={setAdvanced}
            reportsForOptions={reports}
          />
        </div>
        <ClinicalModalityChips value={modality} onChange={setModality} />
      </div>

      <ClinicalReportsSummary
        summary={summaryModel}
        loading={loadingSummary && reports.length === 0}
      />

      {loadingReports ? (
        <ClinicalReportsTimeline
          reports={[]}
          loading
          onSelect={onSelectReport}
        />
      ) : filteredReports.length === 0 ? (
        <ClinicalReportsEmptyState
          patientId={lockedPatientId}
          filtered={hasActiveFilters || reports.length > 0}
          onOrderTests={onOrderTests}
          onRefresh={refresh}
        />
      ) : (
        <ClinicalReportsTimeline
          reports={filteredReports}
          selectedReportId={previewReport?.id ?? null}
          onSelect={onSelectReport}
        />
      )}

      <ReportPreviewWorkspace
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        report={previewReport}
        loading={previewLoading}
        variant="cds"
      />
    </div>
  );
}
