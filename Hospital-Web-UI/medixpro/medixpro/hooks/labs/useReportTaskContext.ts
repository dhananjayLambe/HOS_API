"use client";

import { getReportTaskContext } from "@/lib/labs/reports/api/v1/reports-api";
import { mapReportTaskContextDto } from "@/lib/labs/reports/report-task-context";
import {
  reportTaskContextQueryKey,
  REPORT_TASKS_STALE_MS,
} from "@/lib/labs/reports/query-keys";
import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";
import { useQuery } from "@tanstack/react-query";

export function useReportTaskContext(
  branchId: string | null | undefined,
  taskId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: reportTaskContextQueryKey(branchId ?? null, taskId ?? null),
    queryFn: async ({ signal }) => {
      if (!taskId) throw new Error("Missing task id");
      const data = await getReportTaskContext(taskId, { signal });
      return mapReportTaskContextDto(data);
    },
    enabled: enabled && !!taskId,
    staleTime: REPORT_TASKS_STALE_MS,
  });
}

export type { ReportTaskContext };
