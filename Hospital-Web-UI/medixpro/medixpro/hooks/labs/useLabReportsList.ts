"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  DEFAULT_REPORT_TASKS_FILTERS,
  type ReportTasksQueryFilters,
} from "@/lib/labs/reports/build-report-tasks-query";
import { filterReportTasks } from "@/lib/labs/reports/filter-report-tasks";
import {
  groupTasksByPatient,
  sortWorkflowGroups,
  type PatientReportGroup,
} from "@/lib/labs/reports/group-report-tasks";
import { loadReportTasks } from "@/lib/labs/reports/load-report-tasks";
import {
  reportTasksQueryKey,
  REPORT_TASKS_POLL_MS,
  REPORT_TASKS_STALE_MS,
} from "@/lib/labs/reports/query-keys";
import {
  buildReportQueueSearchParams,
  parseReportQueueSearchParams,
  reportQueuePathFromParams,
  type ReportQueueUrlPatch,
} from "@/lib/labs/reports/report-queue-url";
import {
  getDemoReportTasks,
  isReportsDemoForced,
} from "@/lib/labs/reports/reports-demo-queue";
import {
  calculateQueueKPIs,
  taskMatchesTab,
  type ReportKpiCounts,
  type ReportTabKey,
} from "@/lib/labs/reports/report-operational-status";
import {
  isDeliveredToday,
  type ReportTask,
} from "@/lib/labs/reports/report-task";
import type { LabOrderRow } from "@/lib/labs/types";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { trackReportEvent } from "@/lib/labs/reports/report-monitoring";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 400;

export type UseLabReportsListResult = {
  isDemoFallback: boolean;
  isDemoForced: boolean;
  tasks: ReportTask[];
  filteredTasks: ReportTask[];
  groups: PatientReportGroup[];
  kpis: ReportKpiCounts;
  tab: ReportTabKey;
  setTab: (tab: ReportTabKey) => void;
  searchInput: string;
  setSearchInput: (v: string) => void;
  filters: ReportTasksQueryFilters;
  setFilters: (f: ReportTasksQueryFilters) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refetch: () => void;
  syncQueueToUrl: (patch: ReportQueueUrlPatch) => void;
  getOrderForTask: (taskId: string) => LabOrderRow | null;
  totalTaskCount: number;
  isQueryError: boolean;
  isStaleQueue: boolean;
};

