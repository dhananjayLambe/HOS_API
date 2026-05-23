"use client";

import { getReportHistory } from "@/lib/labs/reports/api/v1/reports-api";
import { mapReportHistoryDto, type ReportHistory } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import { reportHistoryQueryKey, REPORT_DRAWER_STALE_MS } from "@/lib/labs/reports/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useReportHistory(
  branchId: string | null | undefined,
  reportId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: reportHistoryQueryKey(branchId ?? null, reportId ?? null),
    queryFn: async ({ signal }) => {
      if (!reportId) throw new Error("Missing report id");
      const data = await getReportHistory(reportId, { signal });
      return mapReportHistoryDto(data);
    },
    enabled: enabled && !!reportId,
    staleTime: REPORT_DRAWER_STALE_MS,
    placeholderData: (previous) => previous,
    retry: 1,
  });
}

export type { ReportHistory };
