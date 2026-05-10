"use client";

import { labKpiLabel, labKpiValue, labStatusCardShell } from "@/components/labs/labDesignTokens";
import { labTw } from "@/styles/lab-design-system";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type StatusCardProps = {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  className?: string;
};

/**
 * Premium KPI card — icon-first hierarchy, 24px radius, depth shadow + hover lift.
 */
export function StatusCard({ title, value, hint, icon: Icon, className }: StatusCardProps) {
  return (
    <div className={cn(labStatusCardShell, className)}>
      <div className="relative flex flex-1 flex-col gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[#7C5CFC]",
            labTw.bgIconTile
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 space-y-1">
          <p className={labKpiLabel}>{title}</p>
          <p className={labKpiValue}>{value}</p>
          {hint ? <p className="text-sm text-[#6B7280]">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
