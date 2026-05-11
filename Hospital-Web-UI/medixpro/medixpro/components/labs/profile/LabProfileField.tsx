import type { ReactNode } from "react";

type LabProfileFieldProps = {
  label: string;
  value: ReactNode;
};

/** Softer hierarchy than LabDetailRow — for operator-facing profile panels. */
export function LabProfileField({ label, value }: LabProfileFieldProps) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="shrink-0 text-sm text-[#6B7280]">{label}</span>
      <div className="min-w-0 text-sm font-semibold text-[#111827] sm:text-right">{value}</div>
    </div>
  );
}
