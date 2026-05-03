"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";

import { AppointmentListSection } from "@/components/helpdesk/appointments/AppointmentListSection";
import { CancelAppointmentDialog } from "@/components/helpdesk/appointments/CancelAppointmentDialog";
import { Button } from "@/components/ui/button";
import { useHelpdeskAppointmentsMock } from "@/hooks/use-helpdesk-appointments";
import type { Appointment } from "@/lib/helpdesk/helpdeskAppointmentTypes";

export default function HelpdeskAppointmentsListPage() {
  const router = useRouter();
  const {
    appointments,
    listTab,
    setListTab,
    isLoading,
    mutationKey,
    cancelAppointment,
    checkInAppointment,
  } = useHelpdeskAppointmentsMock();

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const busy = Boolean(mutationKey);

  const openCancelDialog = useCallback((a: Appointment) => {
    setCancelTarget(a);
    setCancelOpen(true);
  }, []);

  const confirmCancel = useCallback(async () => {
    if (!cancelTarget) return;
    try {
      await cancelAppointment(cancelTarget.id);
      toast.success("Appointment cancelled");
      setCancelOpen(false);
      setCancelTarget(null);
    } catch {
      toast.error("Could not cancel appointment.");
    }
  }, [cancelTarget, cancelAppointment]);

  const handleCheckIn = useCallback(
    async (a: Appointment) => {
      try {
        const data = await checkInAppointment(a.id);
        if (data.message?.toLowerCase().includes("already")) {
          toast.info("Already checked in");
        } else {
          toast.success("Patient checked in");
        }
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        const msg = err instanceof Error ? err.message : "";
        if (code === "INVALID_STATUS") {
          toast.error("Cannot check-in this appointment");
        } else if (code === "INVALID_DATE") {
          toast.error("Cannot check-in future appointment");
        } else if (code === "NOT_FOUND") {
          toast.error("Appointment not found");
        } else if (code === "PERMISSION_DENIED") {
          toast.error("Not allowed");
        } else if (code === "CONFLICT") {
          toast.error(msg || "Conflict occurred");
        } else {
          toast.error("Something went wrong");
        }
      }
    },
    [checkInAppointment]
  );

  const handleReschedule = useCallback(
    (a: Appointment) => {
      router.push(`/helpdesk/appointments/book?reschedule=${encodeURIComponent(a.id)}`);
    },
    [router]
  );

  return (
    <div className="mx-auto max-w-lg space-y-4 px-3 py-3 pb-28 md:max-w-2xl md:px-4 md:py-4 md:pb-8">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold tracking-tight">Appointments</h1>
            <p className="text-sm text-muted-foreground">
              View and manage bookings for your clinic.
            </p>
          </div>
          <Button asChild className="h-11 w-full shrink-0 sm:w-auto sm:self-center">
            <Link href="/helpdesk/appointments/book">
              <CalendarPlus className="mr-2 h-4 w-4" aria-hidden />
              Book appointment
            </Link>
          </Button>
        </div>
      </header>

      <AppointmentListSection
        listTab={listTab}
        onListTabChange={setListTab}
        appointments={appointments}
        onReschedule={handleReschedule}
        onCancel={openCancelDialog}
        onCheckIn={handleCheckIn}
        actionDisabled={busy}
        checkInPending={mutationKey === "checkin"}
        isLoading={isLoading}
      />

      <CancelAppointmentDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        appointment={cancelTarget}
        onConfirm={confirmCancel}
        isLoading={busy && mutationKey === "cancel"}
      />
    </div>
  );
}
