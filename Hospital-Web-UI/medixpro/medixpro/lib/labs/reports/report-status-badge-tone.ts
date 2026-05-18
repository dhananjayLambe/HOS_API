import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";

/** High-contrast report status pills for fast operational scanning. */
export function reportStatusBadgeClassName(status: ReportOperationalStatus): string {
  switch (status) {
    case "PENDING_UPLOAD":
      return "bg-amber-100 text-amber-950 ring-1 ring-amber-400/90 font-semibold";
    case "UPLOADED":
      return "bg-blue-100 text-blue-950 ring-1 ring-blue-400/90 font-semibold";
    case "READY_DELIVERY":
      return "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-500/90 font-semibold";
    case "FAILED_DELIVERY":
      return "bg-red-100 text-red-950 ring-1 ring-red-400/90 font-semibold";
    case "DELIVERED":
      return "bg-indigo-100 text-indigo-950 ring-1 ring-indigo-400/90 font-semibold";
    default:
      return "bg-slate-100 text-slate-800 ring-1 ring-slate-300 font-semibold";
  }
}
