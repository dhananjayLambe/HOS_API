"use client";

import type { PatientReportGroup } from "@/lib/labs/reports/group-report-tasks";
import { defaultGroupsCollapsed } from "@/lib/labs/reports/group-report-tasks";
import { useState } from "react";
import { PatientGroupStatusBadges } from "@/components/labs/reports/PatientGroupStatusBadges";
import { PendingTaskRow } from "./PendingTaskRow";

type PendingTaskGroupProps = {
  group: PatientReportGroup;
  totalPatientCount: number;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
};

export function PendingTaskGroup({
  group,
  totalPatientCount,
  selectedTaskId,
  onSelectTask,
}: PendingTaskGroupProps) {
  const [expanded, setExpanded] = useState(!defaultGroupsCollapsed(totalPatientCount));

  return (
    <div className="rounded-lg border border-[#F0EFFF] bg-white/80">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left"
      >
        <span className="text-sm font-semibold text-[#111827]">{group.patientName}</span>
        <PatientGroupStatusBadges
          pendingCount={group.pendingCount}
          completedCount={group.completedCount}
        />
      </button>
      {expanded ? (
        <div className="space-y-1 border-t border-[#F0EFFF] p-1.5">
          {group.tasks.map((task) => (
            <PendingTaskRow
              key={task.taskId}
              task={task}
              selected={selectedTaskId === task.taskId}
              onSelect={() => onSelectTask(task.taskId)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