export function useLabReportsList(branchLabel = ""): UseLabReportsListResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useLabSession();
  const branchId = session?.branch?.id ?? null;

  const initialUrl = useMemo(
    () => parseReportQueueSearchParams(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount snapshot only
    [],
  );

  const [tab, setTab] = useState<ReportTabKey>(initialUrl.tab);
  const [searchInput, setSearchInput] = useState(initialUrl.searchInput);
  const [filters, setFilters] = useState<ReportTasksQueryFilters>(initialUrl.filters);
  const [pollFailureCount, setPollFailureCount] = useState(0);

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const skipSearchUrlSyncRef = useRef(true);

  useEffect(() => {
    const parsed = parseReportQueueSearchParams(searchParams);
    setTab(parsed.tab);
    setSearchInput(parsed.searchInput);
    setFilters(parsed.filters);
    skipSearchUrlSyncRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (skipSearchUrlSyncRef.current) {
      skipSearchUrlSyncRef.current = false;
      return;
    }
    const params = buildReportQueueSearchParams(new URLSearchParams(searchParams.toString()), {
      searchInput: debouncedSearch,
    });
    router.replace(reportQueuePathFromParams(params), { scroll: false });
  }, [debouncedSearch, router, searchParams]);
  const queryClient = useQueryClient();

  const syncQueueToUrl = useCallback(
    (patch: ReportQueueUrlPatch) => {
      const params = buildReportQueueSearchParams(
        new URLSearchParams(searchParams.toString()),
        {
          tab: patch.tab ?? tab,
          searchInput: patch.searchInput ?? searchInput,
          filters: patch.filters ?? filters,
        },
      );
      router.replace(reportQueuePathFromParams(params), { scroll: false });
    },
    [router, searchParams, tab, searchInput, filters],
  );

  const queryFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch],
  );

  const listQuery = useQuery({
    queryKey: reportTasksQueryKey(branchId, queryFilters, tab),
    queryFn: async ({ signal }) => {
      const result = await loadReportTasks({
        branchId,
        branchLabel,
        filters: queryFilters,
        signal,
      });
      return result;
    },
    placeholderData: (previousData) => previousData,
    refetchInterval: REPORT_TASKS_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: REPORT_TASKS_STALE_MS,
  });

  useEffect(() => {
    if (listQuery.isSuccess) {
      setPollFailureCount(0);
      return;
    }
    if (listQuery.isError) {
      setPollFailureCount((c) => {
        const next = c + 1;
        if (next >= 3) trackReportEvent("poll_degraded");
        return next;
      });
    }
  }, [listQuery.isError, listQuery.isSuccess, listQuery.dataUpdatedAt]);

  const refetch = useCallback(() => {
    const prefix = ["lab", branchId ?? "unknown", "report-tasks"] as const;
    void queryClient.invalidateQueries({ queryKey: prefix });
    void queryClient.refetchQueries({ queryKey: prefix, type: "all" });
  }, [queryClient, branchId]);

  const forceDemo = isReportsDemoForced(searchParams);
  const apiTasks = listQuery.data?.tasks ?? [];
  const isQueryError = listQuery.isError;
  const error =
    listQuery.error instanceof Error ? listQuery.error.message : isQueryError ? "Could not load reports." : null;

  const isDemoForced = forceDemo;
  const isDemoFallback = forceDemo;

  const baseTasks = useMemo(() => {
    if (forceDemo) return getDemoReportTasks();
    return apiTasks;
  }, [apiTasks, forceDemo]);

  const afterUrgencyTat = useMemo(
    () =>
      filterReportTasks(baseTasks, {
        urgentOnly: filters.urgentOnly,
        tatBreached: filters.tatOnly,
        collectionType: filters.collectionType,
      }),
    [baseTasks, filters.urgentOnly, filters.tatOnly, filters.collectionType],
  );

  const filteredTasks = useMemo(
    () => afterUrgencyTat.filter((task) => taskMatchesTab(task.operationalStatus, tab)),
    [afterUrgencyTat, tab],
  );

  const groups = useMemo(
    () => sortWorkflowGroups(groupTasksByPatient(filteredTasks)),
    [filteredTasks],
  );

  const kpis = useMemo(
    () =>
      calculateQueueKPIs(
        baseTasks.map((t) => ({
          operationalStatus: t.operationalStatus,
          deliveredToday: isDeliveredToday(t),
          urgency: t.urgency,
          tatBreached: t.tatBreached,
        })),
      ),
    [baseTasks],
  );

  const getOrderForTask = useCallback(
    (taskId: string) => {
      const task = baseTasks.find((t) => t.taskId === taskId);
      return task?.orderRow ?? null;
    },
    [baseTasks],
  );

  const isStaleQueue =
    (listQuery.isError && listQuery.data !== undefined) || pollFailureCount >= 3;

  return {
    isDemoFallback,
    isDemoForced,
    tasks: baseTasks,
    filteredTasks,
    groups,
    kpis,
    tab,
    setTab,
    searchInput,
    setSearchInput,
    filters,
    setFilters,
    loading: listQuery.isPending && listQuery.data === undefined,
    refreshing: listQuery.isFetching && !listQuery.isPending,
    error: isQueryError && !forceDemo ? error : null,
    refetch,
    syncQueueToUrl,
    getOrderForTask,
    totalTaskCount: baseTasks.length,
    isQueryError: isQueryError && !forceDemo,
    isStaleQueue,
  };
}
