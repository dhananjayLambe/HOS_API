"use client";

import { Eye, MoreHorizontal, Pill, Stethoscope } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatLastSeen, isRecentVisit } from "@/lib/dateRecency";
import { getCalmAvatarTint, getInitials } from "@/lib/patientAvatar";
import type { PatientListRow as PatientListRowType } from "@/lib/api/patients";
import { cn } from "@/lib/utils";

interface Props {
  row: PatientListRowType;
  onOpenSummary: (row: PatientListRowType) => void;
  onStartConsultation: (row: PatientListRowType) => void;
  onOpenPrescriptions: (row: PatientListRowType) => void;
}

export function PatientListRow({ row, onOpenSummary, onStartConsultation, onOpenPrescriptions }: Props) {
  const visit = formatLastSeen(row.last_visit_at);
  const isContinue = row.has_open_encounter || row.has_unfinished_consultation;
  const consultLabel = isContinue ? "Continue Consultation" : "Start Consultation";
  const showRecentVisit = isRecentVisit(row.last_visit_at) && !row.open_encounter_state && !row.is_follow_up_due;

  return (
    <TableRow
      onClick={() => onOpenSummary(row)}
      title="Open patient summary"
      className="h-14 cursor-pointer border-b border-border/40 transition-colors duration-150 hover:bg-primary/10 hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)_/_0.35)] dark:hover:bg-primary/15"
    >
      <TableCell className="min-h-14 py-2">
        <div className="flex items-center gap-3">
          <Avatar className={cn("h-9 w-9", getCalmAvatarTint(row.patient_id))}>
            <AvatarFallback>{getInitials(row.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{row.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.age_display} / {row.gender} • {row.mobile || "N/A"}
            </p>
            <div className="mt-1 flex items-center gap-1">
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
      </TableCell>
      <TableCell className="min-h-14 py-2">
        <p className="font-medium">{visit.primary}</p>
        <p className="text-xs text-muted-foreground">{visit.secondary}</p>
      </TableCell>
      <TableCell className="min-h-14 max-w-[180px] truncate py-2" title={row.recent_diagnosis || "No diagnosis"}>
        {row.recent_diagnosis || "No diagnosis"}
      </TableCell>
      <TableCell className="min-h-14 py-2">
        {row.active_prescriptions_count > 0 ? (
          <Badge className="rounded-full border-transparent bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {row.active_prescriptions_count} Active RX
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No Active RX</span>
        )}
      </TableCell>
      <TableCell className="min-h-14 py-2 text-sm text-muted-foreground">{row.visits_count} Visits</TableCell>
      <TableCell className="min-h-14 py-2" onClick={(e) => e.stopPropagation()}>
        <TooltipProvider delayDuration={0}>
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                  aria-label={consultLabel}
                  onClick={() => onStartConsultation(row)}
                >
                  <Stethoscope className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{consultLabel}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  aria-label="Patient Summary"
                  onClick={() => onOpenSummary(row)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Patient Summary</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  aria-label="Prescriptions"
                  onClick={() => onOpenPrescriptions(row)}
                >
                  <Pill className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Prescriptions</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(row.mobile || "")}
                  disabled={!row.mobile}
                >
                  Copy mobile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(row.uhid || "")}
                  disabled={!row.uhid}
                >
                  Copy UHID
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
}
