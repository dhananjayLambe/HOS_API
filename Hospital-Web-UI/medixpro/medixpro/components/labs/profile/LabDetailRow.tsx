import type { ReactNode } from "react";

type LabDetailRowProps = {
  label: string;
  value: ReactNode;
};

export function LabDetailRow({ label, value }: LabDetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/50 py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="min-w-0 break-words text-sm font-medium text-foreground sm:text-right">{value}</div>
    </div>
  );
}
