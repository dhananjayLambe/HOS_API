"use client";

import { HelpdeskDoctorSelect } from "@/components/helpdesk/appointments/HelpdeskDoctorSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HelpdeskVisitsFilterState } from "@/hooks/useHelpdeskVisitsList";
import type { MockDoctor } from "@/lib/helpdesk/helpdeskAppointmentTypes";
import { RotateCcw } from "lucide-react";

type Props = {
  filters: HelpdeskVisitsFilterState;
  onFiltersChange: (next: HelpdeskVisitsFilterState) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  doctors: MockDoctor[];
  doctorsLoading: boolean;
  onReset: () => void;
  disabled?: boolean;
  /** When true, hide visit-history-only filters (date range, visit type, status). */
  upcomingMode?: boolean;
};

export function VisitsFilters({
  filters,
  onFiltersChange,
  searchInput,
  onSearchInputChange,
  doctors,
  doctorsLoading,
  onReset,
  disabled,
  upcomingMode,
}: Props) {
  const patch = (partial: Partial<HelpdeskVisitsFilterState>) =>
    onFiltersChange({ ...filters, ...partial });

  return (
    <div className="sticky top-0 z-10 space-y-3 rounded-xl border border-border/80 bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="visits-search">Search</Label>
          <Input
            id="visits-search"
            placeholder="Patient name, mobile, UHID, visit ID"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            disabled={disabled}
          />
        </div>
        {!upcomingMode ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="visits-from">From date</Label>
              <Input
                id="visits-from"
                type="date"
                value={filters.fromDate}
                onChange={(e) => patch({ fromDate: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visits-to">To date</Label>
              <Input
                id="visits-to"
                type="date"
                value={filters.toDate}
                onChange={(e) => patch({ toDate: e.target.value })}
                disabled={disabled}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <HelpdeskDoctorSelect
            doctors={doctors}
            loading={doctorsLoading}
            value={filters.doctorId || undefined}
            onValueChange={(v) => patch({ doctorId: v })}
            disabled={disabled}
            allowAll
          />
        </div>
        {!upcomingMode ? (
          <>
            <div className="space-y-1.5">
              <Label>Visit type</Label>
              <Select
                value={filters.visitType || "all"}
                onValueChange={(v) => patch({ visitType: v === "all" ? "" : v })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="WALK_IN">Walk In</SelectItem>
                  <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(v) => patch({ status: v === "all" ? "" : v })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="space-y-1.5 lg:col-span-2">
            <p className="text-sm text-muted-foreground pt-6">
              Scheduled appointments for later today and future dates.
            </p>
          </div>
        )}
        <div className="flex items-end">
          <Button type="button" variant="outline" className="w-full" onClick={onReset} disabled={disabled}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset filters
          </Button>
        </div>
      </div>
    </div>
  );
}
