"use client";

import { labBtnPrimary } from "@/components/labs/labDesignTokens";
import { Button } from "@/components/ui/button";
import {
  UPLOAD_FOOTER_INNER,
  UPLOAD_FOOTER_LEFT,
  UPLOAD_FOOTER_RIGHT,
} from "@/lib/labs/reports/upload/upload-layout-styles";
import {
  getUploadPrimaryButtonLabel,
  getUploadSecondaryDisabledHint,
  isUploadPrimaryEnabled,
  UPLOAD_ACTION_BAR_CLASSNAME,
} from "@/lib/labs/reports/upload/upload-validation-messages";
import type { UploadWorkflowContext, UploadWorkflowStep } from "@/lib/labs/reports/upload/upload-workflow-machine";
import { getPrimaryActionForStep } from "@/lib/labs/reports/upload/upload-workflow-machine";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useId } from "react";

type UploadWorkflowActionBarProps = {
  step: UploadWorkflowStep;
  workflowContext: UploadWorkflowContext;
  submitting?: boolean;
  embedded?: boolean;
  onSaveDraft: () => void;
  onPrimary: () => void;
  onBack?: () => void;
};

export function UploadWorkflowActionBar({
  step,
  workflowContext,
  submitting,
  embedded = false,
  onSaveDraft,
  onPrimary,
  onBack,
}: UploadWorkflowActionBarProps) {
  if (step === "success" || step === "select_task") return null;

  const reasonId = useId();
  const input = { ...workflowContext, step };
  const enabled = isUploadPrimaryEnabled(input);
  const secondaryHint = getUploadSecondaryDisabledHint(input);
  const label = getUploadPrimaryButtonLabel(step);
  const action = getPrimaryActionForStep(step);
  const displayLabel =
    submitting && action === "upload" ? "Uploading reports…" : label;

  return (
    <div
      className={cn(!embedded && UPLOAD_ACTION_BAR_CLASSNAME)}
      role="toolbar"
      aria-label="Upload actions"
    >
      <div className={UPLOAD_FOOTER_INNER}>
        <div className={UPLOAD_FOOTER_LEFT}>
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 min-h-9 gap-1 px-2 text-sm sm:px-3"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Back</span>
              <span className="sr-only sm:hidden">Back</span>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-9 min-h-9 px-2 text-sm text-[#6B7280] underline-offset-2 hover:text-[#111827] sm:hidden"
            onClick={onSaveDraft}
          >
            Save draft
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden h-9 min-h-9 text-sm sm:inline-flex"
            onClick={onSaveDraft}
          >
            Save draft
          </Button>
        </div>

        <div className={UPLOAD_FOOTER_RIGHT}>
          {!enabled && secondaryHint ? (
            <p id={reasonId} className="text-xs text-[#6B7280] sm:text-right">
              {secondaryHint}
            </p>
          ) : null}
          {action ? (
            <Button
              type="button"
              size="sm"
              className={cn(
                labBtnPrimary,
                "h-9 min-h-9 w-full text-sm disabled:opacity-60 disabled:saturate-50 sm:w-auto",
              )}
              disabled={!enabled || submitting}
              aria-describedby={!enabled && secondaryHint ? reasonId : undefined}
              onClick={onPrimary}
            >
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
              {displayLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
