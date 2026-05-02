"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  HelpdeskPatientSearch,
  type HelpdeskSearchPatient,
} from "@/components/helpdesk/HelpdeskPatientSearch";
import { AppointmentBookingPanel } from "@/components/helpdesk/appointments/AppointmentBookingPanel";
import { SelectedPatientBar } from "@/components/helpdesk/appointments/SelectedPatientBar";
import { useHelpdeskAppointmentSlots } from "@/hooks/use-helpdesk-appointment-slots";
import { useHelpdeskAppointmentsMock } from "@/hooks/use-helpdesk-appointments";
import type {
  Appointment,
  AppointmentKind,
  ConsultationMode,
  CreateAppointmentInput,
  Slot,
} from "@/lib/helpdesk/helpdeskAppointmentTypes";
import { MOCK_DOCTOR_UNAVAILABLE_ID } from "@/lib/helpdesk/helpdeskAppointmentMockStore";
import { toHhMmSs } from "@/lib/helpdesk/formatSlotTime";
import { mapAppointmentBookingError } from "@/lib/helpdesk/mapAppointmentBookingError";
import { Button } from "@/components/ui/button";
import { isAxiosError } from "axios";

const LAST_DOCTOR_KEY = "helpdesk:appointment:lastDoctorId";

function syntheticPatientFromAppointment(a: Appointment): HelpdeskSearchPatient {
  return {
    id: a.patientProfileId,
    full_name: a.patientName,
    patient_account_id: undefined,
  };
}

function BookAppointmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    doctors,
    doctorsLoading,
    clinicId,
    mutationKey,
    createAppointment,
    updateAppointment,
    allAppointments,
    todayIso,
  } = useHelpdeskAppointmentsMock();

  const [selectedPatient, setSelectedPatient] = useState<HelpdeskSearchPatient | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showPostSubmitActions, setShowPostSubmitActions] = useState(false);

  const [doctorId, setDoctorId] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const { slots, isLoadingSlots, slotsError, slotsEmptyHint, refetch: refetchSlots } =
    useHelpdeskAppointmentSlots({
      doctorId,
      clinicId: clinicId ?? "",
      date: selectedDate,
    });

  const slotGridEmptyHint =
    !doctorsLoading && doctorId && !clinicId?.trim()
      ? "Clinic context is missing, so slots cannot load. Refresh the page or verify your helpdesk clinic assignment."
      : slotsEmptyHint;

  const [consultationMode, setConsultationMode] = useState<ConsultationMode>("clinic");
  const [appointmentType, setAppointmentType] = useState<AppointmentKind>("new");
  const [consultationFee, setConsultationFee] = useState("500");
  const [notes, setNotes] = useState("");

  const [searchMountKey, setSearchMountKey] = useState(0);
  const bookingSectionRef = useRef<HTMLDivElement>(null);
  const rescheduleAppliedFor = useRef<string | null>(null);

  const busy = Boolean(mutationKey);

  const defaultDoctorId = useMemo(() => {
    if (typeof window === "undefined") return doctors[0]?.id ?? "";
    try {
      const raw = localStorage.getItem(LAST_DOCTOR_KEY);
      if (raw && doctors.some((d) => d.id === raw && d.id !== MOCK_DOCTOR_UNAVAILABLE_ID)) {
        return raw;
      }
    } catch {
      /* ignore */
    }
    return doctors.find((d) => d.id !== MOCK_DOCTOR_UNAVAILABLE_ID)?.id ?? doctors[0]?.id ?? "";
  }, [doctors]);

  const rescheduleId = searchParams.get("reschedule");

  useEffect(() => {
    if (!rescheduleId) {
      rescheduleAppliedFor.current = null;
      return;
    }
    if (rescheduleAppliedFor.current === rescheduleId) return;

    const a = allAppointments.find((x) => x.id === rescheduleId);
    if (!a) {
      toast.error("Could not load that appointment.");
      router.replace("/helpdesk/appointments/book");
      return;
    }
    if (a.status !== "scheduled") {
      toast.message("Only scheduled appointments can be rescheduled.");
      router.replace("/helpdesk/appointments/book");
      return;
    }

    rescheduleAppliedFor.current = rescheduleId;
    setEditingAppointment(a);
    setSelectedPatient(syntheticPatientFromAppointment(a));
    setDoctorId(a.doctorId);
    setSelectedDate(a.appointmentDate);
    setConsultationMode(a.consultationMode);
    setAppointmentType(a.appointmentType);
    setConsultationFee(String(a.consultationFee));
    setNotes(a.notes);
    setSelectedSlotId(null);
    setShowPostSubmitActions(false);
  }, [rescheduleId, allAppointments, router]);

  useEffect(() => {
    if (!doctorId && defaultDoctorId) {
      setDoctorId(defaultDoctorId);
    }
  }, [defaultDoctorId, doctorId]);

  useEffect(() => {
    if (!selectedPatient) return;
    const id = requestAnimationFrame(() => {
      bookingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedPatient?.id]);

  useEffect(() => {
    setSelectedSlotId(null);
  }, [doctorId, selectedDate, editingAppointment?.id]);

  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === selectedSlotId) ?? null,
    [slots, selectedSlotId]
  );

  const persistLastDoctor = useCallback((id: string) => {
    if (!id || id === MOCK_DOCTOR_UNAVAILABLE_ID) return;
    try {
      localStorage.setItem(LAST_DOCTOR_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const resetFormForCreate = useCallback(() => {
    setConsultationMode("clinic");
    setAppointmentType("new");
    setConsultationFee("500");
    setNotes("");
    setSelectedDate(todayIso);
    setSelectedSlotId(null);
    if (defaultDoctorId) setDoctorId(defaultDoctorId);
  }, [defaultDoctorId, todayIso]);

  const handleSelectPatient = useCallback(
    (p: HelpdeskSearchPatient) => {
      setSelectedPatient(p);
      setEditingAppointment(null);
      resetFormForCreate();
      setShowPostSubmitActions(false);
      router.replace("/helpdesk/appointments/book");
      rescheduleAppliedFor.current = null;
    },
    [resetFormForCreate, router]
  );

  const handleChangePatient = useCallback(() => {
    setSelectedPatient(null);
    setEditingAppointment(null);
    resetFormForCreate();
    setSearchMountKey((k) => k + 1);
    setShowPostSubmitActions(false);
    router.replace("/helpdesk/appointments/book");
    rescheduleAppliedFor.current = null;
  }, [resetFormForCreate, router]);

  const handleCancelEdit = useCallback(() => {
    setEditingAppointment(null);
    resetFormForCreate();
    router.replace("/helpdesk/appointments/book");
    rescheduleAppliedFor.current = null;
  }, [resetFormForCreate, router]);

  const handleBookAnother = useCallback(() => {
    setShowPostSubmitActions(false);
    setSelectedPatient(null);
    setEditingAppointment(null);
    resetFormForCreate();
    setSearchMountKey((k) => k + 1);
    router.replace("/helpdesk/appointments/book");
    rescheduleAppliedFor.current = null;
  }, [resetFormForCreate, router]);

  const handleSubmitBooking = useCallback(async () => {
    if (!selectedPatient) {
      toast.error("Select a patient first.");
      return;
    }
    if (!editingAppointment && !selectedPatient.patient_account_id?.trim()) {
      toast.error("Patient account is missing. Search and select the patient again.");
      return;
    }
    if (!doctorId) {
      toast.error("Select a doctor.");
      return;
    }
    if (doctorId === MOCK_DOCTOR_UNAVAILABLE_ID) {
      toast.error("Choose an available doctor.");
      return;
    }
    if (!selectedSlot || selectedSlot.state !== "available") {
      toast.error("Pick an available slot.");
      return;
    }
    if (!editingAppointment && !clinicId?.trim()) {
      toast.error("Clinic context unavailable. Refresh the page or verify helpdesk clinic assignment.");
      return;
    }
    const feeNum = Number.parseFloat(consultationFee.replace(/,/g, ""));
    if (Number.isNaN(feeNum) || feeNum < 0) {
      toast.error("Enter a valid fee.");
      return;
    }

    const doctorName = doctors.find((d) => d.id === doctorId)?.name ?? "Doctor";
    const base: CreateAppointmentInput = {
      patientProfileId: selectedPatient.id,
      patientName: selectedPatient.full_name,
      doctorId,
      doctorName,
      appointmentDate: selectedDate,
      appointmentTime: selectedSlot.startTime,
      consultationMode,
      appointmentType,
      consultationFee: feeNum,
      notes,
    };
    if (!editingAppointment) {
      base.patientAccountId = selectedPatient.patient_account_id!.trim();
      base.clinicId = clinicId!.trim();
      base.slotStartTime = toHhMmSs(selectedSlot.startTime);
      base.slotEndTime = toHhMmSs(selectedSlot.endTime);
    }

    try {
      if (editingAppointment) {
        await updateAppointment({ ...base, id: editingAppointment.id });
        toast.success("Appointment updated");
        await refetchSlots();
        persistLastDoctor(doctorId);
        setEditingAppointment(null);
        resetFormForCreate();
        setShowPostSubmitActions(true);
        router.replace("/helpdesk/appointments/book");
      } else {
        await createAppointment(base);
        toast.success("Appointment booked successfully");
        await refetchSlots();
        persistLastDoctor(doctorId);
        resetFormForCreate();
        setShowPostSubmitActions(true);
        router.replace("/helpdesk/appointments/book");
      }
    } catch (e) {
      if (e instanceof Error && e.message === "MISSING_BOOKING_FIELDS") {
        toast.error("Missing booking details. Check patient account and clinic, then try again.");
        return;
      }
      if (isAxiosError(e)) {
        toast.error(mapAppointmentBookingError(e));
        return;
      }
      toast.error("Something went wrong. Try again.");
    }
  }, [
    selectedPatient,
    doctorId,
    selectedSlot,
    consultationFee,
    doctors,
    selectedDate,
    consultationMode,
    appointmentType,
    notes,
    editingAppointment,
    clinicId,
    createAppointment,
    updateAppointment,
    persistLastDoctor,
    resetFormForCreate,
    router,
    refetchSlots,
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-3 py-3 pb-36 md:max-w-2xl md:space-y-5 md:px-4 md:py-4 md:pb-8">
      <header className="space-y-0.5">
        <h1 className="text-xl font-semibold tracking-tight">Book appointment</h1>
        <p className="text-sm text-muted-foreground">
          {doctors.length === 0
            ? "Loading doctors for your clinic… If this persists, check helpdesk assignment."
            : "Choose patient, doctor, and slot. Booking uses the live API."}
        </p>
      </header>

      {!selectedPatient ? (
        <section className="space-y-2">
          <HelpdeskPatientSearch
            key={searchMountKey}
            onAddNew={() =>
              toast.message("Register new patients from the Patients tab.", { duration: 4000 })
            }
            onSelectPatient={handleSelectPatient}
            autoFocus
            className="space-y-2"
          />
          <p className="text-xs text-muted-foreground">Select a patient to continue.</p>
        </section>
      ) : (
        <div ref={bookingSectionRef} className="space-y-3 scroll-mt-2">
          <SelectedPatientBar patient={selectedPatient} onChange={handleChangePatient} disabled={busy} />
          <AppointmentBookingPanel
            mode={editingAppointment ? "edit" : "create"}
            doctors={doctors}
            doctorsLoading={doctorsLoading}
            doctorId={doctorId}
            onDoctorIdChange={(id) => {
              setDoctorId(id);
              setSelectedSlotId(null);
            }}
            selectedDate={selectedDate}
            onDateChange={(iso) => {
              setSelectedDate(iso);
              setSelectedSlotId(null);
            }}
            slots={slots}
            isLoadingSlots={isLoadingSlots}
            slotsError={slotsError}
            slotsEmptyHint={slotGridEmptyHint}
            selectedSlotId={selectedSlotId}
            onSelectSlot={(slot: Slot) => {
              if (slot.state !== "available") return;
              setSelectedSlotId(slot.id);
            }}
            onClearSlotSelection={() => setSelectedSlotId(null)}
            consultationMode={consultationMode}
            onConsultationModeChange={setConsultationMode}
            appointmentType={appointmentType}
            onAppointmentTypeChange={setAppointmentType}
            consultationFee={consultationFee}
            onConsultationFeeChange={setConsultationFee}
            notes={notes}
            onNotesChange={setNotes}
            onSubmit={handleSubmitBooking}
            onCancelEdit={editingAppointment ? handleCancelEdit : undefined}
            isSubmitting={busy}
            actionBlocked={isLoadingSlots}
          />

          {showPostSubmitActions && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="default" className="w-full" onClick={handleBookAnother}>
                Book another
              </Button>
              <Button type="button" variant="outline" className="w-full" asChild>
                <Link href="/helpdesk/appointments">View appointments</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HelpdeskBookAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-3 py-8 text-sm text-muted-foreground md:max-w-2xl">
          Loading…
        </div>
      }
    >
      <BookAppointmentContent />
    </Suspense>
  );
}
