"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ConsultationOverview = {
  completed: number;
  followUp: number;
  newConsultations: number;
  cancelled: number;
  noShow: number;
};

type OverviewRow = {
  label: string;
  value: number;
};

type DoctorConsultationOverviewProps = {
  consultations: ConsultationOverview;
};

export function DoctorConsultationOverview({ consultations }: DoctorConsultationOverviewProps) {
  const rows: OverviewRow[] = [
    { label: "Completed Consultations", value: consultations.completed },
    { label: "Follow-Up Consultations", value: consultations.followUp },
    { label: "New Consultations", value: consultations.newConsultations },
    { label: "Cancelled Appointments", value: consultations.cancelled },
    { label: "No Show Appointments", value: consultations.noShow },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consultation Overview</CardTitle>
        <CardDescription>Consultation and appointment metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="text-muted-foreground">{row.label}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
