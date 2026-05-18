"use client";

import {
  labKpiLabel,
  labKpiValue,
  labStatusCardShell,
  labStatusCardShellCompact,
} from "@/components/labs/labDesignTokens";
import { labTw } from "@/styles/lab-design-system";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type StatusCardProps = {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  className?: string;
  dense?: boolean;
};

export function StatusCard({ title, value, hint, icon: Icon, className, dense }: StatusCardProps) {
  if (dense) {
    return (
      <div
        className={cn(labStatusCardShellCompact, "gap-2.5 px-3 py-2", className)}
        title={hint}
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#7C5CFC]",
            labTw.bgIconTile,
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-none text-[#6B7280]">{title}</p>
          <p className="mt-1 text-2xl font-bold leading-none tracking-tight text-[#111827]">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(labStatusCardShell, className)}>
      <div className="relative flex flex-1 flex-col gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[#7C5CFC]",
            labTw.bgIconTile,
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
