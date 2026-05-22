import { groupChipTokens } from "@/lib/labs/reports/queue-tokens";

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
        <span className={groupChipTokens.pending}>
          {pendingCount} pending
        </span>
      ) : null}
      {completedCount > 0 ? (
        <span className={groupChipTokens.completed}>
          {completedCount} completed
        </span>
      ) : null}
    </div>
  );
}
