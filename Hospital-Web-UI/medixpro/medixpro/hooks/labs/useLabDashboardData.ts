"use client";

import { fetchHomeCollectionsList, fetchHomeCollectionsSummary } from "@/lib/labs/api/home-collections";
import { fetchLabOrdersList } from "@/lib/labs/api/orders";
import { fetchVisitAppointmentsSummary } from "@/lib/labs/api/visit-appointments";
import type { HomeCollectionsSummary } from "@/lib/labs/api/home-collections-types";
import type { VisitAppointmentsSummary } from "@/lib/labs/api/visit-appointments-types";
import { LAB_DASHBOARD_POLL_INTERVAL_MS } from "@/lib/labs/dashboard/constants";
import {
  avgDailyOrders,
  collectionSuccessPercent,
  collectionsTodayCount,
  filterReportPendingUploadOrders,
  filterReportReadyOrders,
  mapOrderToPipelineRow,
  type DashboardReportPipelineRow,
} from "@/lib/labs/dashboard/report-pipeline";
import { mapHomeCollectionListItem } from "@/lib/labs/home-collections/map-collection-row";
import { mapLabOrderListItems } from "@/lib/labs/orders/map-order-row";
import type { LabOrdersFilterState } from "@/lib/labs/orders/build-lab-orders-query";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { sessionHasOperationalAccess } from "@/lib/labs/session/lab-session-types";
import type { LabCollectionRow, LabOrderRow } from "@/lib/labs/types";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

const EMPTY_HOME_SUMMARY: HomeCollectionsSummary = {
  pending_collections: 0,
  assigned_today: 0,
  active_collections: 0,
  collected_today: 0,
  failed_no_response: 0,
};

const EMPTY_VISIT_SUMMARY: VisitAppointmentsSummary = {
  scheduled_today: 0,
  confirmed_today: 0,
  checked_in: 0,
  completed_today: 0,
  failed_no_show: 0,
};

function ordersQueryFilters(status: LabOrdersFilterState["status"]): LabOrdersFilterState {
  return {
    search: "",
    status,
    collectionType: "all",
    urgency: "all",
    datePreset: "month",
  };
}

export type LabDashboardMetrics = {
  pendingOrders: number;
  collectionsToday: number;
  reportsPendingUpload: number;
  readyForDelivery: number;
  ordersThisMonth: number;
  avgDailyOrders: number;
  collectionSuccessPercent: number | null;
};

export type UseLabDashboardDataResult = {
  metrics: LabDashboardMetrics;
  pendingRows: LabOrderRow[];
  pendingTotal: number;
  collectionRows: LabCollectionRow[];
  collectionsTotal: number;
  reportsPendingRows: DashboardReportPipelineRow[];
  reportsPendingTotal: number;
  readyDeliveryRows: DashboardReportPipelineRow[];
  readyDeliveryTotal: number;
  homeSummary: HomeCollectionsSummary;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  removePendingRow: (assignmentId: string) => void;
};

