"use client";

import { FlaskConical, Clock3, Building2, CalendarDays } from "lucide-react";
import type { ClinicalLabHistorySummary } from "./types";

type Props = {
  summary: ClinicalLabHistorySummary | undefined;
  loading?: boolean;
};

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof FlaskConical;
}) {
  return (
    <div className="rounded-xl border border-slate-200/50 bg-white/90 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className="h-3.5 w-3.5 text-slate-400" />
      </div>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export function LabHistoryKpiStrip({ summary, loading }: Props) {
  const pending = loading ? "—" : (summary?.pending ?? 0);
  const total = loading ? "—" : (summary?.totalReports ?? 0);
  const latestDate = loading ? "—" : summary?.latestDate || "—";
  const latestLab = loading ? "—" : summary?.latestLab || "—";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Total Reports" value={total} icon={FlaskConical} />
      <Kpi label="Pending Tests" value={pending} icon={Clock3} />
      <Kpi label="Last Report" value={latestDate} icon={CalendarDays} />
      <Kpi label="Latest Lab" value={latestLab} icon={Building2} />
    </div>
  );
}
