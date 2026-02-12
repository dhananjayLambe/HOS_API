"use client";

import { ClipboardList, Pill, FlaskConical } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { ConsultationWorkflowType } from "@/lib/consultation-types";

const OPTIONS: {
  value: ConsultationWorkflowType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "FULL",
    label: "Full Consultation",
    description: "Complete workflow with all sections",
    icon: <ClipboardList className="h-4 w-4 text-muted-foreground" />,
  },
  {
    value: "QUICK_RX",
    label: "Quick Prescription",
    description: "Fast workflow for minor / follow-up cases",
    icon: <Pill className="h-4 w-4 text-muted-foreground" />,
  },
  {
    value: "TEST_ONLY",
    label: "Test Only Visit",
    description: "Investigations and instructions only",
    icon: <FlaskConical className="h-4 w-4 text-muted-foreground" />,
  },
];

export interface ConsultationTypeSelectorProps {
  value: ConsultationWorkflowType;
  onChange: (value: ConsultationWorkflowType) => void;
  disabled?: boolean;
  className?: string;
}

export function ConsultationTypeSelector({
  value,
  onChange,
  disabled = false,
  className,
}: ConsultationTypeSelectorProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        Consultation Type
      </Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ConsultationWorkflowType)}
        disabled={disabled}
        className="flex flex-col sm:flex-row gap-2 sm:gap-4"
      >
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
              "hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              value === opt.value
                ? "border-primary bg-primary/5 dark:bg-primary/10"
                : "border-border bg-card",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <RadioGroupItem value={opt.value} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="flex items-center gap-2 font-medium text-sm">
                {opt.icon}
                {opt.label}
              </span>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
