"use client";

import { Button } from "@/components/ui/button";
import type { UploadWizardStep } from "@/hooks/labs/useReportUploadWizard";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type UploadStickyBarProps = {
  step: UploadWizardStep;
  canPreview: boolean;
  canSubmit: boolean;
  submitting?: boolean;
  onSaveDraft: () => void;
  onPreview: () => void;
  onSubmit: () => void;
  onBack?: () => void;
};

function nextStepHint(step: UploadWizardStep): string | null {
  switch (step) {
    case "select_task":
      return "Select a pending task to continue.";
    case "files":
      return "Next: preview your attachments.";
    case "preview":
      return "Next: confirm and submit the report.";
    case "confirm":
      return "Verify the checklist, then submit.";
    default:
      return null;
  }
}

function primarySubmitLabel(step: UploadWizardStep): string {
  if (step === "preview") return "Continue to confirm";
  if (step === "files") return "Continue";
  return "Submit report";
}

export function UploadStickyBar({
  step,
  canPreview,
  canSubmit,
  submitting,
  onSaveDraft,
  onPreview,
  onSubmit,
  onBack,
}: UploadStickyBarProps) {
  if (step === "success") return null;

  const showSaveDraft = step !== "select_task";
  const hint = nextStepHint(step);
  const showPreviewButton = step === "files" || step === "confirm";

  return (
    <div
      className={cn(
        "mt-3 rounded-xl border border-[#ECEBFF] bg-[#FAFAFF]/95 p-3 shadow-sm",
        "ring-1 ring-[#F4F1FF]",
      )}
      role="toolbar"
      aria-label="Upload actions"
    >
      {hint ? (
        <p className="mb-2 text-xs font-medium text-[#6B7280]">
          <span className="text-[#4A2DB8]">Next step —</span> {hint.replace(/^Next:\s*/i, "")}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {onBack ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onBack}>
              Back
            </Button>
          ) : null}
          {showSaveDraft ? (
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onSaveDraft}>
              Save draft
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {showPreviewButton ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={cn("h-8 text-xs", !canPreview && "pointer-events-none opacity-40")}
              disabled={!canPreview}
              onClick={onPreview}
            >
              Preview
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="h-8 border border-[#3D2499] bg-[#4A2DB8] text-xs hover:bg-[#3D2499] disabled:opacity-40"
            disabled={!canSubmit || submitting}
            onClick={onSubmit}
          >
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {primarySubmitLabel(step)}
          </Button>
        </div>
      </div>
    </div>
  );
}
