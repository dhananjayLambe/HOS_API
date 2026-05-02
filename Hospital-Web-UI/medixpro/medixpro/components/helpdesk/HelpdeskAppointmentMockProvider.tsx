"use client";

import { format, isAfter, isSameDay, parseISO, startOfDay } from "date-fns";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  Appointment,
  AppointmentListTab,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "@/lib/helpdesk/helpdeskAppointmentTypes";
import {
  buildSeedAppointments,
  mockDelay,
  MOCK_DOCTORS,
  MOCK_DOCTOR_UNAVAILABLE,
  nextAppointmentId,
} from "@/lib/helpdesk/helpdeskAppointmentMockStore";

const DOCTORS_FOR_UI = [...MOCK_DOCTORS, MOCK_DOCTOR_UNAVAILABLE];

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
  doctors: typeof DOCTORS_FOR_UI;
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

export function HelpdeskAppointmentMockProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Appointment[]>(() => buildSeedAppointments());
  const [listTab, setListTab] = useState<AppointmentListTab>("today");
  const [isLoading, setIsLoading] = useState(false);
  const [mutationKey, setMutationKey] = useState<string | null>(null);

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
    setMutationKey("create");
    await mockDelay(500, 1000);

    const row: Appointment = {
      id: nextAppointmentId(),
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
      status: "scheduled",
    };

    let created: Appointment | undefined;
    let conflicted = false;
    setStore((prev) => {
      if (hasSlotConflict(prev, input.doctorId, input.appointmentDate, input.appointmentTime)) {
        conflicted = true;
        return prev;
      }
      if (Math.random() < 0.05) {
        conflicted = true;
        return prev;
      }
      created = row;
      return [...prev, row];
    });

    setMutationKey(null);
    if (conflicted || !created) {
      throw new Error("SLOT_CONFLICT");
    }
    return created;
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
      doctors: DOCTORS_FOR_UI,
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
