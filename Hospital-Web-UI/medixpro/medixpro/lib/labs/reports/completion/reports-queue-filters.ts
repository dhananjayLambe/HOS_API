import type { CompletionFilterKey } from "@/lib/labs/reports/completion/order-lifecycle.types";
import {
  filterOrdersByWorkflow,
  searchOrders,
} from "@/lib/labs/reports/completion/order-lifecycle-queue-utils";
import type { OrderLifecycleViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { isTatBreached, isTatWithinMinutes } from "@/lib/labs/reports/tat-sla";

export type ReportsWorkflowFilter = CompletionFilterKey;

export type ReportsDatePreset = "today" | "yesterday" | "week" | "month" | "custom";

export type ReportsQueueFilterState = {
  workflow: ReportsWorkflowFilter;
  datePreset: ReportsDatePreset;
  customFrom?: string;
  customTo?: string;
  urgentOnly: boolean;
  tatBreachedOnly: boolean;
  tatSoonOnly: boolean;
  searchQ: string;
};

export const DEFAULT_REPORTS_QUEUE_FILTERS: ReportsQueueFilterState = {
  workflow: "all",
  datePreset: "today",
  urgentOnly: false,
  tatBreachedOnly: false,
  tatSoonOnly: false,
  searchQ: "",
};

export type ReportSearchIntent = {
  workflow?: ReportsWorkflowFilter;
  urgentOnly?: boolean;
  tatBreachedOnly?: boolean;
  tatSoonOnly?: boolean;
  remainingQ: string;
};

const WORKFLOW_KEYWORDS: Record<string, ReportsWorkflowFilter> = {
  pending: "pending",
  ready: "ready",
  failed: "failed",
  delivered: "delivered",
};

const URGENT_KEYWORDS = new Set(["urgent", "stat"]);
const TAT_BREACH_KEYWORDS = new Set(["tat", "breach", "breached"]);
const TAT_SOON_KEYWORDS = new Set(["tat30", "tat-soon", "tatsoon"]);

/** Deterministic search shortcuts — remaining tokens become API ?q=. */
export function parseReportSearchIntent(raw: string): ReportSearchIntent {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const remaining: string[] = [];
  const intent: ReportSearchIntent = { remainingQ: "" };

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (WORKFLOW_KEYWORDS[lower]) {
      intent.workflow = WORKFLOW_KEYWORDS[lower];
      continue;
    }
    if (URGENT_KEYWORDS.has(lower)) {
      intent.urgentOnly = true;
      continue;
    }
    if (TAT_BREACH_KEYWORDS.has(lower)) {
      intent.tatBreachedOnly = true;
      continue;
    }
    if (TAT_SOON_KEYWORDS.has(lower)) {
      intent.tatSoonOnly = true;
      continue;
    }
    remaining.push(token);
  }

  intent.remainingQ = remaining.join(" ").trim();
  return intent;
}

export function mergeSearchIntentIntoFilters(
  current: ReportsQueueFilterState,
  intent: ReportSearchIntent,
): ReportsQueueFilterState {
  return {
    ...current,
    workflow: intent.workflow ?? current.workflow,
    urgentOnly: intent.urgentOnly ?? current.urgentOnly,
    tatBreachedOnly: intent.tatBreachedOnly ?? current.tatBreachedOnly,
    tatSoonOnly: intent.tatSoonOnly ?? current.tatSoonOnly,
    searchQ: intent.remainingQ,
  };
}

function formatLocalDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function dateRangeForPreset(
  preset: ReportsDatePreset,
  custom?: { from?: string; to?: string },
): { from: Date; to: Date } {
  const today = startOfDay(new Date());

  switch (preset) {
    case "yesterday": {
      const day = new Date(today);
      day.setDate(today.getDate() - 1);
      return { from: day, to: endOfDay(day) };
    }
    case "week": {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      return { from, to: endOfDay(today) };
    }
    case "month": {
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      return { from, to: endOfDay(today) };
    }
    case "custom": {
      const fromStr = custom?.from?.trim();
      const toStr = custom?.to?.trim();
      const from = fromStr ? startOfDay(new Date(`${fromStr}T00:00:00`)) : today;
      const to = toStr ? endOfDay(new Date(`${toStr}T00:00:00`)) : endOfDay(today);
      if (Number.isNaN(from.getTime())) return { from: today, to: endOfDay(today) };
      if (Number.isNaN(to.getTime())) return { from, to: endOfDay(today) };
      return { from, to };
    }
    case "today":
    default:
      return { from: today, to: endOfDay(today) };
  }
}

function parseOperationalIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function orderOperationalUpdatedAt(order: OrderLifecycleViewModel): Date | null {
  return (
    parseOperationalIso(order.operationalUpdatedAtIso) ??
    parseOperationalIso(order.slaAnchorIso)
  );
}

export function filterOrdersByOperationalDate(
  orders: OrderLifecycleViewModel[],
  preset: ReportsDatePreset,
  custom?: { from?: string; to?: string },
): OrderLifecycleViewModel[] {
  const { from, to } = dateRangeForPreset(preset, custom);
  return orders.filter((order) => {
    const at = orderOperationalUpdatedAt(order);
    if (!at) {
      if (preset === "month") return true;
      const state = order.orderWorkflowState;
      return state === "pending_upload" || state === "partial_upload";
    }
    return at >= from && at <= to;
  });
}

function matchesUrgentToggle(order: OrderLifecycleViewModel): boolean {
  return (
    order.urgency === "STAT" ||
    order.urgency === "URGENT" ||
    order.tatState === "breached" ||
    order.tatState === "near_breach"
  );
}

function matchesTatBreachedToggle(order: OrderLifecycleViewModel): boolean {
  return order.tatState === "breached" || order.tatBreached === true;
}

function matchesTatSoonToggle(order: OrderLifecycleViewModel): boolean {
  if (order.tatState === "breached" || order.tatBreached) return false;
  const anchor = order.slaAnchorIso;
  if (!anchor) return false;
  return isTatWithinMinutes(anchor, order.urgency, 30) && !isTatBreached(anchor, order.urgency);
}

export function applyReportsQueueFilters(
  orders: OrderLifecycleViewModel[],
  state: ReportsQueueFilterState,
  options?: { clientSearch?: boolean },
): OrderLifecycleViewModel[] {
  let list = filterOrdersByOperationalDate(orders, state.datePreset, {
    from: state.customFrom,
    to: state.customTo,
  });

  list = filterOrdersByWorkflow(list, state.workflow);

  if (state.urgentOnly) {
    list = list.filter(matchesUrgentToggle);
  }
  if (state.tatBreachedOnly) {
    list = list.filter(matchesTatBreachedToggle);
  }
  if (state.tatSoonOnly) {
    list = list.filter(matchesTatSoonToggle);
  }

  const q = state.searchQ.trim();
  if (q && options?.clientSearch) {
    list = searchOrders(list, q);
  }

  return list;
}

export type ActiveFilterChip = {
  id: string;
  label: string;
};

const DATE_LABELS: Record<ReportsDatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  month: "This Month",
  custom: "Custom Range",
};

const WORKFLOW_LABELS: Record<ReportsWorkflowFilter, string> = {
  all: "All",
  pending: "Pending Upload",
  ready: "Ready Delivery",
  delivered: "Delivered",
  failed: "Failed",
  urgent: "Urgent",
};

export function buildActiveFilterChips(state: ReportsQueueFilterState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  chips.push({ id: "date", label: DATE_LABELS[state.datePreset] });

  if (state.workflow !== "all") {
    chips.push({ id: "workflow", label: WORKFLOW_LABELS[state.workflow] });
  }
  if (state.urgentOnly) {
    chips.push({ id: "urgent", label: "Urgent" });
  }
  if (state.tatBreachedOnly) {
    chips.push({ id: "tat", label: "TAT Breached" });
  }
  if (state.tatSoonOnly) {
    chips.push({ id: "tat30", label: "TAT < 30m" });
  }
  if (state.searchQ.trim()) {
    chips.push({ id: "q", label: `Search: ${state.searchQ.trim()}` });
  }

  return chips;
}

export function clearFilterChip(
  state: ReportsQueueFilterState,
  chipId: string,
): ReportsQueueFilterState {
  switch (chipId) {
    case "date":
      return { ...state, datePreset: "today", customFrom: undefined, customTo: undefined };
    case "workflow":
      return { ...state, workflow: "all" };
    case "urgent":
      return { ...state, urgentOnly: false };
    case "tat":
      return { ...state, tatBreachedOnly: false };
    case "tat30":
      return { ...state, tatSoonOnly: false };
    case "q":
      return { ...state, searchQ: "" };
    default:
      return state;
  }
}

export function workflowFilterLabel(workflow: ReportsWorkflowFilter): string {
  return WORKFLOW_LABELS[workflow];
}

export function datePresetLabel(preset: ReportsDatePreset): string {
  return DATE_LABELS[preset];
}
