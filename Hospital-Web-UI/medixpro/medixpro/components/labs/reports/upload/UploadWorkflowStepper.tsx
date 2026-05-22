"use client";

import {
  getVisibleStepperSteps,
  stepperIndex,
  stepperItemA11y,
} from "@/lib/labs/reports/upload/upload-stepper";
import type { UploadWorkflowStep } from "@/lib/labs/reports/upload/upload-workflow-machine";
import { cn } from "@/lib/utils";
import { Check, ClipboardCheck, Eye, Upload } from "lucide-react";

const STEP_ICONS = [Upload, Eye, ClipboardCheck] as const;

type UploadWorkflowStepperProps = {
  step: UploadWorkflowStep;
  hasTaskIdInUrl: boolean;
  submitAttempted?: boolean;
};

export function UploadWorkflowStepper({
  step,
  hasTaskIdInUrl,
  submitAttempted = false,
}: UploadWorkflowStepperProps) {
  const steps = getVisibleStepperSteps(hasTaskIdInUrl);
  const current = stepperIndex(step, hasTaskIdInUrl);
  if (current < 0) return null;

  return (
    <ol className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-0" role="list">
      {steps.map((s, i) => {
        const done = current > i;
        const active = current === i;
        const Icon = STEP_ICONS[i] ?? Upload;
        const a11y = stepperItemA11y(i, current, submitAttempted, false);
        return (
          <li
            key={s.id}
            className={cn(
              "flex items-center gap-2 text-xs font-medium sm:flex-1",
              active && "font-semibold text-[#4A2DB8]",
              done && "text-emerald-700",
              !active && !done && "text-[#9CA3AF]",
            )}
            {...a11y}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-offset-1",
                active && "bg-[#4A2DB8] text-white ring-[#4A2DB8]/40",
                done && "bg-emerald-600 text-white ring-emerald-500/30",
                !active && !done && "bg-slate-100 text-slate-400 ring-transparent",
              )}
              aria-hidden
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3 w-3" />}
            </span>
            <span className={cn("sm:hidden", active && "text-[#4A2DB8]")}>{s.shortLabel}</span>
            <span className={cn("hidden sm:inline", active && "text-[#4A2DB8]")}>{s.label}</span>
            {i < steps.length - 1 ? (
              <span
                className={cn(
                  "mx-2 hidden h-px flex-1 sm:block",
                  done ? "bg-emerald-300" : "bg-[#ECEBFF]",
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
