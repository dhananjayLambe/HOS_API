"use client";

import { getReportTimeline } from "@/lib/labs/reports/api/v1/reports-api";
import { buildReportTimelineEvents } from "@/lib/labs/reports/completion/build-report-timeline";
import { reportTimelineQueryKey, REPORT_DRAWER_STALE_MS } from "@/lib/labs/reports/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useReportTimeline(
  branchId: string | null | undefined,
  reportId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: reportTimelineQueryKey(branchId ?? null, reportId ?? null),
    queryFn: async ({ signal }) => {
      if (!reportId) throw new Error("Missing report id");
      const data = await getReportTimeline(reportId, { signal });
      return buildReportTimelineEvents(data.events);
    },
    enabled: enabled && !!reportId,
    staleTime: REPORT_DRAWER_STALE_MS,
    placeholderData: (previous) => previous,
    retry: 1,
  });
}
