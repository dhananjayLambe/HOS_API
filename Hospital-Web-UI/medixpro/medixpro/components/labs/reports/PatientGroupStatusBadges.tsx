type PatientGroupStatusBadgesProps = {
  pendingCount: number;
  completedCount: number;
  className?: string;
};

/** Patient header chips: pending upload vs delivered (completed). */
export function PatientGroupStatusBadges({
  pendingCount,
  completedCount,
  className,
}: PatientGroupStatusBadgesProps) {
  if (pendingCount <= 0 && completedCount <= 0) return null;

  return (
    <div className={`flex shrink-0 flex-wrap items-center justify-end gap-1 ${className ?? ""}`}>
      {pendingCount > 0 ? (
        <span className="rounded-md bg-amber-200/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
          {pendingCount} pending
        </span>
      ) : null}
      {completedCount > 0 ? (
        <span className="rounded-md bg-emerald-200/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950">
          {completedCount} completed
        </span>
      ) : null}
    </div>
  );
}
