"use client";

import { getReportDetail } from "@/lib/labs/reports/api/v1/reports-api";
import { mapReportDetailDto, type ReportDetail } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import {
  reportDetailQueryKey,
  REPORT_TASKS_STALE_MS,
} from "@/lib/labs/reports/query-keys";
import { trackReportEvent } from "@/lib/labs/reports/report-monitoring";
import { useQuery } from "@tanstack/react-query";

export function useReportDetail(
  branchId: string | null | undefined,
  reportId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: reportDetailQueryKey(branchId ?? null, reportId ?? null),
    queryFn: async ({ signal }) => {
      if (!reportId) throw new Error("Missing report id");
      const data = await getReportDetail(reportId, { signal });
      return mapReportDetailDto(data);
    },
    enabled: enabled && !!reportId,
    staleTime: REPORT_TASKS_STALE_MS,
    retry: 1,
    meta: {
      onError: () => trackReportEvent("queue_fetch_fail", { reportId: reportId ?? undefined }),
    },
  });
}

export type { ReportDetail };
