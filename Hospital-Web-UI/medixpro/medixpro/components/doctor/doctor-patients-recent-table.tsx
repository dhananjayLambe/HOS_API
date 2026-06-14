"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type RecentPatientStatus = "Active" | "Follow-up Due" | "Treatment Ongoing" | "Stable";

export type RecentPatientRow = {
  id: string;
  patientName: string;
  lastVisit: string;
  diagnosis: string;
  status: RecentPatientStatus;
};

const statusBadgeClass: Record<RecentPatientStatus, string> = {
  Active: "bg-sky-500/15 text-sky-900 dark:text-sky-100 hover:bg-sky-500/15",
  "Follow-up Due": "bg-amber-500/15 text-amber-900 dark:text-amber-100 hover:bg-amber-500/15",
  "Treatment Ongoing": "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-500/15",
  Stable: "bg-muted text-muted-foreground hover:bg-muted",
};

type DoctorPatientsRecentTableProps = {
  patients: RecentPatientRow[];
};

export function DoctorPatientsRecentTable({ patients }: DoctorPatientsRecentTableProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Patients</CardTitle>
        <CardDescription>Patients you have recently consulted</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Diagnosis</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">{patient.patientName}</TableCell>
                <TableCell className="text-muted-foreground">{patient.lastVisit}</TableCell>
                <TableCell className="max-w-[180px] truncate" title={patient.diagnosis}>
                  {patient.diagnosis}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className={cn("font-normal", statusBadgeClass[patient.status])}>
                    {patient.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
