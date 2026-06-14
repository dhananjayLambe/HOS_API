"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type ReportActivityItem = {
  id: string;
  description: string;
  patientName: string;
  timestamp: string;
};

type DoctorRecentReportActivityProps = {
  activity: ReportActivityItem[];
};

export function DoctorRecentReportActivity({ activity }: DoctorRecentReportActivityProps) {
  const items = activity.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest report events for your patients</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
