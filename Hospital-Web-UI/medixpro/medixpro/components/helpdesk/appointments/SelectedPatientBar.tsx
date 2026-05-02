"use client";

import type { HelpdeskSearchPatient } from "@/components/helpdesk/HelpdeskPatientSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatAgeGenderLine,
  maskMobileForSearch,
} from "@/lib/patientSearchDisplay";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

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

export interface SelectedPatientBarProps {
  patient: HelpdeskSearchPatient;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
}

export function SelectedPatientBar({ patient, onChange, disabled, className }: SelectedPatientBarProps) {
  const row = toRow(patient);
  const subtitle = formatAgeGenderLine(row);
  const phone = patient.mobile ? maskMobileForSearch(patient.mobile) : null;

  return (
    <div
      className={cn(
        "sticky top-0 z-30 -mx-3 border-b border-primary/25 bg-primary/5 px-3 py-3 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-primary/[0.07] sm:-mx-4 sm:px-4",
        className
      )}
    >
      <div className="mx-auto flex max-w-lg items-start gap-3 md:max-w-2xl">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <User className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-foreground">{patient.full_name}</p>
            <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold uppercase tracking-wide">
              Selected
            </Badge>
          </div>
          {(subtitle || phone) && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[subtitle, phone].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onChange}
          disabled={disabled}
        >
          Change
        </Button>
      </div>
    </div>
  );
}
