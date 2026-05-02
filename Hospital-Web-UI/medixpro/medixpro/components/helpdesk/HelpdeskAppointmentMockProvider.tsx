"use client";

import { format, isAfter, isSameDay, parseISO, startOfDay } from "date-fns";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  Appointment,
  AppointmentListTab,
  CreateAppointmentInput,
  MockDoctor,
  UpdateAppointmentInput,
} from "@/lib/helpdesk/helpdeskAppointmentTypes";
import {
  buildSeedAppointments,
  mockDelay,
  MOCK_DOCTOR_UNAVAILABLE,
  nextAppointmentId,
} from "@/lib/helpdesk/helpdeskAppointmentMockStore";
import { createAppointment as postAppointment } from "@/lib/api/appointments";
import axiosClient from "@/lib/axiosClient";

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function matchesTab(a: Appointment, tab: AppointmentListTab): boolean {
  const today = startOfDay(new Date());
  const d = startOfDay(parseISO(a.appointmentDate));

  switch (tab) {
    case "today":
      return isSameDay(d, today) && (a.status === "scheduled" || a.status === "checked_in");
    case "upcoming":
      return isAfter(d, today) && a.status === "scheduled";
    case "completed":
      return a.status === "completed";
    case "cancelled":
      return a.status === "cancelled";
    default:
      return false;
  }
}

function hasSlotConflict(
  rows: Appointment[],
  doctorId: string,
  date: string,
  time: string,
  excludeId?: string
): boolean {
  return rows.some(
    (x) =>
      x.id !== excludeId &&
      x.doctorId === doctorId &&
      x.appointmentDate === date &&
      x.appointmentTime === time &&
      (x.status === "scheduled" || x.status === "checked_in")
  );
}

export interface HelpdeskAppointmentMockContextValue {
  appointments: Appointment[];
  allAppointments: Appointment[];
  doctors: MockDoctor[];
  /** Helpdesk clinic from GET /api/queue/helpdesk/context/ (for booking payload). */
  clinicId: string | null;
  listTab: AppointmentListTab;
  setListTab: (t: AppointmentListTab) => void;
  isLoading: boolean;
  mutationKey: string | null;
  fetchAppointments: () => Promise<void>;
  createAppointment: (input: CreateAppointmentInput) => Promise<Appointment>;
  updateAppointment: (input: UpdateAppointmentInput) => Promise<Appointment>;
  cancelAppointment: (id: string) => Promise<void>;
  checkInAppointment: (id: string) => Promise<void>;
  todayIso: string;
}

const HelpdeskAppointmentMockContext = createContext<HelpdeskAppointmentMockContextValue | null>(
  null
);

type HelpdeskContextApi = { clinic_id: string; doctor_id: string; doctor_ids: string[] };

export function HelpdeskAppointmentMockProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Appointment[]>(() => buildSeedAppointments());
  const [listTab, setListTab] = useState<AppointmentListTab>("today");
  const [isLoading, setIsLoading] = useState(false);
  const [mutationKey, setMutationKey] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<MockDoctor[]>([]);
  const [clinicId, setClinicId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosClient.get<HelpdeskContextApi>("/queue/helpdesk/context/");
        if (cancelled) return;
        setClinicId(data.clinic_id);
        const ids = data.doctor_ids?.length ? data.doctor_ids : data.doctor_id ? [data.doctor_id] : [];
        setDoctors(
          ids.map((id) => ({
            id,
            name: "Doctor",
            specialization: "",
          }))
        );
      } catch {
        if (!cancelled) {
          setClinicId(null);
          setDoctors([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const appointments = useMemo(
    () => store.filter((a) => matchesTab(a, listTab)),
    [store, listTab]
  );

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      await mockDelay(500, 900);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAppointment = useCallback(async (input: CreateAppointmentInput): Promise<Appointment> => {
    const {
      patientAccountId,
      clinicId: inputClinicId,
      slotStartTime,
      slotEndTime,
    } = input;

    if (
      !patientAccountId?.trim() ||
      !inputClinicId?.trim() ||
      !slotStartTime?.trim() ||
      !slotEndTime?.trim()
    ) {
      throw new Error("MISSING_BOOKING_FIELDS");
    }

    setMutationKey("create");
    try {
      const { data } = await postAppointment({
        patient_account_id: patientAccountId.trim(),
        patient_profile_id: input.patientProfileId,
        doctor_id: input.doctorId,
        clinic_id: inputClinicId.trim(),
        appointment_date: input.appointmentDate,
        slot_start_time: slotStartTime.trim(),
        slot_end_time: slotEndTime.trim(),
        consultation_mode: input.consultationMode,
        appointment_type: input.appointmentType,
        consultation_fee: input.consultationFee,
        notes: input.notes ?? "",
      });

      const startDisplay =
        data.slot_start_time.length >= 5 ? data.slot_start_time.slice(0, 5) : data.slot_start_time;

      const row: Appointment = {
        id: String(data.id),
        patientProfileId: input.patientProfileId,
        patientName: data.patient_name,
        doctorId: input.doctorId,
        doctorName: data.doctor_name,
        appointmentDate: data.appointment_date,
        appointmentTime: startDisplay,
        consultationMode: input.consultationMode,
        appointmentType: input.appointmentType,
        consultationFee: input.consultationFee,
        notes: input.notes,
        status: (data.status as Appointment["status"]) || "scheduled",
      };

      setStore((prev) => [...prev, row]);
      return row;
    } catch (e) {
      throw e;
    } finally {
      setMutationKey(null);
    }
  }, []);

  const updateAppointment = useCallback(async (input: UpdateAppointmentInput): Promise<Appointment> => {
    setMutationKey("update");
    await mockDelay(500, 1000);

    let updated: Appointment | undefined;
    let conflicted = false;
    let missing = false;

    setStore((prev) => {
      const exists = prev.some((a) => a.id === input.id);
      if (!exists) {
        missing = true;
        return prev;
      }
      if (
        hasSlotConflict(prev, input.doctorId, input.appointmentDate, input.appointmentTime, input.id)
      ) {
        conflicted = true;
        return prev;
      }
      return prev.map((a) => {
        if (a.id !== input.id) return a;
        updated = {
          ...a,
          patientProfileId: input.patientProfileId,
          patientName: input.patientName,
          doctorId: input.doctorId,
          doctorName: input.doctorName,
          appointmentDate: input.appointmentDate,
          appointmentTime: input.appointmentTime,
          consultationMode: input.consultationMode,
          appointmentType: input.appointmentType,
          consultationFee: input.consultationFee,
          notes: input.notes,
        };
        return updated;
      });
    });

    setMutationKey(null);
    if (missing) throw new Error("NOT_FOUND");
    if (conflicted) throw new Error("SLOT_CONFLICT");
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  }, []);

  const cancelAppointment = useCallback(async (id: string) => {
    setMutationKey("cancel");
    await mockDelay(500, 800);
    setStore((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelled" as const } : a))
    );
    setMutationKey(null);
  }, []);

  const checkInAppointment = useCallback(async (id: string) => {
    setMutationKey("checkin");
    await mockDelay(500, 800);
    setStore((prev) =>
      prev.map((a) =>
        a.id === id && a.status === "scheduled" ? { ...a, status: "checked_in" as const } : a
      )
    );
    setMutationKey(null);
  }, []);

  const todayIso = useMemo(() => todayStr(), []);

  const value = useMemo<HelpdeskAppointmentMockContextValue>(
    () => ({
      appointments,
      allAppointments: store,
      doctors,
      clinicId,
      listTab,
      setListTab,
      isLoading,
      mutationKey,
      fetchAppointments,
      createAppointment,
      updateAppointment,
      cancelAppointment,
      checkInAppointment,
      todayIso,
    }),
    [
      appointments,
      store,
      doctors,
      clinicId,
      listTab,
      isLoading,
      mutationKey,
      fetchAppointments,
      createAppointment,
      updateAppointment,
      cancelAppointment,
      checkInAppointment,
      todayIso,
    ]
  );

  return (
    <HelpdeskAppointmentMockContext.Provider value={value}>
      {children}
    </HelpdeskAppointmentMockContext.Provider>
  );
}

export function useHelpdeskAppointmentsMock(): HelpdeskAppointmentMockContextValue {
  const ctx = useContext(HelpdeskAppointmentMockContext);
  if (!ctx) {
    throw new Error(
      "useHelpdeskAppointmentsMock must be used within HelpdeskAppointmentMockProvider (wrap helpdesk layout)."
    );
  }
  return ctx;
}
