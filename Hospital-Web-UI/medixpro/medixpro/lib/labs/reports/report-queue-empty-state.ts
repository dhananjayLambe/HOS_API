import type { ReportTabKey } from "@/lib/labs/reports/report-operational-status";

export type QueueEmptyStateKind = "load_error" | "no_tasks" | "tab_empty" | "search_empty" | null;

export type QueueEmptyStateInput = {
  isError: boolean;
  totalTaskCount: number;
  filteredTaskCount: number;
  tab: ReportTabKey;
  searchQuery: string;
};

const TAB_EMPTY_COPY: Record<Exclude<ReportTabKey, "all">, string> = {
  pending: "No pending uploads in this queue.",
  uploaded: "No uploaded reports awaiting review.",
  ready: "No reports ready for delivery.",
  delivered: "No reports delivered today.",
  failed: "No failed deliveries right now.",
};

export type QueueEmptyStateResolved = {
  kind: QueueEmptyStateKind;
  title: string;
  description?: string;
};

export function resolveQueueEmptyState(input: QueueEmptyStateInput): QueueEmptyStateResolved | null {
  if (input.isError) {
    return {
      kind: "load_error",
      title: "Could not load report queue",
      description: "Check your connection and try again.",
    };
  }

  const search = input.searchQuery.trim();
  if (search && input.filteredTaskCount === 0) {
    return {
      kind: "search_empty",
      title: `No matches for "${search}"`,
      description: "Try another patient name, phone, order number, or test.",
    };
  }

  if (input.totalTaskCount === 0) {
    return {
      kind: "no_tasks",
      title: "No report tasks right now",
      description: "New assignments will appear here when patients have tests awaiting reports.",
    };
  }

  if (input.filteredTaskCount === 0 && input.tab !== "all") {
    return {
      kind: "tab_empty",
      title: TAB_EMPTY_COPY[input.tab],
    };
  }

  if (input.filteredTaskCount === 0) {
    return {
      kind: "tab_empty",
      title: "No tasks match this filter.",
    };
  }

  return null;
}
