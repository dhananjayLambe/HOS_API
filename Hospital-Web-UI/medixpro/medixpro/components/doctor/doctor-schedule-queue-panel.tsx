"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ScheduleQueueSnapshot = {
  waiting: number;
  completed: number;
  cancelled: number;
  noShow: number;
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
  loading?: boolean;
};

export function DoctorScheduleQueuePanel({ snapshot, tokens, loading }: DoctorScheduleQueuePanelProps) {
  const kpiPills: QueueKpiPill[] = [
    {
      label: "In Queue",
      value: snapshot.waiting,
      valueClassName: "text-amber-600 dark:text-amber-400",
      pillClassName: "border-amber-100 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30",
    },
    {
      label: "Completed",
      value: snapshot.completed,
      valueClassName: "text-emerald-600 dark:text-emerald-400",
      pillClassName: "border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/30",
    },
    {
      label: "Cancelled",
      value: snapshot.cancelled,
      valueClassName: "text-slate-600 dark:text-slate-400",
      pillClassName: "border-slate-200 bg-muted/40 dark:border-slate-800",
    },
    {
      label: "No Show",
      value: snapshot.noShow,
      valueClassName: "text-rose-600 dark:text-rose-400",
      pillClassName: "border-rose-100 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/30",
    },
  ];

  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-2xl font-semibold">Live Queue</CardTitle>
        <CardDescription className="text-sm">Today&apos;s operational queue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6 pt-0">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-xl" />
              ))
            : kpiPills.map((pill) => (
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
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              No patients in queue.
            </p>
          ) : (
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
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Sidebar Smart Queue shows a quick snapshot; this is your full queue.
        </p>
      </CardContent>
    </Card>
  );
}
