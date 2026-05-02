"use client";

import { AppointmentCard } from "@/components/helpdesk/appointments/AppointmentCard";
import type { Appointment, AppointmentListTab } from "@/lib/helpdesk/helpdeskAppointmentTypes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface AppointmentListSectionProps {
  listTab: AppointmentListTab;
  onListTabChange: (tab: AppointmentListTab) => void;
  appointments: Appointment[];
  onReschedule: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
  onCheckIn: (a: Appointment) => void;
  actionDisabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function AppointmentListSection({
  listTab,
  onListTabChange,
  appointments,
  onReschedule,
  onCancel,
  onCheckIn,
  actionDisabled,
  isLoading,
  className,
}: AppointmentListSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <h2 className="text-lg font-semibold">Appointments</h2>

      <Tabs
        value={listTab}
        onValueChange={(v) => onListTabChange(v as AppointmentListTab)}
        className="w-full"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
          <TabsTrigger value="today" className="text-xs sm:text-sm">
            Today
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm">
            Completed
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs sm:text-sm">
            Cancelled
          </TabsTrigger>
        </TabsList>

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
          ) : (
            <ul className="space-y-3">
              {appointments.map((a) => (
                <li key={a.id}>
                  <AppointmentCard
                    appointment={a}
                    onReschedule={onReschedule}
                    onCancel={onCancel}
                    onCheckIn={onCheckIn}
                    actionDisabled={actionDisabled}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Tabs>
    </section>
  );
}
