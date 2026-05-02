"use client";

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
  doctorId: string;
  onDoctorIdChange: (id: string) => void;
  selectedDate: string;
  onDateChange: (iso: string) => void;
  slots: Slot[];
  isLoadingSlots: boolean;
  slotsError: string | null;
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
  doctorId,
  onDoctorIdChange,
  selectedDate,
  onDateChange,
  slots,
  isLoadingSlots,
  slotsError,
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
          value={doctorId}
          onValueChange={onDoctorIdChange}
          disabled={busy}
        />

        <AppointmentDateStrip
          selectedDate={selectedDate}
          onSelectDate={onDateChange}
          disabled={busy}
        />

        <AppointmentSlotGrid
          key={`${doctorId}-${selectedDate}`}
          slots={slots}
          selectedDateIso={selectedDate}
          selectedSlotId={selectedSlotId}
          onSelectSlot={onSelectSlot}
          onSelectionInvalidInBucket={onClearSlotSelection}
          isLoading={isLoadingSlots}
          errorMessage={slotsError}
          disabled={busy}
        />

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
            disabled={busy || noAvailableSlots}
            title={noAvailableSlots ? "No open slots for this doctor and date" : undefined}
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
