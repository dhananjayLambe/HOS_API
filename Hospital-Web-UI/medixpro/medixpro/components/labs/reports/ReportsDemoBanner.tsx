"use client";

/** Quiet demo indicator — top-right chip, non-disruptive. */
export function ReportsDemoChip() {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border border-amber-200/60 bg-amber-50/50 px-2 py-0.5 text-[10px] font-medium text-amber-800/90"
      role="status"
      title="Sample tasks for layout review — uploads are not persisted"
    >
      Demo data
    </span>
  );
}
