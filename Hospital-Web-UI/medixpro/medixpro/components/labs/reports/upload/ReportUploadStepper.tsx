"use client";

import type { UploadWizardStep } from "@/hooks/labs/useReportUploadWizard";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS: { id: UploadWizardStep; label: string }[] = [
  { id: "select_task", label: "Select task" },
  { id: "files", label: "Upload files" },
  { id: "preview", label: "Preview" },
  { id: "confirm", label: "Confirm" },
];

function stepIndex(step: UploadWizardStep): number {
  if (step === "success") return 4;
  return STEPS.findIndex((s) => s.id === step);
}

type ReportUploadStepperProps = {
  step: UploadWizardStep;
};

export function ReportUploadStepper({ step }: ReportUploadStepperProps) {
  const current = stepIndex(step);

  return (
    <ol className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-0">
      {STEPS.map((s, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <li
            key={s.id}
            className={cn(
              "flex items-center gap-2 text-xs font-medium sm:flex-1",
              active && "font-semibold text-[#4A2DB8]",
              done && "text-emerald-700",
              !active && !done && "text-[#9CA3AF]",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-offset-1",
                active && "bg-[#4A2DB8] text-white ring-[#4A2DB8]/40",
                done && "bg-emerald-600 text-white ring-emerald-500/30",
                !active && !done && "bg-slate-100 text-slate-400 ring-transparent",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span className={cn("hidden sm:inline", active && "text-[#4A2DB8]")}>{s.label}</span>
            {i < STEPS.length - 1 ? (
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
