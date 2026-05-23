"use client";

import { fetchLabOrderAssignment } from "@/lib/labs/api/fetch-lab-order-assignment";
import { extractReportApiErrorCode, isOperationalConflictCode } from "@/lib/labs/reports/api/report-api-errors";
import type { ReportDetail, ReportHistory } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import { labOrderRowPreviewFromTask } from "@/lib/labs/reports/lab-order-row-preview";
import { mergeOrderWorkflowForReportDrawer } from "@/lib/labs/reports/merge-order-report-workflow-status";
import { resolvePrimaryReportId } from "@/lib/labs/reports/resolve-primary-report-id";
import { labOrderAssignmentQueryKey } from "@/lib/labs/reports/query-keys";
import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import type { LabOrderRow } from "@/lib/labs/types";
import { useReportDetail } from "@/hooks/labs/useReportDetail";
import { useReportHistory } from "@/hooks/labs/useReportHistory";
import { useReportTaskContext } from "@/hooks/labs/useReportTaskContext";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { REPORT_DRAWER_STALE_MS } from "@/lib/labs/reports/query-keys";

export type ReportOrderDrawerPanel = {
  task: ReportTask;
  order: LabOrderRow;
  orderIsPreview: boolean;
  context: ReportTaskContext | undefined;
  detail: ReportDetail | undefined;
  history: ReportHistory | undefined;
  primaryReportId: string | null;
  loading: { order: boolean; report: boolean };
  orderError: string | null;
  reportError: string | null;
  lineageStale: boolean;
  setLineageStale: (v: boolean) => void;
  reportConflictCode: string | null;
};

export function useReportOrderDrawer(options: {
  branchId: string | null | undefined;
  branchLabel: string;
  task: ReportTask | null;
  open: boolean;
}): ReportOrderDrawerPanel | null {
  const { branchId, branchLabel, task, open } = options;
  const enabled = open && !!task;
  const [lineageStale, setLineageStale] = useState(false);
  const [reportConflictCode, setReportConflictCode] = useState<string | null>(null);

  const assignmentQuery = useQuery({
    queryKey: labOrderAssignmentQueryKey(branchId ?? null, task?.assignmentId ?? null),
    queryFn: async ({ signal }) => {
      if (!task) throw new Error("Missing task");
      if (task.orderRow) return task.orderRow;
      return fetchLabOrderAssignment(task.assignmentId, { signal, branchLabel });
    },
    enabled: enabled && !!task,
    staleTime: REPORT_DRAWER_STALE_MS,
    placeholderData: (previous) => previous,
    retry: 1,
  });

  const contextQuery = useReportTaskContext(branchId, task?.taskId ?? null, enabled);

  const primaryReportId = useMemo(
    () => resolvePrimaryReportId(contextQuery.data),
    [contextQuery.data],
  );

  const detailQuery = useReportDetail(branchId, primaryReportId, enabled && !!primaryReportId);
  const historyQuery = useReportHistory(branchId, primaryReportId, enabled && !!primaryReportId);

  const order = useMemo(() => {
    if (!task) return null;
    const base = assignmentQuery.data ?? labOrderRowPreviewFromTask(task, branchLabel);
    return mergeOrderWorkflowForReportDrawer(base, { detail: detailQuery.data, task });
  }, [assignmentQuery.data, branchLabel, detailQuery.data, task]);

  const reportQueryError = contextQuery.error ?? detailQuery.error ?? historyQuery.error;

  useEffect(() => {
    if (!reportQueryError) {
      setReportConflictCode(null);
      return;
    }
    const code = extractReportApiErrorCode(reportQueryError);
    if (code && isOperationalConflictCode(code)) {
      setReportConflictCode(code);
      setLineageStale(true);
    }
  }, [reportQueryError]);

  const reportError = reportQueryError
    ? reportQueryError instanceof Error
      ? reportQueryError.message
      : "Could not load report data."
    : null;

  if (!task || !order) return null;

  return {
    task,
    order,
    orderIsPreview: !assignmentQuery.data && !task.orderRow,
    context: contextQuery.data,
    detail: detailQuery.data,
    history: historyQuery.data,
    primaryReportId,
    loading: {
      order: assignmentQuery.isPending && !assignmentQuery.data && !task.orderRow,
      report:
        (contextQuery.isPending && !contextQuery.data) ||
        (!!primaryReportId && detailQuery.isPending && !detailQuery.data),
    },
    orderError:
      assignmentQuery.error instanceof Error ? assignmentQuery.error.message : null,
    reportError,
    lineageStale,
    setLineageStale,
    reportConflictCode,
  };
}
