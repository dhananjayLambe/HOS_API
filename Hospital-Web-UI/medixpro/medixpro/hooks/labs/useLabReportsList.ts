"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetchLabOrdersList } from "@/lib/labs/api/orders";
import { LAB_DASHBOARD_POLL_INTERVAL_MS } from "@/lib/labs/dashboard/constants";
import {
  DEFAULT_LAB_ORDERS_FILTERS,
  type LabOrdersFilterState,
} from "@/lib/labs/orders/build-lab-orders-query";
import { mapLabOrderListItems } from "@/lib/labs/orders/map-order-row";
import {
  groupTasksByPatient,
  sortWorkflowGroups,
  type PatientReportGroup,
} from "@/lib/labs/reports/group-report-tasks";
import {
  getDemoReportTasks,
  isReportsDemoForced,
  shouldUseReportsDemoData,
} from "@/lib/labs/reports/reports-demo-queue";
import {
  countReportKpis,
  parseReportTabFromSearchParams,
  taskMatchesTab,
  type ReportKpiCounts,
  type ReportTabKey,
} from "@/lib/labs/reports/report-operational-status";
import { searchReportTasks } from "@/lib/labs/reports/search-report-tasks";
import {
  buildReportTasksFromOrders,
  isDeliveredToday,
  type ReportTask,
} from "@/lib/labs/reports/report-task";
import type { LabOrderRow } from "@/lib/labs/types";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 400;
const REPORTS_PAGE_SIZE = 100;

function ordersQueryFilters(): LabOrdersFilterState {
  return {
    ...DEFAULT_LAB_ORDERS_FILTERS,
    search: "",
    status: "IN_PROGRESS",
    collectionType: "all",
    urgency: "all",
    datePreset: "month",
  };
}

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
  filters: LabOrdersFilterState;
  setFilters: (f: LabOrdersFilterState) => void;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  patchTaskStatus: (taskId: string, status: ReportTask["operationalStatus"]) => void;
  getOrderForTask: (taskId: string) => LabOrderRow | null;
};

export function useLabReportsList(branchLabel = ""): UseLabReportsListResult {
  const searchParams = useSearchParams();
  const tabFromUrl = parseReportTabFromSearchParams(searchParams.get("tab"));

  const [tab, setTab] = useState<ReportTabKey>(tabFromUrl);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<LabOrdersFilterState>(ordersQueryFilters);
  const [apiTasks, setApiTasks] = useState<ReportTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ReportTask["operationalStatus"]>>({});

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const refreshKeyRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  const refetch = useCallback(() => {
    refreshKeyRef.current += 1;
    setRefreshKey(refreshKeyRef.current);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [inProgressRes, completedRes] = await Promise.all([
          fetchLabOrdersList(
            {
              filters: { ...ordersQueryFilters(), collectionType: filters.collectionType, datePreset: filters.datePreset },
              page: 1,
              pageSize: REPORTS_PAGE_SIZE,
              q: "",
            },
            { signal: controller.signal },
          ),
          fetchLabOrdersList(
            {
              filters: { ...ordersQueryFilters(), status: "COMPLETED", collectionType: filters.collectionType, datePreset: filters.datePreset },
              page: 1,
              pageSize: 50,
              q: "",
            },
            { signal: controller.signal },
          ),
        ]);

        if (cancelled) return;

        const orders = [
          ...mapLabOrderListItems(inProgressRes.results, branchLabel),
          ...mapLabOrderListItems(completedRes.results, branchLabel),
        ];
        const unique = new Map<string, LabOrderRow>();
        for (const row of orders) {
          unique.set(row.assignmentId, row);
        }
        setApiTasks(buildReportTasksFromOrders(Array.from(unique.values())));
        setStatusOverrides({});
      } catch (err) {
        if (cancelled || axios.isCancel(err)) return;
        setError(err instanceof Error ? err.message : "Could not load reports.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [branchLabel, filters.collectionType, filters.datePreset, refreshKey]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refetch();
    }, LAB_DASHBOARD_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refetch]);

  const forceDemo = isReportsDemoForced(searchParams);

  const useDemoData = shouldUseReportsDemoData({
    apiTaskCount: apiTasks.length,
    loading,
    error,
    forceDemo,
  });

  const isDemoFallback = useDemoData;
  const isDemoForced = useDemoData && forceDemo && apiTasks.length > 0;

  const baseTasks = useMemo(
    () => (useDemoData ? getDemoReportTasks() : apiTasks),
    [apiTasks, useDemoData],
  );

  const tasksWithOverrides = useMemo(
    () =>
      baseTasks.map((t) => ({
        ...t,
        operationalStatus: statusOverrides[t.taskId] ?? t.operationalStatus,
        orderRow: {
          ...t.orderRow,
          reportStatus: statusOverrides[t.taskId]
            ? overrideToApiStatus(statusOverrides[t.taskId]!)
            : t.orderRow.reportStatus,
        },
      })),
    [baseTasks, statusOverrides],
  );

  const searched = useMemo(
    () => searchReportTasks(tasksWithOverrides, debouncedSearch),
    [tasksWithOverrides, debouncedSearch],
  );

  const filteredTasks = useMemo(() => {
    return searched.filter((task) => {
      if (!taskMatchesTab(task.operationalStatus, tab)) return false;
      if (filters.collectionType !== "all" && task.collectionType !== filters.collectionType) {
        return false;
      }
      return true;
    });
  }, [searched, tab, filters.collectionType]);

  const groups = useMemo(
    () => sortWorkflowGroups(groupTasksByPatient(filteredTasks)),
    [filteredTasks],
  );

  const kpis = useMemo(() => {
    const statuses = tasksWithOverrides.map((t) => t.operationalStatus);
    return countReportKpis(statuses, (i) => isDeliveredToday(tasksWithOverrides[i]!));
  }, [tasksWithOverrides]);

  const patchTaskStatus = useCallback((taskId: string, status: ReportTask["operationalStatus"]) => {
    setStatusOverrides((prev) => ({ ...prev, [taskId]: status }));
  }, []);

  const getOrderForTask = useCallback(
    (taskId: string) => {
      const task = tasksWithOverrides.find((t) => t.taskId === taskId);
      return task?.orderRow ?? null;
    },
    [tasksWithOverrides],
  );

  return {
    isDemoFallback,
    isDemoForced,
    tasks: tasksWithOverrides,
    filteredTasks,
    groups,
    kpis,
    tab,
    setTab,
    searchInput,
    setSearchInput,
    filters,
    setFilters,
    loading,
    error,
    refetch,
    patchTaskStatus,
    getOrderForTask,
  };
}

function overrideToApiStatus(status: ReportTask["operationalStatus"]): string {
  switch (status) {
    case "PENDING_UPLOAD":
      return "pending";
    case "UPLOADED":
      return "in_progress";
    case "READY_DELIVERY":
      return "ready";
    case "DELIVERED":
      return "delivered";
    case "FAILED_DELIVERY":
      return "rejected";
    default:
      return "pending";
  }
}
