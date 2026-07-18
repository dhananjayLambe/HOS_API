"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMobile } from "@/hooks/use-mobile";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { LandingExperience } from "@/components/doctor/diagnostic-reports-workspace/LandingExperience";
import { OperationalQueueStrip } from "@/components/doctor/diagnostic-reports-workspace/OperationalQueueStrip";
import { PatientContextBar } from "@/components/doctor/diagnostic-reports-workspace/PatientContextBar";
import { PatientReportBrowser } from "@/components/doctor/diagnostic-reports-workspace/PatientReportBrowser";
import { PatientSearchBar } from "@/components/doctor/diagnostic-reports-workspace/PatientSearchBar";
import { ReportPreviewWorkspace } from "@/components/doctor/diagnostic-reports-workspace/ReportPreviewWorkspace";
import { WorkspaceAdvancedFilters } from "@/components/doctor/diagnostic-reports-workspace/WorkspaceAdvancedFilters";
import { createLiveWorkspaceProvider } from "@/components/doctor/diagnostic-reports-workspace/live-workspace-provider";
import {
  EMPTY_ADVANCED_FILTERS,
  type AdvancedWorkspaceFilters,
  type OperationalQueue,
  type OperationalQueueCounts,
  type QuickClinicalFilter,
  type WorkspacePatient,
  type WorkspaceReport,
} from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import {
  parseWorkspaceUrlState,
  workspaceStateToSearchParams,
  type WorkspaceUrlState,
} from "@/lib/doctor/diagnostic-reports-workspace/url-state";
import { workspaceUuidOrNull } from "@/lib/doctor/diagnostic-reports-workspace/workspace-ids";
import { typePageTitle } from "@/lib/design-system/clinical";
import { cn } from "@/lib/utils";
import { countActiveAdvancedFilters } from "@/lib/doctor/diagnostic-reports-workspace/filter-workspace-reports";
import { WORKSPACE_MIN_SEARCH_LENGTH } from "@/components/doctor/diagnostic-reports-workspace/live-workspace-provider";

const EMPTY_COUNTS: OperationalQueueCounts = {
  reports_ready: 0,
  critical: 0,
  awaiting: 0,
};

const SESSION_KEY = "diagnostic-reports-workspace-url";

type DiagnosticReportsWorkspacePageProps = {
  embedded?: boolean;
  lockedPatientId?: string | null;
  lockedConsultationId?: string | null;
};

