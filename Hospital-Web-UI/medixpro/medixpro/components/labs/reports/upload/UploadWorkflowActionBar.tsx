"use client";

import { Button } from "@/components/ui/button";
import {
  getUploadPrimaryButtonLabel,
  getUploadPrimaryDisabledReason,
  isUploadPrimaryEnabled,
  UPLOAD_ACTION_BAR_CLASSNAME,
} from "@/lib/labs/reports/upload/upload-validation-messages";
import type { UploadWorkflowContext, UploadWorkflowStep } from "@/lib/labs/reports/upload/upload-workflow-machine";
import { getPrimaryActionForStep } from "@/lib/labs/reports/upload/upload-workflow-machine";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useId } from "react";

type UploadWorkflowActionBarProps = {
  step: UploadWorkflowStep;
  workflowContext: UploadWorkflowContext;
  submitting?: boolean;
  onSaveDraft: () => void;
  onPrimary: () => void;
  onBack?: () => void;
};

export function UploadWorkflowActionBar({
  step,
  workflowContext,
  submitting,
  onSaveDraft,
  onPrimary,
  onBack,
}: UploadWorkflowActionBarProps) {
  if (step === "success" || step === "select_task") return null;

  const reasonId = useId();
  const input = { ...workflowContext, step };
  const enabled = isUploadPrimaryEnabled(input);
  const disabledReason = getUploadPrimaryDisabledReason(input);
  const label = getUploadPrimaryButtonLabel(step);
  const action = getPrimaryActionForStep(step);
  const displayLabel =
    submitting && action === "upload" ? "Uploading reports…" : label;

  return (
    <div
      className={cn(UPLOAD_ACTION_BAR_CLASSNAME, "px-4 py-3")}
      role="toolbar"
      aria-label="Upload actions"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {onBack ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onBack}>
              Back
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onSaveDraft}>
            Save draft
          </Button>
        </div>
        <div className="flex min-w-0 flex-col items-end gap-1">
          {!enabled && disabledReason ? (
            <p id={reasonId} className="text-right text-[10px] text-[#6B7280]">
              {disabledReason}
            </p>
          ) : null}
          {action ? (
            <Button
              type="button"
              size="sm"
              className="h-8 border border-[#3D2499] bg-[#4A2DB8] text-xs hover:bg-[#3D2499] disabled:opacity-50"
              disabled={!enabled || submitting}
              aria-describedby={!enabled && disabledReason ? reasonId : undefined}
              onClick={onPrimary}
            >
              {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              {displayLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
