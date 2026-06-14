"use client";

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

type QueueCountRow = {
  label: string;
  value: number;
  className?: string;
};

type DoctorScheduleQueuePanelProps = {
  snapshot: ScheduleQueueSnapshot;
  tokens: ScheduleQueueTokenRow[];
};

export function DoctorScheduleQueuePanel({ snapshot, tokens }: DoctorScheduleQueuePanelProps) {
  const countRows: QueueCountRow[] = [
    { label: "Waiting", value: snapshot.waiting, className: "text-amber-600 dark:text-amber-400" },
    { label: "Vitals Done", value: snapshot.vitalsDone, className: "text-sky-600 dark:text-sky-400" },
    {
      label: "Ready For Consultation",
      value: snapshot.readyForConsultation,
      className: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Queue Overview</CardTitle>
        <CardDescription>Full operational view of today&apos;s queue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {countRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className={cn("text-lg font-semibold tabular-nums", row.className)}>{row.value}</span>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Queue order
          </p>
          <ul className="space-y-2">
            {tokens.map((token) => (
              <li
                key={token.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-medium">{token.token}</span>
                <span className="text-muted-foreground">{token.patientName}</span>
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
