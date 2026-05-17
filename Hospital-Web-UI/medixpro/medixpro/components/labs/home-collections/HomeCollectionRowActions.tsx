"use client";

import { Button } from "@/components/ui/button";
import type { HomeCollectionActionKey } from "@/lib/labs/api/home-collections-types";
import type { LabCollectionRow } from "@/lib/labs/types";

type Props = {
  row: LabCollectionRow;
  busy?: boolean;
  onAssign: (row: LabCollectionRow) => void;
  onStart: (row: LabCollectionRow) => void;
  onCollect: (row: LabCollectionRow) => void;
  onFail: (row: LabCollectionRow) => void;
  onRetry: (row: LabCollectionRow) => void;
};

export function HomeCollectionRowActions({
  row,
  busy,
  onAssign,
  onStart,
  onCollect,
  onFail,
  onRetry,
}: Props) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const actions = row.allowedActions;

  const btn = (
    key: HomeCollectionActionKey,
    label: string,
    onClick: () => void,
    variant: "default" | "secondary" = "default",
  ) => {
    if (!actions.includes(key)) return null;
    return (
      <Button
        type="button"
        size="sm"
        variant={variant}
        disabled={busy}
        onClick={(e) => {
          stop(e);
          onClick();
        }}
      >
        {label}
      </Button>
    );
  };

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {btn("assign", "Assign", () => onAssign(row))}
      {btn("start", "Start Collection", () => onStart(row))}
      {btn("collect", "Mark Collected", () => onCollect(row))}
      {btn("fail", "Mark Failed", () => onFail(row), "secondary")}
      {btn("retry", "Retry", () => onRetry(row))}
      {actions.includes("view_execution") ? (
        <Button type="button" size="sm" variant="secondary" disabled title="Execution dashboard coming in a later phase">
          View Execution
        </Button>
      ) : null}
    </div>
  );
}
