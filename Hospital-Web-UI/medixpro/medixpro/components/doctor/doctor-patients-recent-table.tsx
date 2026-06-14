"use client";

import { Eye, History, MoreHorizontal, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DoctorPatientsPageSize } from "@/lib/api/doctor-patients-dashboard";
import { cn } from "@/lib/utils";

export type RecentPatientStatus = "Active" | "Follow-up Due" | "Treatment Ongoing" | "Stable";

export type RecentPatientRow = {
  id: string;
  patientName: string;
  mobile?: string;
  lastVisit: string;
  totalVisits: number;
  diagnosis: string;
  status: RecentPatientStatus;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  hasOpenEncounter?: boolean;
  openEncounterState?: "consultation_active" | "in_queue" | null;
  hasUnfinishedConsultation?: boolean;
};

const statusBadgeClass: Record<RecentPatientStatus, string> = {
  Active: "bg-sky-500/15 text-sky-900 dark:text-sky-100 hover:bg-sky-500/15",
  "Follow-up Due": "bg-amber-500/15 text-amber-900 dark:text-amber-100 hover:bg-amber-500/15",
  "Treatment Ongoing": "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-500/15",
  Stable: "bg-muted text-muted-foreground hover:bg-muted",
};

type DoctorPatientsRecentTableProps = {
  patients: RecentPatientRow[];
  loading?: boolean;
  page?: number;
  pageSize?: DoctorPatientsPageSize;
  totalCount?: number;
  pageSizeOptions?: readonly DoctorPatientsPageSize[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: DoctorPatientsPageSize) => void;
  onViewPatient?: (patient: RecentPatientRow) => void;
  onViewVisitHistory?: (patient: RecentPatientRow) => void;
  onStartConsultation?: (patient: RecentPatientRow) => void;
};

export function DoctorPatientsRecentTable({
  patients,
  loading,
  page = 1,
  pageSize = 10,
  totalCount = 0,
  pageSizeOptions = [5, 10, 25, 50],
  onPageChange,
  onPageSizeChange,
  onViewPatient,
  onViewVisitHistory,
  onStartConsultation,
}: DoctorPatientsRecentTableProps) {
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Recent Patients</CardTitle>
          <CardDescription>Patients you have recently consulted</CardDescription>
        </div>
        {onPageSizeChange ? (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value) as DoctorPatientsPageSize)}
          >
            <SelectTrigger className="h-8 w-[110px]">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  Show {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: pageSize }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No patients found for this clinic yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => {
                const consultLabel =
                  patient.hasOpenEncounter || patient.hasUnfinishedConsultation
                    ? "Continue Consultation"
                    : "Start Consultation";

                return (
                <TableRow
                  key={patient.id}
                  className={onViewPatient ? "cursor-pointer" : undefined}
                  onClick={() => onViewPatient?.(patient)}
                >
                  <TableCell className="font-medium">{patient.patientName}</TableCell>
                  <TableCell className="text-muted-foreground">{patient.lastVisit}</TableCell>
                  <TableCell className="text-right tabular-nums">{patient.totalVisits}</TableCell>
                  <TableCell className="max-w-[180px] truncate" title={patient.diagnosis}>
                    {patient.diagnosis}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="secondary"
                      className={cn("font-normal", statusBadgeClass[patient.status])}
                    >
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Patient actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                        {onViewPatient ? (
                          <DropdownMenuItem onClick={() => onViewPatient(patient)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Patient
                          </DropdownMenuItem>
                        ) : null}
                        {onViewVisitHistory ? (
                          <DropdownMenuItem onClick={() => onViewVisitHistory(patient)}>
                            <History className="mr-2 h-4 w-4" />
                            View Visit History
                          </DropdownMenuItem>
                        ) : null}
                        {onStartConsultation ? (
                          <DropdownMenuItem onClick={() => onStartConsultation(patient)}>
                            <Stethoscope className="mr-2 h-4 w-4" />
                            {consultLabel}
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {!loading && totalPages > 1 && onPageChange ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages} ({totalCount} patients)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
