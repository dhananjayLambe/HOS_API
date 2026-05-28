"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  DEFAULT_REPORT_TASKS_FILTERS,
  type ReportTasksQueryFilters,
} from "@/lib/labs/reports/build-report-tasks-query";
import {
  buildAttentionItems,
  computeCompletionKpis,
  countReadyToSendReports,
  groupOrdersByPatient,
  sortOrdersByOperationalPriority,
} from "@/lib/labs/reports/completion/order-lifecycle-queue-utils";
import type { CompletionFilterKey } from "@/lib/labs/reports/completion/order-lifecycle.types";
import {
  applyReportsQueueFilters,
  buildActiveFilterChips,
  clearFilterChip,
  DEFAULT_REPORTS_QUEUE_FILTERS,
  mergeSearchIntentIntoFilters,
  parseReportSearchIntent,
  type ReportsQueueFilterState,
} from "@/lib/labs/reports/completion/reports-queue-filters";
import { stubOrdersFromTasks } from "@/lib/labs/reports/completion/queue-providers/live-queue-provider";
import { demoQueueProvider } from "@/lib/labs/reports/completion/queue-providers/demo-queue-provider";
import { liveQueueProvider } from "@/lib/labs/reports/completion/queue-providers/live-queue-provider";
import type { ReportsQueueSnapshot } from "@/lib/labs/reports/completion/queue-providers/types";
import {
  reportTasksQueryKey,
  REPORT_TASKS_POLL_MS,
  REPORT_TASKS_STALE_MS,
} from "@/lib/labs/reports/query-keys";
import {
  buildCompletionQueueSearchParams,
  parseCompletionQueueSearchParams,
  reportQueuePathFromParams,
} from "@/lib/labs/reports/report-queue-url";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { isReportsDemoForced } from "@/lib/labs/reports/reports-demo-queue";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 400;
const PATIENT_GROUP_EXPANDED_STORAGE_KEY = "reports.patientGroups.expanded";

/** Wide API window — visible Today filter is client-side on operationalUpdatedAtIso. */
const COMPLETION_API_FETCH_FILTERS: ReportTasksQueryFilters = {
  ...DEFAULT_REPORT_TASKS_FILTERS,
  datePreset: "month",
};

function readExpandedPatientKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(PATIENT_GROUP_EXPANDED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

function persistExpandedPatientKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PATIENT_GROUP_EXPANDED_STORAGE_KEY, JSON.stringify([...keys]));
}

