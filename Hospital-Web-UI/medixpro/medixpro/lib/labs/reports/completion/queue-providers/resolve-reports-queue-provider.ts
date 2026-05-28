import { demoQueueProvider } from "@/lib/labs/reports/completion/queue-providers/demo-queue-provider";
import { liveQueueProvider } from "@/lib/labs/reports/completion/queue-providers/live-queue-provider";
import type { ReportsQueueProvider } from "@/lib/labs/reports/completion/queue-providers/types";
import { isReportsDemoForced } from "@/lib/labs/reports/reports-demo-queue";

/** Select queue provider at route boundary — never inside operational hooks. */
export function resolveReportsQueueProvider(
  searchParams: Pick<URLSearchParams, "get"> | null | undefined,
): ReportsQueueProvider {
  if (isReportsDemoForced(searchParams)) return demoQueueProvider;
  return liveQueueProvider;
}
