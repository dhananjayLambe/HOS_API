import { Button } from "@/components/ui/button";
import type { PatientSummaryPayload } from "@/lib/mock/patient-summary";

type Lab = PatientSummaryPayload["labs"][number];

function labReportStatus(lab: Lab): "Normal" | "Abnormal" | "Pending" {
  const label = lab.uploaded_label?.toLowerCase() ?? "";
  if (label.includes("pending")) return "Pending";
  if (lab.abnormal_badge) return "Abnormal";
  return "Normal";
}

export function PatientLabCard({ lab }: { lab: Lab }) {
  const status = labReportStatus(lab);
  return (
    <div className="rounded-2xl border border-slate-200/40 bg-white/90 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium tracking-tight text-slate-900">{lab.test_name}</p>
          <p className="text-xs text-slate-500">{lab.uploaded_label}</p>
          {lab.abnormal_badge ? <p className="text-xs leading-6 text-slate-600">{lab.abnormal_badge}</p> : null}
        </div>
        <p
          className={
            status === "Abnormal"
              ? "shrink-0 text-xs font-medium text-slate-600"
              : status === "Pending"
                ? "shrink-0 text-xs text-slate-500"
                : "shrink-0 text-xs text-slate-500"
          }
        >
          {status}
        </p>
      </div>
      <Button variant="ghost" className="mt-3 h-auto min-h-[44px] px-0 text-sm text-primary/70 hover:text-primary">
        Preview
      </Button>
    </div>
  );
}
