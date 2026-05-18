"use client";

import type { PatientReportGroup } from "@/lib/labs/reports/group-report-tasks";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Phone } from "lucide-react";
import { PatientGroupStatusBadges } from "./PatientGroupStatusBadges";
import { ReportsWorkflowTaskRow } from "./ReportsWorkflowTaskRow";

type ReportsWorkflowPatientCardProps = {
  group: PatientReportGroup;
  expanded: boolean;
  onToggle: () => void;
  stickyTopClass?: string;
  actionLoading?: string | null;
  onPrimaryAction: (task: ReportTask, actionKey: string) => void;
  onPreview: (task: ReportTask) => void;
  onViewOrder: (task: ReportTask) => void;
};

export function ReportsWorkflowPatientCard({
  group,
  expanded,
  onToggle,
  stickyTopClass,
  actionLoading,
  onPrimaryAction,
  onPreview,
  onViewOrder,
}: ReportsWorkflowPatientCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#D8D2FF] bg-[#F3F1FF] shadow-sm ring-1 ring-[#ECEBFF]/80">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full flex-col gap-0.5 border-b border-[#E0DBFF] bg-[#EDE9FF] px-3 py-2 text-left transition-colors hover:bg-[#E4DEFF]",
          stickyTopClass,
        )}
      >
        <div className="flex w-full items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[#5B3FD9]" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[#5B3FD9]" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#111827]">
            {group.patientName}
          </span>
          {group.patientPhone ? <Phone className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden /> : null}
          <PatientGroupStatusBadges
            pendingCount={group.pendingCount}
            completedCount={group.completedCount}
          />
        </div>
        {group.progressLabel ? (
          <p className="pl-6 text-[10px] font-medium text-[#6B7280]">{group.progressLabel}</p>
        ) : null}
      </button>

      {expanded ? (
        <div className="space-y-1.5 px-2 py-1.5">
          {group.tasks.map((task) => (
            <ReportsWorkflowTaskRow
              key={task.taskId}
              task={task}
              actionLoading={actionLoading}
              onPrimaryAction={(key) => onPrimaryAction(task, key)}
              onPreview={() => onPreview(task)}
              onViewOrder={() => onViewOrder(task)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
