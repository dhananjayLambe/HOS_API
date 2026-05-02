"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppointmentDateStrip } from "@/components/helpdesk/appointments/AppointmentDateStrip";
import { AppointmentDetailsForm } from "@/components/helpdesk/appointments/AppointmentDetailsForm";
import { AppointmentSlotGrid } from "@/components/helpdesk/appointments/AppointmentSlotGrid";
import { HelpdeskDoctorSelect } from "@/components/helpdesk/appointments/HelpdeskDoctorSelect";
import type {
  AppointmentKind,
  ConsultationMode,
  MockDoctor,
  Slot,
} from "@/lib/helpdesk/helpdeskAppointmentTypes";
import { cn } from "@/lib/utils";

export interface AppointmentBookingPanelProps {
  mode: "create" | "edit";
  doctors: MockDoctor[];
  /** GET /queue/helpdesk/context/ still loading. */
  doctorsLoading?: boolean;
  doctorId: string;
  onDoctorIdChange: (id: string) => void;
  selectedDate: string;
  onDateChange: (iso: string) => void;
  slots: Slot[];
  isLoadingSlots: boolean;
  slotsError: string | null;
  /** Explains zero slots after a successful API response (e.g. closed weekday). */
  slotsEmptyHint?: string | null;
  selectedSlotId: string | null;
  onSelectSlot: (slot: Slot) => void;
  onClearSlotSelection?: () => void;
  consultationMode: ConsultationMode;
  onConsultationModeChange: (v: ConsultationMode) => void;
  appointmentType: AppointmentKind;
  onAppointmentTypeChange: (v: AppointmentKind) => void;
  consultationFee: string;
  onConsultationFeeChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  onSubmit: () => void;
  onCancelEdit?: () => void;
  isSubmitting: boolean;
  actionBlocked?: boolean;
}

export function AppointmentBookingPanel({
  mode,
  doctors,
  doctorsLoading = false,
  doctorId,
  onDoctorIdChange,
  selectedDate,
  onDateChange,
  slots,
  isLoadingSlots,
  slotsError,
  slotsEmptyHint = null,
  selectedSlotId,
  onSelectSlot,
  onClearSlotSelection,
  consultationMode,
  onConsultationModeChange,
  appointmentType,
  onAppointmentTypeChange,
  consultationFee,
  onConsultationFeeChange,
  notes,
  onNotesChange,
  onSubmit,
  onCancelEdit,
  isSubmitting,
  actionBlocked,
}: AppointmentBookingPanelProps) {
  const busy = isSubmitting || actionBlocked;
  const noAvailableSlots = slots.length > 0 && !slots.some((s) => s.state === "available");
  const hasDoctor = Boolean(doctorId?.trim());
  const showSlotGrid = !doctorsLoading && doctors.length > 0 && hasDoctor;
  const showSelectDoctorHint = !doctorsLoading && doctors.length > 0 && !hasDoctor;
  const showNoDoctors = !doctorsLoading && doctors.length === 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {mode === "edit" ? "Reschedule appointment" : "Book appointment"}
        </h2>
        {mode === "edit" && onCancelEdit && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit} disabled={busy}>
            Cancel edit
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-4">
        <HelpdeskDoctorSelect
          doctors={doctors}
          value={doctorId || undefined}
          onValueChange={onDoctorIdChange}
          disabled={busy}
          loading={doctorsLoading}
        />

        <AppointmentDateStrip
          selectedDate={selectedDate}
          onSelectDate={onDateChange}
          disabled={busy}
        />

        {doctorsLoading ? (
          <div className="flex min-h-[120px] items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading clinic doctors…</span>
          </div>
        ) : showNoDoctors ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-4 text-sm text-amber-900 dark:text-amber-100">
            No approved doctors are assigned to your clinic. You cannot book until a doctor is linked.
          </p>
        ) : showSelectDoctorHint ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
            Select a doctor first — then available time slots will load for the chosen date.
          </p>
        ) : (
          <AppointmentSlotGrid
            key={`${doctorId}-${selectedDate}`}
            slots={slots}
            selectedDateIso={selectedDate}
            selectedSlotId={selectedSlotId}
            onSelectSlot={onSelectSlot}
            onSelectionInvalidInBucket={onClearSlotSelection}
            isLoading={isLoadingSlots}
            errorMessage={slotsError}
            emptySlotsDescription={slotsEmptyHint}
            disabled={busy}
          />
        )}

        <AppointmentDetailsForm
          consultationMode={consultationMode}
          onConsultationModeChange={onConsultationModeChange}
          appointmentType={appointmentType}
          onAppointmentTypeChange={onAppointmentTypeChange}
          consultationFee={consultationFee}
          onConsultationFeeChange={onConsultationFeeChange}
          notes={notes}
          onNotesChange={onNotesChange}
          disabled={busy}
        />
      </div>

      {/* Sticky primary action on small screens */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-sm md:static md:z-0 md:border-0 md:bg-transparent md:p-0 md:pb-0 md:shadow-none"
        )}
      >
        <div className="mx-auto max-w-lg md:max-w-none">
          <Button
            type="button"
            className="h-12 w-full text-base font-semibold"
            onClick={onSubmit}
            disabled={busy || noAvailableSlots || !showSlotGrid}
            title={
              !showSlotGrid
                ? doctors.length === 0
                  ? "No doctors available for this clinic"
                  : "Select a doctor and time slot"
                : noAvailableSlots
                  ? "No open slots for this doctor and date"
                  : undefined
            }
          >
            {isSubmitting
              ? "Please wait…"
              : mode === "edit"
                ? "Save changes"
                : "Book appointment"}
          </Button>
        </div>
      </div>

      {/* Spacer so content isn’t hidden behind fixed bar on mobile */}
      <div className="h-16 md:hidden" aria-hidden />
    </section>
  );
}
