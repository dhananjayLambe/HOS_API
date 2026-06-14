"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type ReportActivityItem = {
  id: string;
  description: string;
  patientName: string;
  timestamp: string;
};

type DoctorRecentReportActivityProps = {
  activity: ReportActivityItem[];
  loading?: boolean;
};

export function DoctorRecentReportActivity({ activity, loading }: DoctorRecentReportActivityProps) {
  const items = activity.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest report events for your patients</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No recent report activity.</p>
        ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border px-3 py-2">
              <p className="text-sm font-medium">{item.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.patientName} — {item.timestamp}
              </p>
            </li>
          ))}
        </ul>
        )}
      </CardContent>
    </Card>
  );
}