export function DiagnosticReportsWorkspacePage({
  embedded = false,
  lockedPatientId = null,
  lockedConsultationId = null,
}: DiagnosticReportsWorkspacePageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useMobile();
  const toast = useToastNotification();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const searchKey = searchParams.toString();
  const urlState = useMemo(
    () => parseWorkspaceUrlState(new URLSearchParams(searchKey)),
    [searchKey]
  );

  const [embedQueue, setEmbedQueue] = useState<OperationalQueue | null>(null);
  const [embedAdvanced, setEmbedAdvanced] =
    useState<AdvancedWorkspaceFilters>(EMPTY_ADVANCED_FILTERS);

  const activeQueue = embedded ? embedQueue : urlState.queue;
  const activeQuickFilter = embedded ? null : urlState.quickFilter;
  const effectivePatientId =
    workspaceUuidOrNull(lockedPatientId) ?? urlState.patientId;
  const effectiveConsultationId =
    workspaceUuidOrNull(lockedConsultationId) ?? urlState.consultationId;
  const page = embedded ? 1 : urlState.page;
  const advanced = embedded ? embedAdvanced : urlState.advanced;
  const advancedKey = JSON.stringify(advanced);

  const provider = useMemo(() => createLiveWorkspaceProvider(), []);
  const providerRef = useRef(provider);
  providerRef.current = provider;

  const [searchInput, setSearchInput] = useState(urlState.q);
  const debouncedQ = useDebouncedValue(searchInput, 300);
  /** Search API min length — shorter terms use list (no `q`) to avoid 400s while typing. */
  const searchQ =
    debouncedQ.trim().length >= WORKSPACE_MIN_SEARCH_LENGTH
      ? debouncedQ.trim()
      : "";


  const [counts, setCounts] = useState<OperationalQueueCounts>(EMPTY_COUNTS);
  const [reports, setReports] = useState<WorkspaceReport[]>([]);
  const [listHasMore, setListHasMore] = useState(false);
  /** Opaque cursors keyed by page number (page 1 = null). */
  const cursorByPageRef = useRef<Record<number, string | null>>({ 1: null });
  const [allReportsForOptions, setAllReportsForOptions] = useState<WorkspaceReport[]>([]);
  const [loadingQueues, setLoadingQueues] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [contextPatient, setContextPatient] = useState<WorkspacePatient | null>(null);
  const [previewReport, setPreviewReport] = useState<WorkspaceReport | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const urlStateRef = useRef(urlState);
  urlStateRef.current = urlState;
  const debouncedQRef = useRef(debouncedQ);
  debouncedQRef.current = debouncedQ;
  const queueRequestIdRef = useRef(0);
  const listRequestIdRef = useRef(0);

  const pushState = useCallback(
    (patch: Partial<WorkspaceUrlState>) => {
      if (embedded) return;
      const next: WorkspaceUrlState = {
        ...urlStateRef.current,
        q:
          debouncedQRef.current.trim().length === 1
            ? urlStateRef.current.q
            : debouncedQRef.current.trim(),
        ...patch,
      };
      const params = workspaceStateToSearchParams(next);
      const qs = params.toString();
      if (qs === searchKey) return;
      try {
        sessionStorage.setItem(SESSION_KEY, qs);
      } catch {
        /* ignore */
      }
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [embedded, pathname, router, searchKey]
  );

  // Sync quick filter chips with KPI queue when they represent the same bucket
  const resolvedQuickFilter: QuickClinicalFilter | null = useMemo(() => {
    if (activeQuickFilter) return activeQuickFilter;
    if (activeQueue === "reports_ready") return "reports_ready";
    if (activeQueue === "awaiting") return "awaiting";
    return null;
  }, [activeQuickFilter, activeQueue]);

  useEffect(() => {
    if (embedded) return;
    setSearchInput((prev) => (prev === urlState.q ? prev : urlState.q));
  }, [urlState.q, embedded]);

  useEffect(() => {
    if (embedded) return;
    const trimmed = debouncedQ.trim();
    // Don't sync 1-char queries to URL/API search (backend min length is 2)
    if (trimmed.length === 1) return;
    if (trimmed.length >= WORKSPACE_MIN_SEARCH_LENGTH) {
      // Clear sticky patient/report scope so free-text search can find other patients
      if (
        trimmed === urlState.q &&
        !urlState.patientId &&
        !urlState.reportId
      ) {
        return;
      }
      pushState({
        q: trimmed,
        page: 1,
        patientId: null,
        reportId: null,
      });
      return;
    }
    if (trimmed === urlState.q) return;
    pushState({ q: trimmed, page: 1 });
  }, [
    debouncedQ,
    urlState.q,
    urlState.patientId,
    urlState.reportId,
    pushState,
    embedded,
  ]);

  useEffect(() => {
    const requestId = ++queueRequestIdRef.current;
    setLoadingQueues(true);
    void (async () => {
      try {
        const c = await providerRef.current.getQueueCounts({
          q: searchQ || undefined,
          patientId: effectivePatientId,
          consultationId: effectiveConsultationId,
        });
        if (requestId !== queueRequestIdRef.current) return;
        setCounts(c);
      } catch (e) {
        if (requestId !== queueRequestIdRef.current) return;
        toastRef.current.error(
          e instanceof Error ? e.message : "Failed to load workspace"
        );
      } finally {
        if (requestId === queueRequestIdRef.current) {
          setLoadingQueues(false);
        }
      }
    })();
  }, [searchQ, effectivePatientId, effectiveConsultationId]);

  useEffect(() => {
    // Filter identity changed — reset cursor stack (callers reset page to 1).
    cursorByPageRef.current = { 1: null };
  }, [
    searchQ,
    activeQueue,
    activeQuickFilter,
    effectivePatientId,
    effectiveConsultationId,
    embedded,
    urlState.encounterId,
    advancedKey,
  ]);

  useEffect(() => {
    const requestId = ++listRequestIdRef.current;
    setLoadingReports(true);
    void (async () => {
      try {
        const pageCursor =
          page <= 1 ? null : cursorByPageRef.current[page] ?? null;
        if (page > 1 && pageCursor == null) {
          if (requestId === listRequestIdRef.current) {
            setLoadingReports(false);
          }
          if (!embedded) {
            pushState({ page: 1 });
          }
          return;
        }
        const listQuery = {
          q: searchQ || undefined,
          queue: activeQueue,
          // Avoid double-filtering when queue already encodes quick chip
          quickFilter:
            activeQueue === "reports_ready" || activeQueue === "awaiting"
              ? activeQuickFilter === "my_patients" || activeQuickFilter === "today"
                ? activeQuickFilter
                : null
              : activeQuickFilter,
          // Free-text search must not stay locked to a prior patient filter
          patientId: searchQ ? null : effectivePatientId,
          consultationId: searchQ ? null : effectiveConsultationId,
          encounterId: embedded || searchQ ? null : urlState.encounterId,
          cursor: pageCursor,
          advanced,
        };
        const [result, optionsSource] = await Promise.all([
          providerRef.current.listReports(listQuery),
          providerRef.current.listReports({
            patientId: searchQ ? null : effectivePatientId,
            consultationId: searchQ ? null : effectiveConsultationId,
          }),
        ]);
        if (requestId !== listRequestIdRef.current) return;
        setReports(result.reports);
        setListHasMore(Boolean(result.nextCursor));
        if (result.nextCursor) {
          cursorByPageRef.current = {
            ...cursorByPageRef.current,
            [page + 1]: result.nextCursor,
          };
        }
        setAllReportsForOptions(optionsSource.reports);
        if (effectivePatientId) {
          const fromRow = result.reports.find(
            (r) => r.patient.id === effectivePatientId
          )?.patient;
          if (fromRow) setContextPatient(fromRow);
          else {
            const patients = await providerRef.current.searchPatients("");
            if (requestId !== listRequestIdRef.current) return;
            const match = patients.find((p) => p.id === effectivePatientId);
            if (match) setContextPatient(match);
          }
        } else {
          setContextPatient(null);
        }
      } catch (e) {
        if (requestId !== listRequestIdRef.current) return;
        setReports([]);
        setListHasMore(false);
        toastRef.current.error(
          e instanceof Error ? e.message : "Failed to load reports"
        );
      } finally {
        if (requestId === listRequestIdRef.current) {
          setLoadingReports(false);
        }
      }
    })();
  }, [
    searchQ,
    activeQueue,
    activeQuickFilter,
    effectivePatientId,
    effectiveConsultationId,
    embedded,
    urlState.encounterId,
    advancedKey,
    page,
    pushState,
  ]);

  const openPreview = useCallback(
    async (reportId: string, fallbackPatient?: WorkspacePatient) => {
      setPreviewOpen(true);
      setPreviewLoading(true);
      if (!embedded) {
        pushState({
          reportId,
          patientId: fallbackPatient?.id ?? effectivePatientId,
        });
      }
      try {
        const detail = await providerRef.current.getReportDetail(reportId);
        setPreviewReport(detail);
        if (detail) setContextPatient(detail.patient);
        else if (fallbackPatient) setContextPatient(fallbackPatient);
      } catch (e) {
        toastRef.current.error(
          e instanceof Error ? e.message : "Failed to open preview"
        );
      } finally {
        setPreviewLoading(false);
      }
    },
    [embedded, pushState, effectivePatientId]
  );

  useEffect(() => {
    if (embedded || !urlState.reportId) return;
    void openPreview(urlState.reportId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlState.reportId, embedded]);

  const emptyCopy = useMemo(() => {
    if (activeQueue === "reports_ready") {
      return {
        title: "No reports ready",
        description:
          "No reports match your filters. Try clearing filters or searching by patient.",
      };
    }
    if (activeQueue === "awaiting") {
      return {
        title: "Nothing awaiting",
        description: "No ordered tests are waiting on results right now.",
      };
    }
    if (activeQueue === "critical") {
      return {
        title: "No critical results",
        description: "No flagged critical reports right now.",
      };
    }
    if (searchQ) {
      return {
        title: "No reports found",
        description:
          "No reports match your search. Try another patient name, identifier, or clear filters.",
      };
    }
    return {
      title: "No reports found",
      description:
        "No reports match your filters. Try clearing filters or searching by patient.",
    };
  }, [activeQueue, searchQ]);

  const onPreviewReport = (report: WorkspaceReport) => {
    if (report.clinicalStatus === "AWAITING_REPORT") {
      toastRef.current.info("This test is still awaiting results from the lab.");
      return;
    }
    void openPreview(report.id, report.patient);
  };

  const onQueueSelect = (queue: OperationalQueue | null) => {
    if (embedded) {
      setEmbedQueue(queue);
      return;
    }
    // Sync quick filter with queue for reports_ready / awaiting
    const quick: QuickClinicalFilter | null =
      queue === "reports_ready" || queue === "awaiting" ? queue : null;
    pushState({ queue, quickFilter: quick, page: 1, reportId: null });
  };

  const onQuickFilterSelect = (filter: QuickClinicalFilter | null) => {
    if (embedded) return;
    if (filter === "reports_ready" || filter === "awaiting") {
      pushState({ quickFilter: filter, queue: filter, page: 1 });
      return;
    }
    if (filter === "today" || filter === "my_patients") {
      pushState({ quickFilter: filter, queue: null, page: 1 });
      return;
    }
    pushState({ quickFilter: null, queue: null, page: 1 });
  };

  const onAdvancedChange = (next: AdvancedWorkspaceFilters) => {
    if (embedded) {
      setEmbedAdvanced(next);
      return;
    }
    pushState({ advanced: next, page: 1 });
  };

  const hasActiveFilters = Boolean(
    activeQueue ||
      resolvedQuickFilter ||
      searchQ ||
      countActiveAdvancedFilters(advanced)
  );

  return (
    <div
      className={
        embedded
          ? "space-y-3"
          : "flex w-full min-w-0 flex-col gap-3 bg-[hsl(var(--clinical-surface-page))]"
      }
    >
      {!embedded ? (
        <div>
          <h1 className={typePageTitle}>Diagnostic Reports</h1>
          <p className="mt-1 text-sm text-[hsl(var(--clinical-text-secondary))]">
            Find and view diagnostic reports.
          </p>
        </div>
      ) : null}

      <div
        className={
          embedded
            ? "space-y-2"
            : cn(
                "sticky top-16 z-20 space-y-2.5 border-b border-[hsl(var(--clinical-divider))] bg-[hsl(var(--clinical-surface-page)/0.92)] pb-2.5 backdrop-blur-md"
              )
        }
      >
        {!embedded ? (
          <LandingExperience
            search={searchInput}
            onSearchChange={setSearchInput}
            myPatientsActive={resolvedQuickFilter === "my_patients"}
            onMyPatients={() =>
              onQuickFilterSelect(
                resolvedQuickFilter === "my_patients" ? null : "my_patients"
              )
            }
            queueCounts={counts}
            activeQueue={activeQueue}
            onQueueSelect={onQueueSelect}
            queuesLoading={loadingQueues}
            quickFilter={resolvedQuickFilter}
            onQuickFilterSelect={onQuickFilterSelect}
            advanced={advanced}
            onAdvancedChange={onAdvancedChange}
            filterOptionsReports={allReportsForOptions}
          />
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <PatientSearchBar
                value={searchInput}
                onChange={setSearchInput}
                className="min-w-0 flex-1"
                placeholder="Filter this patient’s reports…"
              />
              <WorkspaceAdvancedFilters
                value={advanced}
                onChange={onAdvancedChange}
                reportsForOptions={allReportsForOptions}
              />
            </div>
            <OperationalQueueStrip
              counts={counts}
              active={activeQueue}
              onSelect={onQueueSelect}
              loading={loadingQueues}
              compact
            />
          </div>
        )}
      </div>

      {contextPatient ? (
        <PatientContextBar
          patient={contextPatient}
          onClear={
            embedded || lockedPatientId
              ? undefined
              : () => {
                  pushState({ patientId: null, reportId: null });
                  setContextPatient(null);
                }
          }
        />
      ) : null}

      <PatientReportBrowser
        reports={reports}
        loading={loadingReports}
        layout={isMobile || embedded ? "cards" : "table"}
        page={page}
        serverHasMore={listHasMore}
        onPageChange={(p) => {
          if (!embedded) pushState({ page: p });
        }}
        hidePatientColumn={Boolean(effectivePatientId && !embedded)}
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        emptyActionLabel={hasActiveFilters && !embedded ? "Clear filters" : undefined}
        onEmptyAction={
          hasActiveFilters && !embedded
            ? () => {
                setSearchInput("");
                pushState({
                  q: "",
                  queue: null,
                  quickFilter: null,
                  advanced: EMPTY_ADVANCED_FILTERS,
                  page: 1,
                  reportId: null,
                });
              }
            : undefined
        }
        onPreview={onPreviewReport}
        selectedReportId={previewReport?.id ?? urlState.reportId}
      />

      <ReportPreviewWorkspace
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open && !embedded) pushState({ reportId: null });
        }}
        report={previewReport}
        loading={previewLoading}
        onViewPatientReports={
          embedded
            ? undefined
            : (patientId) => {
                setSearchInput("");
                setPreviewOpen(false);
                setPreviewReport(null);
                pushState({
                  patientId,
                  reportId: null,
                  q: "",
                  queue: null,
                  quickFilter: null,
                  page: 1,
                });
              }
        }
      />
    </div>
  );
}
