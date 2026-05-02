"use client";

import { User } from "lucide-react";

import type { HelpdeskSearchPatient } from "@/components/helpdesk/HelpdeskPatientSearch";
import { formatAgeGenderLine, maskMobileForSearch } from "@/lib/patientSearchDisplay";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";
import { cn } from "@/lib/utils";

interface PatientInfoCardProps {
  patient: HelpdeskSearchPatient;
  className?: string;
}

/** Map helpdesk patient to minimal row shape for display helpers. */
function toRow(p: HelpdeskSearchPatient): PatientSearchRow {
  return {
    id: p.id,
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    full_name: p.full_name,
    gender: p.gender,
    date_of_birth: p.date_of_birth,
    mobile: p.mobile,
    relation: undefined,
  };
}

export function PatientInfoCard({ patient, className }: PatientInfoCardProps) {
  const row = toRow(patient);
  const subtitle = formatAgeGenderLine(row);
  const phone = patient.mobile ? maskMobileForSearch(patient.mobile) : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{patient.full_name}</p>
          {(subtitle || phone) && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[subtitle, phone].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
