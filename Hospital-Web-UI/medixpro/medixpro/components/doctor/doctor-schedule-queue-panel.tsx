"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ScheduleQueueSnapshot = {
  waiting: number;
  vitalsDone: number;
  readyForConsultation: number;
};

export type ScheduleQueueTokenRow = {
  id: string;
  token: string;
  patientName: string;
  status?: "waiting" | "vitals_done";
};

type QueueKpiPill = {
  label: string;
  value: number;
  valueClassName: string;
  pillClassName: string;
};

const queueStatusBadge: Record<NonNullable<ScheduleQueueTokenRow["status"]>, string> = {
  waiting: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  vitals_done: "bg-sky-500/15 text-sky-900 dark:text-sky-100",
};

const queueStatusLabel: Record<NonNullable<ScheduleQueueTokenRow["status"]>, string> = {
  waiting: "Waiting",
  vitals_done: "Vitals Done",
};

type DoctorScheduleQueuePanelProps = {
  snapshot: ScheduleQueueSnapshot;
  tokens: ScheduleQueueTokenRow[];
};

export function DoctorScheduleQueuePanel({ snapshot, tokens }: DoctorScheduleQueuePanelProps) {
  const kpiPills: QueueKpiPill[] = [
    {
      label: "Waiting",
      value: snapshot.waiting,
      valueClassName: "text-amber-600 dark:text-amber-400",
      pillClassName: "border-amber-100 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30",
    },
    {
      label: "Vitals Done",
      value: snapshot.vitalsDone,
      valueClassName: "text-sky-600 dark:text-sky-400",
      pillClassName: "border-sky-100 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/30",
    },
    {
      label: "Ready",
      value: snapshot.readyForConsultation,
      valueClassName: "text-emerald-600 dark:text-emerald-400",
      pillClassName: "border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/30",
    },
  ];

  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-2xl font-semibold">Live Queue</CardTitle>
        <CardDescription className="text-sm">Today&apos;s operational queue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6 pt-0">
        <div className="grid grid-cols-3 gap-2">
          {kpiPills.map((pill) => (
            <div
              key={pill.label}
              className={cn(
                "flex flex-col items-center rounded-xl border px-2 py-3 text-center",
                pill.pillClassName
              )}
            >
              <span className={cn("text-2xl font-bold tabular-nums", pill.valueClassName)}>{pill.value}</span>
              <span className="mt-1 text-[10px] font-medium leading-tight text-muted-foreground">
                {pill.label}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Queue order
          </p>
          <ul className="space-y-2">
            {tokens.map((token, index) => (
              <li
                key={token.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-semibold tabular-nums text-foreground">#{index + 1}</span>
                  <span className="truncate font-medium">{token.patientName}</span>
                </div>
                {token.status ? (
                  <Badge
                    variant="secondary"
                    className={cn("shrink-0 text-[10px] font-normal", queueStatusBadge[token.status])}
                  >
                    {queueStatusLabel[token.status]}
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Sidebar Smart Queue shows a quick snapshot; this is your full queue.
        </p>
      </CardContent>
    </Card>
  );
}
