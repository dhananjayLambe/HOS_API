"use client";

import { recomputeOrderDerived } from "@/lib/labs/reports/completion/next-action-engine";
import {
  buildUploadToastMessage,
  mergeArtifactsIntoReport,
  reuploadReportVersion,
  type StagedArtifactInput,
} from "@/lib/labs/reports/completion/completion-artifact-staging";
import {
  ORDER_LIFECYCLE_DEMO_ORDERS,
  buildAttentionItems,
  computeCompletionKpis,
  countReadyToSendReports,
  filterOrdersByChip,
  getCompletedToday,
  groupOrdersByPatient,
  searchOrders,
  sortActiveOrders,
} from "@/lib/labs/reports/completion/order-lifecycle-demo";
import type {
  CompletionFilterKey,
  OrderLifecycleViewModel,
} from "@/lib/labs/reports/completion/order-lifecycle.types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const PATIENT_GROUP_EXPANDED_STORAGE_KEY = "reports.patientGroups.expanded";

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

export function useOrderCompletionQueue() {
  const [orders, setOrders] = useState<OrderLifecycleViewModel[]>(() => [...ORDER_LIFECYCLE_DEMO_ORDERS]);
  const [searchInput, setSearchInput] = useState("");
  const [filter, setFilter] = useState<CompletionFilterKey>("all");
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [actionLoadingTaskId, setActionLoadingTaskId] = useState<string | null>(null);
  const [expandedPatientKeys, setExpandedPatientKeys] = useState<Set<string>>(() => new Set());
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  const debouncedSearch = useDebounced(searchInput, 150);

  const activeOrders = useMemo(() => sortActiveOrders(orders.filter((o) => !o.isFullyComplete)), [orders]);
  const completedToday = useMemo(() => getCompletedToday(orders), [orders]);

  const filteredActive = useMemo(() => {
    const source = filter === "delivered" ? completedToday : activeOrders;
    let list = filterOrdersByChip(source, filter);
    list = searchOrders(list, debouncedSearch);
    return list;
  }, [activeOrders, completedToday, filter, debouncedSearch]);

  const groups = useMemo(() => groupOrdersByPatient(filteredActive), [filteredActive]);
  const attentionItems = useMemo(() => buildAttentionItems(activeOrders), [activeOrders]);
  const kpis = useMemo(() => computeCompletionKpis(activeOrders), [activeOrders]);
  const readyToSendCount = useMemo(() => countReadyToSendReports(activeOrders), [activeOrders]);

  const getOrder = useCallback(
    (taskId: string) => orders.find((o) => o.taskId === taskId) ?? null,
    [orders],
  );

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

  const patchOrder = useCallback((taskId: string, patch: (o: OrderLifecycleViewModel) => OrderLifecycleViewModel) => {
    setOrders((prev) =>
      prev.map((o) => (o.taskId === taskId ? recomputeOrderDerived(patch(o)) : o)),
    );
  }, []);

  const showInCardToast = useCallback(
    (taskId: string, message: string) => {
      patchOrder(taskId, (o) => ({ ...o, inCardToast: message }));
    },
    [patchOrder],
  );

  const dismissToast = useCallback(
    (taskId: string) => {
      patchOrder(taskId, (o) => ({ ...o, inCardToast: undefined }));
    },
    [patchOrder],
  );

  const markReportUploaded = useCallback(
    (taskId: string, reportId: string, artifacts: StagedArtifactInput[]) => {
      patchOrder(taskId, (o) => {
        const report = o.reports.find((r) => r.reportId === reportId);
        const testLabel = report?.testLabel ?? "Report";
        return {
          ...o,
          reports: o.reports.map((r) =>
            r.reportId === reportId ? mergeArtifactsIntoReport(r, artifacts) : r,
          ),
          inCardToast: buildUploadToastMessage(testLabel, artifacts),
          lastActivity: { atLabel: "just now", byName: "You" },
        };
      });
    },
    [patchOrder],
  );

  const markReportsSent = useCallback(
    (taskId: string, reportIds: string[]) => {
      patchOrder(taskId, (o) => ({
        ...o,
        deliveryFailure: undefined,
        reports: o.reports.map((r) =>
          reportIds.includes(r.reportId)
            ? {
                ...r,
                status: "sent" as const,
                deliveryState: "sent" as const,
                versions: r.versions.map((version) =>
                  version.isLatest
                    ? { ...version, status: "sent" as const, deliveryState: "sent" as const }
                    : version,
                ),
                lastUpdatedAtLabel: "just now",
                lastUpdatedByName: "You",
              }
            : r,
        ),
        lastActivity: { atLabel: "just now", byName: "You" },
      }));
    },
    [patchOrder],
  );

  const clearDeliveryFailure = useCallback(
    (taskId: string) => {
      patchOrder(taskId, (o) => ({
        ...o,
        deliveryFailure: undefined,
        reports: o.reports.map((r) =>
          r.status === "failed" || r.status === "failed_delivery" || r.deliveryState === "failed"
            ? { ...r, status: "ready" as const, deliveryState: "not_sent" as const }
            : r,
        ),
      }));
    },
    [patchOrder],
  );

  const reuploadReport = useCallback(
    (
      taskId: string,
      reportId: string,
      artifacts: StagedArtifactInput[],
      options: { reason: string },
    ) => {
      patchOrder(taskId, (o) => {
        const report = o.reports.find((r) => r.reportId === reportId);
        const testLabel = report?.testLabel ?? "Report";
        return {
          ...o,
          reports: o.reports.map((r) =>
            r.reportId === reportId ? reuploadReportVersion(r, artifacts, options) : r,
          ),
          inCardToast: `${testLabel} updated report saved. Resend when ready.`,
          lastActivity: { atLabel: "just now", byName: "You" },
        };
      });
    },
    [patchOrder],
  );

  const updatePhone = useCallback(
    (taskId: string, phone: string) => {
      patchOrder(taskId, (o) => ({
        ...o,
        patientPhone: phone,
        deliveryFailure: o.deliveryFailure ? { ...o.deliveryFailure, phone } : undefined,
      }));
    },
    [patchOrder],
  );

  const jumpToCard = useCallback(
    (taskId: string) => {
      const order = orders.find((o) => o.taskId === taskId);
      if (order) setPatientGroupExpanded(order.patientKey, true);
      setHighlightedTaskId(taskId);
      window.setTimeout(() => {
        const el = cardRefs.current[taskId];
        el?.scrollIntoView({ behavior: "auto", block: "center" });
      }, 50);
      window.setTimeout(() => setHighlightedTaskId(null), 2000);
    },
    [orders, setPatientGroupExpanded],
  );

  const sendAllReady = useCallback(() => {
    setActionLoadingTaskId("batch");
    for (const order of activeOrders) {
      const readyIds = order.reports.filter((r) => r.status === "ready").map((r) => r.reportId);
      if (readyIds.length) {
        markReportsSent(order.taskId, readyIds);
        showInCardToast(order.taskId, `${readyIds.length} report(s) sent`);
      }
    }
    window.setTimeout(() => setActionLoadingTaskId(null), 300);
  }, [activeOrders, markReportsSent, showInCardToast]);

  return {
    orders,
    groups,
    completedToday,
    attentionItems,
    kpis,
    readyToSendCount,
    searchInput,
    setSearchInput,
    filter,
    setFilter,
    highlightedTaskId,
    actionLoadingTaskId,
    setActionLoadingTaskId,
    expandedPatientKeys,
    setPatientGroupExpanded,
    togglePatientGroup,
    cardRefs,
    getOrder,
    showInCardToast,
    dismissToast,
    markReportUploaded,
    markReportsSent,
    clearDeliveryFailure,
    reuploadReport,
    updatePhone,
    jumpToCard,
    sendAllReady,
  };
}
