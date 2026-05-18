import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";

/** Row container tones for operational scanability. */
export function taskRowToneClassName(status: ReportOperationalStatus): string {
  switch (status) {
    case "PENDING_UPLOAD":
      return "border-l-[3px] border-l-amber-500 border-amber-200/90 bg-amber-50/50";
    case "FAILED_DELIVERY":
      return "border-l-[3px] border-l-red-500 border-[#ECEBFF] bg-white";
    case "READY_DELIVERY":
      return "border-l-[3px] border-l-emerald-500 border-emerald-200/80 bg-emerald-50/45";
    case "UPLOADED":
      return "border-l-[3px] border-l-blue-500 border-blue-200/70 bg-blue-50/35";
    default:
      return "border-l-[3px] border-l-[#C4B5FD] border-[#ECEBFF] bg-white";
  }
}