export function useReportsOperationalQueue(branchLabel = "") {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoForced = isReportsDemoForced(searchParams);
  const provider = isDemoForced ? demoQueueProvider : liveQueueProvider;
  const isDemo = provider.mode === "demo";

  const { data: session } = useLabSession();
  const branchId = session?.branch?.id ?? null;

  const initialFilters = useMemo(
    () => parseCompletionQueueSearchParams(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount snapshot
    [],
  );

  const [searchInput, setSearchInput] = useState(initialFilters.searchQ);
  const [filterState, setFilterState] = useState<ReportsQueueFilterState>(initialFilters);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [actionLoadingTaskId, setActionLoadingTaskId] = useState<string | null>(null);
  const [expandedPatientKeys, setExpandedPatientKeys] = useState<Set<string>>(() => new Set());
  const [pollFailureCount, setPollFailureCount] = useState(0);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const skipUrlSyncRef = useRef(true);

  const debouncedSearchQ = useDebouncedValue(filterState.searchQ, SEARCH_DEBOUNCE_MS);

  const queryFilters = useMemo<ReportTasksQueryFilters>(
    () => ({
      ...COMPLETION_API_FETCH_FILTERS,
      search: debouncedSearchQ,
    }),
    [debouncedSearchQ],
  );

  const listQuery = useInfiniteQuery({
    queryKey: [...reportTasksQueryKey(branchId, queryFilters, "all"), "operational", provider.mode],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<ReportsQueueSnapshot> =>
      provider.fetchSnapshot({
        branchId,
        branchLabel,
        filters: queryFilters,
        cursor: typeof pageParam === "string" ? pageParam : null,
        signal,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.mode === "live" && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    placeholderData: (previous) => previous,
    refetchInterval: isDemo ? false : REPORT_TASKS_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: REPORT_TASKS_STALE_MS,
  });

  useEffect(() => {
    if (listQuery.isSuccess) setPollFailureCount(0);
    if (listQuery.isError) setPollFailureCount((c) => c + 1);
  }, [listQuery.isError, listQuery.isSuccess]);

  useEffect(() => {
    const parsed = parseCompletionQueueSearchParams(searchParams);
    setFilterState(parsed);
    setSearchInput(parsed.searchQ);
    skipUrlSyncRef.current = true;
  }, [searchParams]);

  const urlFilterState = useMemo(
    () => ({ ...filterState, searchQ: debouncedSearchQ.trim() }),
    [debouncedSearchQ, filterState],
  );

  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }
    const params = buildCompletionQueueSearchParams(
      new URLSearchParams(searchParams.toString()),
      urlFilterState,
    );
    router.replace(reportQueuePathFromParams(params), { scroll: false });
  }, [router, searchParams, urlFilterState]);

  const snapshots = listQuery.data?.pages ?? [];
  const tasks: ReportTask[] = useMemo(
    () =>
      snapshots.flatMap((snapshot) => (snapshot.mode === "live" ? snapshot.tasks : [])),
    [snapshots],
  );

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.taskId, t])), [tasks]);

  const baseOrders = useMemo(() => {
    const firstSnapshot = snapshots[0];
    if (firstSnapshot?.mode === "demo") return firstSnapshot.orders;
    return stubOrdersFromTasks(tasks);
  }, [snapshots, tasks]);

  const sortedBase = useMemo(() => sortOrdersByOperationalPriority(baseOrders), [baseOrders]);

  const filteredOrders = useMemo(
    () =>
      applyReportsQueueFilters(sortedBase, filterState, {
        clientSearch: isDemo,
      }),
    [sortedBase, filterState, isDemo],
  );

  const groups = useMemo(() => groupOrdersByPatient(filteredOrders), [filteredOrders]);
  const activeOrders = useMemo(
    () => sortedBase.filter((o) => !o.isFullyComplete),
    [sortedBase],
  );
  const attentionItems = useMemo(() => buildAttentionItems(activeOrders), [activeOrders]);
  const localKpis = useMemo(() => computeCompletionKpis(sortedBase), [sortedBase]);
  const backendKpis = useMemo(() => {
    for (const snapshot of snapshots) {
      if (snapshot.mode === "live" && snapshot.counts) {
        return {
          pendingUploads: snapshot.counts.pendingUploads,
          readyToSend: snapshot.counts.readyDelivery,
          delivered: snapshot.counts.delivered,
          deliveryFailures: snapshot.counts.failed,
        };
      }
    }
    return null;
  }, [snapshots]);
  const kpis = backendKpis ?? localKpis;
  const readyToSendCount = useMemo(() => countReadyToSendReports(activeOrders), [activeOrders]);
  const activeFilterChips = useMemo(() => buildActiveFilterChips(filterState), [filterState]);

  const totalBeforeWorkflowTat = useMemo(
    () =>
      applyReportsQueueFilters(
        sortedBase,
        {
          ...filterState,
          workflow: "all",
          urgentOnly: false,
          tatBreachedOnly: false,
          tatSoonOnly: false,
        },
        { clientSearch: isDemo },
      ).length,
    [sortedBase, filterState, isDemo],
  );

  const patchFilters = useCallback((patch: Partial<ReportsQueueFilterState>) => {
    setFilterState((current) => ({ ...current, ...patch }));
  }, []);

  const setWorkflowFilter = useCallback((workflow: CompletionFilterKey) => {
    patchFilters({ workflow });
  }, [patchFilters]);

  const handleSearchInputChange = useCallback((raw: string) => {
    setSearchInput(raw);
    const intent = parseReportSearchIntent(raw);
    setFilterState((current) => mergeSearchIntentIntoFilters(current, intent));
  }, []);

  const clearActiveChip = useCallback((chipId: string) => {
    setFilterState((current) => {
      const next = clearFilterChip(current, chipId);
      if (chipId === "q") setSearchInput("");
      return next;
    });
  }, []);

  const getOrder = useCallback(
    (taskId: string) => baseOrders.find((o) => o.taskId === taskId) ?? null,
    [baseOrders],
  );

  const getTask = useCallback((taskId: string) => taskById.get(taskId) ?? null, [taskById]);

  useEffect(() => {
    setExpandedPatientKeys(readExpandedPatientKeys());
  }, []);

  const setPatientGroupExpanded = useCallback((patientKey: string, expanded: boolean) => {
    setExpandedPatientKeys((current) => {
      const next = new Set(current);
      if (expanded) next.add(patientKey);
      else next.delete(patientKey);
      persistExpandedPatientKeys(next);
      return next;
    });
  }, []);

  const togglePatientGroup = useCallback((patientKey: string) => {
    setExpandedPatientKeys((current) => {
      const next = new Set(current);
      if (next.has(patientKey)) next.delete(patientKey);
      else next.add(patientKey);
      persistExpandedPatientKeys(next);
      return next;
    });
  }, []);

  const jumpToCard = useCallback(
    (taskId: string) => {
      const order = baseOrders.find((o) => o.taskId === taskId);
      if (order) setPatientGroupExpanded(order.patientKey, true);
      setHighlightedTaskId(taskId);
      window.setTimeout(() => {
        cardRefs.current[taskId]?.scrollIntoView({ behavior: "auto", block: "center" });
      }, 50);
      window.setTimeout(() => setHighlightedTaskId(null), 2000);
    },
    [baseOrders, setPatientGroupExpanded],
  );

  const refetch = useCallback(() => {
    void listQuery.refetch();
  }, [listQuery.refetch]);

  const lastSnapshot = snapshots[snapshots.length - 1];
  const hasMore =
    lastSnapshot?.mode === "live" ? Boolean(lastSnapshot.nextCursor) : false;
  const loadingMore = listQuery.isFetchingNextPage;
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    void listQuery.fetchNextPage();
  }, [hasMore, listQuery, loadingMore]);

  const loading = listQuery.isPending && listQuery.data === undefined;
  const refreshing = listQuery.isFetching && !listQuery.isPending;
  const isQueryError = listQuery.isError && !isDemo;
  const error =
    listQuery.error instanceof Error
      ? listQuery.error.message
      : isQueryError
        ? "Could not load reports."
        : null;
  const isStaleQueue =
    (listQuery.isError && listQuery.data !== undefined) || pollFailureCount >= 3;

  return {
    isDemo,
    isDemoForced,
    isLive: !isDemo,
    tasks,
    taskById,
    getTask,
    orders: baseOrders,
    groups,
    attentionItems,
    kpis,
    readyToSendCount,
    searchInput,
    setSearchInput: handleSearchInputChange,
    filterState,
    patchFilters,
    setWorkflowFilter,
    activeFilterChips,
    clearActiveChip,
    totalBeforeWorkflowTat,
    filteredCount: filteredOrders.length,
    highlightedTaskId,
    actionLoadingTaskId,
    setActionLoadingTaskId,
    expandedPatientKeys,
    setPatientGroupExpanded,
    togglePatientGroup,
    cardRefs,
    getOrder,
    jumpToCard,
    loading,
    refreshing,
    error,
    isQueryError,
    isStaleQueue,
    refetch,
    hasMore,
    loadingMore,
    loadMore,
    /** @deprecated Use filterState.workflow */
    filter: filterState.workflow,
    /** @deprecated Use setWorkflowFilter */
    setFilter: setWorkflowFilter,
  };
}
