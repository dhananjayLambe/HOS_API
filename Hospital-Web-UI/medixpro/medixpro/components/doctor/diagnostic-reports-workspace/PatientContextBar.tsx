"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkspacePatient } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import { formatDistanceToNow } from "date-fns";
import { surfaceSection, typeMeta } from "@/lib/design-system/clinical";
import { cn } from "@/lib/utils";

type PatientContextBarProps = {
  patient: WorkspacePatient;
  onClear?: () => void;
};

export function PatientContextBar({ patient, onClear }: PatientContextBarProps) {
  return (
    <div
      className={cn(
        surfaceSection,
        "sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 backdrop-blur"
      )}
    >
      <div className="min-w-0">
        <p className="text-base font-semibold leading-tight text-[hsl(var(--clinical-text-primary))] sm:text-lg">
          {patient.name}
        </p>
        <p className={cn(typeMeta, "mt-0.5")}>
          {patient.age ? `${patient.age}y` : "Age unavailable"} · {patient.gender} · Patient Identifier:{" "}
          {patient.identifier}
          {patient.mobile ? ` · ${patient.mobile}` : ""}
        </p>
        <div className={cn("mt-1 flex flex-wrap gap-x-3 gap-y-1", typeMeta)}>
          {patient.currentConsultationLabel ? (
            <span>Consultation: {patient.currentConsultationLabel}</span>
          ) : (
            <span>No active consultation linked</span>
          )}
          {patient.lastVisitAt ? (
            <span>
              Last visit{" "}
              {formatDistanceToNow(new Date(patient.lastVisitAt), { addSuffix: true })}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="h-9">
          <Link href={`/patients/${patient.id}?tab=labs`}>
            Patient Summary
            <ExternalLink className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
        {onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onClear}
            aria-label="Clear patient"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
