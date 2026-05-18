"use client";

import { labStatusCardShellCompact } from "@/components/labs/labDesignTokens";
import type { ReportKpiCounts, ReportTabKey } from "@/lib/labs/reports/report-operational-status";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Clock, Send, Upload } from "lucide-react";

type KpiDef = {
  key: Exclude<ReportTabKey, "all">;
  label: string;
  value: number;
  icon: typeof Clock;
  colorClass: string;
};

type ReportsKpiStripProps = {
  kpis: ReportKpiCounts;
  activeTab: ReportTabKey;
  onTabSelect: (tab: ReportTabKey) => void;
  loading?: boolean;
};

export function ReportsKpiStrip({ kpis, activeTab, onTabSelect, loading }: ReportsKpiStripProps) {
  const chips: KpiDef[] = [
    { key: "pending", label: "Pending upload", value: kpis.pendingUpload, icon: Clock, colorClass: "text-amber-600" },
    { key: "uploaded", label: "Uploaded", value: kpis.uploaded, icon: Upload, colorClass: "text-blue-600" },
    { key: "ready", label: "Ready delivery", value: kpis.readyDelivery, icon: Send, colorClass: "text-emerald-600" },
    { key: "delivered", label: "Delivered today", value: kpis.deliveredToday, icon: CheckCircle2, colorClass: "text-indigo-600" },
    { key: "failed", label: "Failed delivery", value: kpis.failedDelivery, icon: AlertCircle, colorClass: "text-red-600" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Report KPIs">
      {chips.map((chip) => {
        const Icon = chip.icon;
        const isActive = activeTab === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onTabSelect(chip.key)}
            className={cn(
              labStatusCardShellCompact,
              "min-w-[5.5rem] cursor-pointer items-center gap-2 border px-2 py-1.5 text-left transition-shadow hover:shadow-md",
              isActive
                ? "border-[#7C5CFC] bg-[#F4F1FF] shadow-sm ring-1 ring-[#7C5CFC]/25"
                : "border-[#ECEBFF] bg-white",
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 shrink-0", chip.colorClass)} aria-hidden />
            <span className="flex min-w-0 flex-col leading-none">
              <span
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-wider",
                  isActive ? "text-[#5B3FD9]" : "text-[#9CA3AF]",
                )}
              >
                {chip.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-lg tabular-nums text-[#111827]",
                  isActive ? "font-extrabold" : "font-bold",
                )}
              >
                {loading ? "—" : chip.value}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
