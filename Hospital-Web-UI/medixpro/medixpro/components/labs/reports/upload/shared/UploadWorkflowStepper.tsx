"use client";

import { labMotion } from "@/components/labs/labDesignTokens";
import { UPLOAD_STEPPER_WRAPPER } from "@/lib/labs/reports/upload/upload-layout-styles";
import {
  getVisibleStepperSteps,
  resolveStepStatus,
  stepperIndex,
  stepperItemA11y,
  type UploadStepStatus,
} from "@/lib/labs/reports/upload/upload-stepper";
import type { UploadWorkflowStep } from "@/lib/labs/reports/upload/upload-workflow-machine";
import { canAdvance } from "@/lib/labs/reports/upload/upload-workflow-machine";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, ClipboardCheck, Eye, Loader2, Upload } from "lucide-react";

const STEP_ICONS = [Upload, Eye, ClipboardCheck] as const;

type UploadWorkflowStepperProps = {
  step: UploadWorkflowStep;
  hasTaskIdInUrl: boolean;
  submitAttempted?: boolean;
  workflowContext?: {
    fileCount: number;
  };
  stepStatusOverrides?: Partial<Record<number, UploadStepStatus>>;
  submitting?: boolean;
};

export function UploadWorkflowStepper({
  step,
  hasTaskIdInUrl,
  submitAttempted = false,
  workflowContext,
  stepStatusOverrides,
  submitting = false,
}: UploadWorkflowStepperProps) {
  const steps = getVisibleStepperSteps(hasTaskIdInUrl);
  const current = stepperIndex(step, hasTaskIdInUrl);
  if (current < 0) return null;

  const stepInvalid =
    submitAttempted &&
    step === "files" &&
    workflowContext != null &&
    !canAdvance("files", {
      hasTaskIdInUrl,
      fileCount: workflowContext.fileCount,
      verified: false,
      canUpload: true,
      submitAttempted,
    });

  const overrides = submitting
    ? { ...stepStatusOverrides, [current]: "loading" as const }
    : stepStatusOverrides;

  return (
    <div className={UPLOAD_STEPPER_WRAPPER}>
      <ol
        className="flex flex-col items-center gap-1 sm:flex-row sm:justify-start sm:gap-0"
        role="list"
      >
        {steps.map((s, i) => {
          const status = resolveStepStatus(i, current, overrides, stepInvalid && i === current);
          const Icon = STEP_ICONS[i] ?? Upload;
          const a11y = stepperItemA11y(i, current, submitAttempted, stepInvalid && i === current, status);

          return (
            <li
              key={s.id}
              className={cn(
                "flex items-center gap-2 text-xs font-medium transition-opacity duration-200",
                status === "active" && "font-semibold text-[#7C5CFC]",
                status === "completed" && "text-emerald-700",
                status === "error" && "font-semibold text-red-600",
                status === "loading" && "font-semibold text-[#7C5CFC]",
                status === "upcoming" && "text-[#9CA3AF]",
              )}
              {...a11y}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-offset-1 transition-colors duration-200",
                  status === "active" && "bg-[#7C5CFC] text-white ring-[#7C5CFC]/30",
                  status === "completed" && "bg-emerald-600 text-white ring-emerald-500/30",
                  status === "error" && "bg-red-50 text-red-600 ring-red-300",
                  status === "loading" && "bg-[#7C5CFC] text-white ring-[#7C5CFC]/30",
                  status === "upcoming" && "bg-slate-100 text-slate-400 ring-transparent",
                )}
                aria-hidden
              >
                {status === "completed" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : status === "error" ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : status === "loading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </span>
              <span className={cn("sm:hidden", status === "active" && "text-[#7C5CFC]")}>
                {s.shortLabel}
              </span>
              <span className={cn("hidden sm:inline", status === "active" && "text-[#7C5CFC]")}>
                {s.label}
              </span>
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "mx-2 hidden h-px w-8 transition-colors duration-200 sm:block sm:w-12",
                    labMotion,
                    status === "completed" ? "bg-emerald-300" : "bg-[#ECEBFF]",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
