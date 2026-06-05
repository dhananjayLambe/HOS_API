"use client";

import { ReportTestTimeline } from "@/components/labs/reports/completion/ReportTestTimeline";
import { Button } from "@/components/ui/button";
import { useReportTimeline } from "@/hooks/labs/useReportTimeline";
import { mapReportApiErrorToMessage } from "@/lib/labs/reports/api/report-api-errors";
import type { TestWorkflowAction, TestWorkflowViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

const ACTION_LABEL: Record<TestWorkflowAction, string> = {
  UPLOAD: "Upload",
  SEND: "Send",
  VIEW: "Preview",
  REUPLOAD: "Re-upload Report",
  DOWNLOAD: "Download",
  RETRY: "Retry",
};

function workflowTone(workflow: TestWorkflowViewModel): { icon: string; label: string; className: string } {
  if (workflow.deliveryState === "FAILED") {
    return { icon: "🔴", label: "Delivery Failed", className: "border-red-200 bg-red-50 text-red-900" };
  }
  if (workflow.isReuploaded && workflow.deliveryState === "SENT") {
    return { icon: "🟢", label: "Updated Report Delivered", className: "border-emerald-200 bg-emerald-50 text-emerald-900" };
  }
  if ((workflow.isReuploaded || workflow.corrected) && workflow.deliveryState !== "SENT") {
    return { icon: "🟣", label: "Updated Report Ready", className: "border-violet-200 bg-violet-50 text-violet-900" };
  }
  if (workflow.deliveryState === "SENT") {
    return { icon: "🟢", label: "Delivered", className: "border-emerald-200 bg-emerald-50 text-emerald-900" };
  }
  if (workflow.deliveryState === "READY") {
    return { icon: "🔵", label: "Ready To Send", className: "border-blue-200 bg-blue-50 text-blue-900" };
  }
  return { icon: "🟡", label: "Pending Upload", className: "border-amber-200 bg-amber-50 text-amber-900" };
}

function actionLabel(workflow: TestWorkflowViewModel, action: TestWorkflowAction): string {
  if (action === "SEND" && (workflow.isReuploaded || workflow.corrected) && workflow.deliveryState !== "SENT") return "Resend Updated Report";
  return ACTION_LABEL[action];
}

function actionIsPrimary(action: TestWorkflowAction): boolean {
  return action === "SEND" || action === "UPLOAD" || action === "VIEW" || action === "RETRY" || action === "REUPLOAD";
}

export function TestWorkflowRow({
  branchId,
  workflow,
  loading,
  onAction,
}: {
  branchId: string | null;
  workflow: TestWorkflowViewModel;
  loading?: boolean;
  onAction: (reportId: string, action: TestWorkflowAction) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tone = workflowTone(workflow);
  const timelineQuery = useReportTimeline(branchId, workflow.reportId, expanded);
  const timelineError = timelineQuery.error
    ? mapReportApiErrorToMessage(timelineQuery.error)
    : null;

  return (
    <section className={cn("rounded-lg border px-3 py-2", tone.className)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-base" aria-hidden>{tone.icon}</span>
            <h4 className="truncate text-sm font-extrabold text-[#111827]">{workflow.testName}</h4>
            {workflow.isReuploaded ? (
              <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-bold uppercase">Updated</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs font-semibold">{tone.label}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {workflow.availableActions.map((action) => (
          <Button
            key={action}
            type="button"
            size="sm"
            variant={actionIsPrimary(action) ? "default" : "outline"}
            className={cn(
              "h-8 px-2.5 text-xs shadow-none",
              (action === "SEND" || action === "UPLOAD" || action === "VIEW" || action === "REUPLOAD") && "bg-[#7C5CFC] hover:bg-[#6B4CE0]",
            )}
            onClick={() => onAction(workflow.reportId, action)}
            disabled={loading}
          >
            {actionLabel(workflow, action)}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs text-[#6B7280]"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown className="mr-1 h-3.5 w-3.5" /> : <ChevronRight className="mr-1 h-3.5 w-3.5" />}
          Timeline
        </Button>
      </div>

      {expanded ? (
        <ReportTestTimeline
          events={timelineQuery.data ?? []}
          loading={timelineQuery.isPending}
          error={timelineError}
        />
      ) : null}
    </section>
  );
}
