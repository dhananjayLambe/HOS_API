"use client";

import { AppointmentCard } from "@/components/helpdesk/appointments/AppointmentCard";
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
import type {
  Appointment,
  HelpdeskAppointmentSection,
  MockDoctor,
} from "@/lib/helpdesk/helpdeskAppointmentTypes";
import { groupPrimaryAppointments } from "@/lib/helpdesk/groupHelpdeskAppointments";
import { cn } from "@/lib/utils";

export interface AppointmentListSectionProps {
  listSection: HelpdeskAppointmentSection;
  onListSectionChange: (s: HelpdeskAppointmentSection) => void;
  appointments: Appointment[];
  doctors: MockDoctor[];
  doctorsLoading: boolean;
  listDoctorId: string;
  onListDoctorIdChange: (id: string) => void;
  listDate: string;
  onListDateChange: (d: string) => void;
  listSearch: string;
  onListSearchChange: (q: string) => void;
  listStatus: string;
  onListStatusChange: (s: string) => void;
  onReschedule: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
  onCheckIn: (a: Appointment) => void;
  actionDisabled?: boolean;
  checkInPending?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

function SectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}

export function AppointmentListSection({
  listSection,
  onListSectionChange,
  appointments,
  doctors,
  doctorsLoading,
  listDoctorId,
  onListDoctorIdChange,
  listDate,
  onListDateChange,
  listSearch,
  onListSearchChange,
  listStatus,
  onListStatusChange,
  onReschedule,
  onCancel,
  onCheckIn,
  actionDisabled,
  checkInPending,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  className,
}: AppointmentListSectionProps) {
  const { waiting, next, later, other } = groupPrimaryAppointments(appointments);

  const renderCards = (items: Appointment[]) =>
    items.map((a) => (
      <li key={a.id}>
        <AppointmentCard
          appointment={a}
          onReschedule={onReschedule}
          onCancel={onCancel}
          onCheckIn={onCheckIn}
          actionDisabled={actionDisabled}
          isChecking={checkInPending}
        />
      </li>
    ));

  return (
    <section className={cn("space-y-4", className)}>
      <div className="sticky top-0 z-10 space-y-3 border-b border-border/60 bg-background/95 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="grid gap-3 sm:grid-cols-2">
          <HelpdeskDoctorSelect
            doctors={doctors}
            allowAll
            value={listDoctorId || undefined}
            onValueChange={onListDoctorIdChange}
            loading={doctorsLoading}
            disabled={false}
          />
          <div className="space-y-2">
            <Label htmlFor="appt-date">Date</Label>
            <Input
              id="appt-date"
              type="date"
              className="h-11"
              value={listDate}
              onChange={(e) => onListDateChange(e.target.value)}
              disabled={listSection !== "primary"}
              title={listSection !== "primary" ? "Date filter applies to Today (ops) only" : undefined}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="appt-search">Search patient</Label>
            <Input
              id="appt-search"
              type="search"
              placeholder="Name or mobile"
              className="h-11"
              value={listSearch}
              onChange={(e) => onListSearchChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={listStatus || "all"}
              onValueChange={(v) => onListStatusChange(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="checked_in">Checked in</SelectItem>
                <SelectItem value="in_consultation">In consultation</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={listSection === "primary" ? "default" : "outline"}
            onClick={() => onListSectionChange("primary")}
          >
            Today (ops)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={listSection === "secondary" ? "default" : "outline"}
            onClick={() => onListSectionChange("secondary")}
          >
            Upcoming
          </Button>
          <Button
            type="button"
            size="sm"
            variant={listSection === "archive" ? "default" : "outline"}
            onClick={() => onListSectionChange("archive")}
          >
            Archive (7d)
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3 py-6" aria-busy>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/40"
              />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No appointments found
          </p>
        ) : listSection === "primary" ? (
          <div className="space-y-8">
            <SectionBlock title="Waiting" description="Checked in or in consultation">
              {waiting.length ? renderCards(waiting) : (
                <p className="text-sm text-muted-foreground">Nobody in waiting</p>
              )}
            </SectionBlock>
            <SectionBlock title="Next appointments" description="Due soon or overdue slot">
              {next.length ? renderCards(next) : (
                <p className="text-sm text-muted-foreground">No upcoming in this window</p>
              )}
            </SectionBlock>
            <SectionBlock title="Later today" description="Rest of today after the near window">
              {later.length ? renderCards(later) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </SectionBlock>
            {other.length > 0 ? (
              <SectionBlock title="Other">{renderCards(other)}</SectionBlock>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-3">{renderCards(appointments)}</ul>
        )}

        {hasMore && !isLoading ? (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoadingMore}
              onClick={() => onLoadMore?.()}
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
