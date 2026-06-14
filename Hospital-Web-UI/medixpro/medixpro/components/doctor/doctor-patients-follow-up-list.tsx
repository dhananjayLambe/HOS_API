"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type FollowUpPatientRow = {
  id: string;
  patientName: string;
  lastVisitAgo: string;
};

type DoctorPatientsFollowUpListProps = {
  patients: FollowUpPatientRow[];
};

export function DoctorPatientsFollowUpList({ patients }: DoctorPatientsFollowUpListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-Up Patients</CardTitle>
        <CardDescription>Patients requiring follow-up attention</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {patients.map((patient) => (
            <li
              key={patient.id}
              className="rounded-md border px-3 py-2"
            >
              <p className="text-sm font-medium">{patient.patientName}</p>
              <p className="text-xs text-muted-foreground">Last Visit: {patient.lastVisitAgo}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
