"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type FollowUpPatientRow = {
  id: string;
  patientName: string;
  lastVisitAgo: string;
  daysOverdue?: number;
  overdueLabel?: string | null;
  followupDate?: string | null;
};

type DoctorPatientsFollowUpListProps = {
  patients: FollowUpPatientRow[];
  loading?: boolean;
  onViewPatient?: (patient: FollowUpPatientRow) => void;
};

export function DoctorPatientsFollowUpList({
  patients,
  loading,
  onViewPatient,
}: DoctorPatientsFollowUpListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-Up Patients</CardTitle>
        <CardDescription>Patients requiring follow-up attention</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No follow-ups due right now.</p>
        ) : (
          <ul className="space-y-2">
            {patients.map((patient) => (
              <li
                key={patient.id}
                className={cn(
                  "rounded-md border px-3 py-2",
                  onViewPatient && "cursor-pointer transition-colors hover:bg-muted/50"
                )}
                onClick={() => onViewPatient?.(patient)}
                onKeyDown={(event) => {
                  if (onViewPatient && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onViewPatient(patient);
                  }
                }}
                role={onViewPatient ? "button" : undefined}
                tabIndex={onViewPatient ? 0 : undefined}
              >
                <p className="text-sm font-medium">{patient.patientName}</p>
                <p className="text-xs text-muted-foreground">Last Visit: {patient.lastVisitAgo}</p>
                {patient.overdueLabel ? (
                  <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {patient.overdueLabel}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
