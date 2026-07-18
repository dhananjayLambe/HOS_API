"use client";

import { Input } from "@/components/ui/input";
import { ClinicalFilterChip } from "@/components/clinical";
import type { ClinicalLabStatus } from "./types";

type Props = {
  q: string;
  dateFrom: string;
  dateTo: string;
  status: ClinicalLabStatus | "";
  onQChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onStatusChange: (v: ClinicalLabStatus | "") => void;
};

const STATUS_OPTIONS: Array<{ id: ClinicalLabStatus | ""; label: string }> = [
  { id: "", label: "All" },
  { id: "AVAILABLE", label: "Available" },
  { id: "AWAITING_REPORT", label: "Awaiting" },
  { id: "UPDATED", label: "Updated" },
];

export function LabHistorySearch({
  q,
  dateFrom,
  dateTo,
  status,
  onQChange,
  onDateFromChange,
  onDateToChange,
  onStatusChange,
}: Props) {
  return (
    <div className="space-y-3">
      <Input
        value={q}
        onChange={(e) => onQChange(e.target.value)}
        placeholder="Search test, lab, category, report number…"
        className="h-11 bg-white"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="h-9 w-auto bg-white text-sm"
          aria-label="From date"
        />
        <span className="text-xs text-slate-400">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="h-9 w-auto bg-white text-sm"
          aria-label="To date"
        />
        <div className="flex flex-wrap gap-1.5 pl-1">
          {STATUS_OPTIONS.map((opt) => (
            <ClinicalFilterChip
              key={opt.id || "all"}
              label={opt.label}
              active={status === opt.id}
              onClick={() => onStatusChange(opt.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
