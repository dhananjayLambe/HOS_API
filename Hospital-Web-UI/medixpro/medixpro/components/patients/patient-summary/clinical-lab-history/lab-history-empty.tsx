"use client";

import { ClinicalEmptyState } from "@/components/clinical";

type Props = {
  onOpenWorkspace: () => void;
};

export function LabHistoryEmpty({ onOpenWorkspace }: Props) {
  return (
    <ClinicalEmptyState
      title="No laboratory reports have been uploaded for this patient at this clinic."
      description="Reports uploaded by your laboratory will automatically appear here."
      actionLabel="Advanced Report Workspace"
      onAction={onOpenWorkspace}
    />
  );
}
