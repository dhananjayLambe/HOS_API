"use client";

import { Eye, Pill, Stethoscope } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatLastSeen, isRecentVisit } from "@/lib/dateRecency";
import { getCalmAvatarTint, getInitials } from "@/lib/patientAvatar";
import { cn } from "@/lib/utils";
import type { PatientListRow } from "@/lib/api/patients";

interface Props {
  row: PatientListRow;
  onOpenSummary: (row: PatientListRow) => void;
  onStartConsultation: (row: PatientListRow) => void;
  onOpenPrescriptions: (row: PatientListRow) => void;
}

export function PatientListCard({ row, onOpenSummary, onStartConsultation, onOpenPrescriptions }: Props) {
  const visit = formatLastSeen(row.last_visit_at);
  const isContinue = row.has_open_encounter || row.has_unfinished_consultation;
  const consultLabel = isContinue ? "Continue Consultation" : "Start Consultation";
  const showRecentVisit = isRecentVisit(row.last_visit_at) && !row.open_encounter_state && !row.is_follow_up_due;
  return (
    <div className="space-y-3 rounded-lg border border-border/50 p-4 transition-colors duration-150 hover:border-primary/35 hover:bg-primary/[0.06] hover:shadow-sm active:bg-muted/50 dark:hover:bg-primary/[0.1]">
      <div className="flex items-center gap-3">
        <Avatar className={cn("h-10 w-10", getCalmAvatarTint(row.patient_id))}>
          <AvatarFallback>{getInitials(row.full_name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{row.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {row.age_display} / {row.gender} • {row.mobile || "N/A"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {row.open_encounter_state === "consultation_active" && (
              <Badge className="h-5 rounded-full border-transparent bg-sky-50 px-2 py-0 text-[10px] font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                Consultation Active
              </Badge>
            )}
            {row.open_encounter_state === "in_queue" && (
              <Badge className="h-5 rounded-full border-transparent bg-violet-50 px-2 py-0 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                In Queue
              </Badge>
            )}
            {row.is_follow_up_due && (
              <Badge className="h-5 rounded-full border-transparent bg-amber-50 px-2 py-0 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Follow-up Due
              </Badge>
            )}
            {showRecentVisit && (
              <Badge className="h-5 rounded-full border-transparent bg-emerald-50 px-2 py-0 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                Recent Visit
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <p className="text-muted-foreground">Recent Diagnosis</p>
        <p className="truncate">{row.recent_diagnosis || "No diagnosis"}</p>
        <p className="text-muted-foreground">Last Seen</p>
        <div>
          <p>{visit.primary}</p>
          {visit.secondary && <p className="text-xs text-muted-foreground">{visit.secondary}</p>}
        </div>
        <p className="text-muted-foreground">Active RX</p>
        {row.active_prescriptions_count > 0 ? (
          <Badge className="w-fit rounded-full border-transparent bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {row.active_prescriptions_count} Active RX
          </Badge>
        ) : (
          <p className="text-xs text-muted-foreground">No Active RX</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11 justify-start gap-2" onClick={() => onOpenSummary(row)}>
          <Eye className="h-4 w-4" />
          Patient Summary
        </Button>
        <Button variant="outline" className="h-11 justify-start gap-2" onClick={() => onOpenPrescriptions(row)}>
          <Pill className="h-4 w-4" />
          Prescriptions
        </Button>
      </div>

      <Button className="h-11 w-full gap-2" onClick={() => onStartConsultation(row)}>
        <Stethoscope className="h-4 w-4" />
        {consultLabel}
      </Button>
    </div>
  );
}
