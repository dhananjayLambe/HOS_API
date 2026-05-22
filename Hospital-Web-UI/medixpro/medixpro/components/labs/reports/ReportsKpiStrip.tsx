"use client";

import { labStatusCardShellCompact } from "@/components/labs/labDesignTokens";
import type { ReportKpiCounts, ReportTabKey } from "@/lib/labs/reports/report-operational-status";
import { kpiMetaFilterTokens, kpiTabChipTokens } from "@/lib/labs/reports/queue-tokens";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Clock, Send, Upload } from "lucide-react";

type KpiDef = {
  key: Exclude<ReportTabKey, "all">;
  label: string;
  value: number;
  icon: typeof Clock;
};

const KPI_DEFS: KpiDef[] = [
  { key: "pending", label: "Pending upload", value: 0, icon: Clock },
  { key: "uploaded", label: "Uploaded", value: 0, icon: Upload },
  { key: "ready", label: "Ready delivery", value: 0, icon: Send },
  { key: "delivered", label: "Delivered today", value: 0, icon: CheckCircle2 },
  { key: "failed", label: "Failed delivery", value: 0, icon: AlertCircle },
];

type ReportsKpiStripProps = {
  kpis: ReportKpiCounts;
  activeTab: ReportTabKey;
  onTabSelect: (tab: ReportTabKey) => void;
  loading?: boolean;
  urgentOnly?: boolean;
  tatOnly?: boolean;
  onToggleUrgent?: () => void;
  onToggleTat?: () => void;
};

export function ReportsKpiStrip({
  kpis,
  activeTab,
  onTabSelect,
  loading,
  urgentOnly,
  tatOnly,
  onToggleUrgent,
  onToggleTat,
}: ReportsKpiStripProps) {
  const valueByKey: Record<Exclude<ReportTabKey, "all">, number> = {
    pending: kpis.pendingUpload,
    uploaded: kpis.uploaded,
    ready: kpis.readyDelivery,
    delivered: kpis.deliveredToday,
    failed: kpis.failedDelivery,
  };

  const showMetaFilters = (kpis.urgentCount > 0 || kpis.tatBreachedCount > 0) && onToggleUrgent && onToggleTat;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 snap-x snap-mandatory md:flex-wrap md:overflow-visible"
        role="group"
        aria-label="Report KPIs"
      >
        {KPI_DEFS.map((chip) => {
          const Icon = chip.icon;
          const isActive = activeTab === chip.key;
          const tokens = kpiTabChipTokens[chip.key];
          const value = valueByKey[chip.key];
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onTabSelect(chip.key)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                labStatusCardShellCompact,
                "min-h-10 min-w-[5.5rem] shrink-0 snap-start cursor-pointer items-center gap-2 border px-2 py-1.5 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC] focus-visible:ring-offset-1",
                isActive ? tokens.activeRing : tokens.idleBorder,
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", tokens.icon)} aria-hidden />
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
                  {loading ? "—" : value}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {showMetaFilters ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Queue alert filters">
          {kpis.urgentCount > 0 ? (
            <button
              type="button"
              onClick={onToggleUrgent}
              aria-pressed={urgentOnly}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]",
                urgentOnly ? kpiMetaFilterTokens.urgent.active : kpiMetaFilterTokens.urgent.idle,
              )}
            >
              <span className={cn("tabular-nums", !urgentOnly && kpiMetaFilterTokens.urgent.value)}>
                {kpis.urgentCount}
              </span>
              Urgent
            </button>
          ) : null}
          {kpis.tatBreachedCount > 0 ? (
            <button
              type="button"
              onClick={onToggleTat}
              aria-pressed={tatOnly}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]",
                tatOnly ? kpiMetaFilterTokens.tat.active : kpiMetaFilterTokens.tat.idle,
              )}
            >
              <span className={cn("tabular-nums", !tatOnly && kpiMetaFilterTokens.tat.value)}>
                {kpis.tatBreachedCount}
              </span>
              TAT breached
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