export function useLabDashboardData(branchLabel = ""): UseLabDashboardDataResult {
  const { data: session, status: sessionStatus } = useLabSession();
  const canFetch = sessionStatus === "success" && sessionHasOperationalAccess(session);

  const [pendingRows, setPendingRows] = useState<LabOrderRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [collectionRows, setCollectionRows] = useState<LabCollectionRow[]>([]);
  const [collectionsTotal, setCollectionsTotal] = useState(0);
  const [inProgressOrders, setInProgressOrders] = useState<LabOrderRow[]>([]);
  const [ordersThisMonth, setOrdersThisMonth] = useState(0);
  const [homeSummary, setHomeSummary] = useState<HomeCollectionsSummary>(EMPTY_HOME_SUMMARY);
  const [visitSummary, setVisitSummary] = useState<VisitAppointmentsSummary>(EMPTY_VISIT_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshKeyRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    refreshKeyRef.current += 1;
    setRefreshKey(refreshKeyRef.current);
  }, []);

  const removePendingRow = useCallback((assignmentId: string) => {
    setPendingRows((prev) => prev.filter((r) => r.assignmentId !== assignmentId));
    setPendingTotal((t) => Math.max(0, t - 1));
  }, []);

  useEffect(() => {
    if (!canFetch) {
      setLoading(sessionStatus === "pending");
      setError(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          pendingRes,
          inProgressRes,
          monthRes,
          collectionsListRes,
          collectionsSummaryRes,
          visitSummaryRes,
        ] = await Promise.all([
          fetchLabOrdersList(
            {
              filters: ordersQueryFilters("PENDING"),
              page: 1,
              pageSize: 20,
              q: "",
            },
            { signal: controller.signal },
          ),
          fetchLabOrdersList(
            {
              filters: ordersQueryFilters("IN_PROGRESS"),
              page: 1,
              pageSize: 50,
              q: "",
            },
            { signal: controller.signal },
          ),
          fetchLabOrdersList(
            {
              filters: ordersQueryFilters("all"),
              page: 1,
              pageSize: 1,
              q: "",
            },
            { signal: controller.signal },
          ),
          fetchHomeCollectionsList(
            { date_preset: "today", page: 1, page_size: 20, ordering: "-preferred_date" },
            { signal: controller.signal },
          ),
          fetchHomeCollectionsSummary("today", { signal: controller.signal }),
          fetchVisitAppointmentsSummary("today", { signal: controller.signal }),
        ]);

        if (cancelled) return;

        setPendingRows(mapLabOrderListItems(pendingRes.results, branchLabel));
        setPendingTotal(pendingRes.total);
        setInProgressOrders(mapLabOrderListItems(inProgressRes.results, branchLabel));
        setOrdersThisMonth(monthRes.total);
        setCollectionRows(collectionsListRes.results.map(mapHomeCollectionListItem));
        setCollectionsTotal(collectionsListRes.total);
        setHomeSummary(collectionsSummaryRes);
        setVisitSummary(visitSummaryRes);
      } catch (err) {
        if (cancelled || axios.isCancel(err)) return;
        setError(err instanceof Error ? err.message : "Could not load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [branchLabel, refreshKey, canFetch, sessionStatus]);

  useEffect(() => {
    if (!canFetch) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refetch();
    }, LAB_DASHBOARD_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refetch, canFetch]);

  const visitTodayTotal =
    visitSummary.scheduled_today +
    visitSummary.confirmed_today +
    visitSummary.checked_in;

  const reportPendingOrders = filterReportPendingUploadOrders(inProgressOrders);
  const reportReadyOrders = filterReportReadyOrders(inProgressOrders);

  const reportsPendingRows = reportPendingOrders.map(mapOrderToPipelineRow);
  const readyDeliveryRows = reportReadyOrders.map(mapOrderToPipelineRow);

  const dayOfMonth = new Date().getDate();

  const metrics: LabDashboardMetrics = {
    pendingOrders: pendingTotal,
    collectionsToday: collectionsTodayCount(homeSummary, visitTodayTotal),
    reportsPendingUpload: reportsPendingRows.length,
    readyForDelivery: readyDeliveryRows.length,
    ordersThisMonth,
    avgDailyOrders: avgDailyOrders(ordersThisMonth, dayOfMonth),
    collectionSuccessPercent: collectionSuccessPercent(
      homeSummary.collected_today,
      homeSummary.failed_no_response,
    ),
  };

  return {
    metrics,
    pendingRows,
    pendingTotal,
    collectionRows,
    collectionsTotal,
    reportsPendingRows,
    reportsPendingTotal: reportsPendingRows.length,
    readyDeliveryRows,
    readyDeliveryTotal: readyDeliveryRows.length,
    homeSummary,
    loading,
    error,
    refetch,
    removePendingRow,
  };
}
