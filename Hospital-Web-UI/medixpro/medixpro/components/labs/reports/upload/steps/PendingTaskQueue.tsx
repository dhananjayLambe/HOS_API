"use client";

import type { PatientReportGroup } from "@/lib/labs/reports/group-report-tasks";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { PendingTaskGroup } from "./PendingTaskGroup";

type PendingTaskQueueProps = {
  groups: PatientReportGroup[];
  tasks: ReportTask[];
  selectedTaskId: string | null;
  onSelectTask: (task: ReportTask) => void;
};

export function PendingTaskQueue({ groups, tasks, selectedTaskId, onSelectTask }: PendingTaskQueueProps) {
  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[#ECEBFF] bg-[#FAFAFF] px-4 py-8 text-center text-sm text-[#6B7280]">
        No pending report tasks match your search.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <PendingTaskGroup
          key={group.patientKey}
          group={group}
          totalPatientCount={groups.length}
          selectedTaskId={selectedTaskId}
          onSelectTask={(taskId) => {
            const task = tasks.find((t) => t.taskId === taskId);
            if (task) onSelectTask(task);
          }}
        />
      ))}
    </div>
  );
}
