"use client";

import { format } from "date-fns";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import type {
  Appointment,
  AppointmentListTab,
  CreateAppointmentInput,
  MockDoctor,
  UpdateAppointmentInput,
} from "@/lib/helpdesk/helpdeskAppointmentTypes";
import {
  cancelAppointmentRequest,
  createAppointment as postAppointment,
  fetchAppointmentDetail,
  getAppointments,
  patchRescheduleAppointment,
  type GetAppointmentsParams,
} from "@/lib/api/appointments";
import { mapAppointmentListApiRow } from "@/lib/helpdesk/mapAppointmentListRow";
import axiosClient from "@/lib/axiosClient";

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export interface HelpdeskAppointmentMockContextValue {
  appointments: Appointment[];
  allAppointments: Appointment[];
  doctors: MockDoctor[];
  /** True until GET /api/queue/helpdesk/context/ finishes (success or error). */
  doctorsLoading: boolean;
  /** Helpdesk clinic from GET /api/queue/helpdesk/context/ (for booking payload). */
  clinicId: string | null;
  listTab: AppointmentListTab;
  setListTab: (t: AppointmentListTab) => void;
  /** Optional list filters (wired to API when set). */
  listDoctorId: string;
  setListDoctorId: (id: string) => void;
  listDate: string;
  setListDate: (d: string) => void;
  isLoading: boolean;
  mutationKey: string | null;
  fetchAppointments: () => Promise<void>;
  /** Load one appointment for reschedule when it is not in the current list tab. */
  resolveAppointmentForEdit: (id: string) => Promise<Appointment | null>;
  createAppointment: (input: CreateAppointmentInput) => Promise<Appointment>;
  updateAppointment: (input: UpdateAppointmentInput) => Promise<Appointment>;
  cancelAppointment: (id: string) => Promise<void>;
  checkInAppointment: (id: string) => Promise<void>;
  todayIso: string;
}

const HelpdeskAppointmentMockContext = createContext<HelpdeskAppointmentMockContextValue | null>(
  null
);

type HelpdeskContextApi = {
  clinic_id: string;
  doctor_id: string;
  doctor_ids: string[];
  doctors?: Array<{ id: string; name: string; specialization?: string }>;
};

export function HelpdeskAppointmentMockProvider({ children }: { children: ReactNode }) {
  const [listRows, setListRows] = useState<Appointment[]>([]);
  const [listTab, setListTab] = useState<AppointmentListTab>("today");
  const [listDoctorId, setListDoctorId] = useState("");
  const [listDate, setListDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mutationKey, setMutationKey] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<MockDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const listFetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDoctorsLoading(true);
      try {
        const { data } = await axiosClient.get<HelpdeskContextApi>("/queue/helpdesk/context/");
        if (cancelled) return;
        setClinicId(data.clinic_id);
        if (data.doctors?.length) {
          setDoctors(
            data.doctors.map((d) => ({
              id: d.id,
              name: (d.name && d.name.trim()) || "Doctor",
              specialization: (d.specialization ?? "").trim(),
            }))
          );
        } else {
          const ids = data.doctor_ids?.length ? data.doctor_ids : data.doctor_id ? [data.doctor_id] : [];
          setDoctors(
            ids.map((id) => ({
              id,
              name: "Doctor",
              specialization: "",
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setClinicId(null);
          setDoctors([]);
        }
      } finally {
        if (!cancelled) {
          setDoctorsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (doctorsLoading) return;

    listFetchAbortRef.current?.abort();
    const ac = new AbortController();
    listFetchAbortRef.current = ac;

    setIsLoading(true);
    try {
      const params: GetAppointmentsParams = { tab: listTab };
      if (clinicId?.trim()) params.clinic_id = clinicId.trim();
      if (listDoctorId.trim()) params.doctor_id = listDoctorId.trim();
      if (listDate.trim()) params.date = listDate.trim();

      const res = await getAppointments(params, { signal: ac.signal });
      if (ac.signal.aborted) return;

      if (res.status >= 200 && res.status < 300 && Array.isArray(res.data)) {
        setListRows(res.data.map((row) => mapAppointmentListApiRow(row)));
      } else {
        toast.error("Failed to load appointments");
        setListRows([]);
      }
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      const name = (e as Error)?.name;
      if (code === "ERR_CANCELED" || name === "CanceledError") return;
      toast.error("Failed to load appointments");
      setListRows([]);
    } finally {
      if (!ac.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [listTab, clinicId, listDoctorId, listDate, doctorsLoading]);

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  const resolveAppointmentForEdit = useCallback(
    async (lookupId: string): Promise<Appointment | null> => {
      const hit = listRows.find((x) => x.id === lookupId);
      if (hit) return hit;
      const res = await fetchAppointmentDetail(lookupId);
      const body = res.data;
      if (
        res.status === 200 &&
        body &&
        typeof body === "object" &&
        body.status === "success" &&
        body.data
      ) {
        return mapAppointmentListApiRow(body.data);
      }
      return null;
    },
    [listRows]
  );

  const createAppointment = useCallback(
    async (input: CreateAppointmentInput): Promise<Appointment> => {
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

        const createFeeNum = Number.parseFloat(String(data.consultation_fee ?? input.consultationFee));
        const row: Appointment = {
          id: String(data.id),
          patientProfileId: input.patientProfileId,
          patientAccountId: patientAccountId.trim(),
          clinicId: inputClinicId.trim(),
          patientName: data.patient_name,
          doctorId: input.doctorId,
          doctorName: data.doctor_name,
          appointmentDate: data.appointment_date,
          appointmentTime: startDisplay,
          consultationMode: (data.consultation_mode as Appointment["consultationMode"]) ?? input.consultationMode,
          appointmentType: (data.appointment_type as Appointment["appointmentType"]) ?? input.appointmentType,
          consultationFee: Number.isFinite(createFeeNum) ? createFeeNum : input.consultationFee,
          notes: typeof data.notes === "string" ? data.notes : input.notes,
          status: (data.status as Appointment["status"]) || "scheduled",
        };

        await fetchAppointments();
        return row;
      } finally {
        setMutationKey(null);
      }
    },
    [fetchAppointments]
  );

  const updateAppointment = useCallback(
    async (input: UpdateAppointmentInput): Promise<Appointment> => {
      const clinicId = input.clinicId?.trim();
      const slotStartTime = input.slotStartTime?.trim();
      const slotEndTime = input.slotEndTime?.trim();
      if (!clinicId || !slotStartTime || !slotEndTime) {
        throw new Error("MISSING_BOOKING_FIELDS");
      }

      setMutationKey("update");
      try {
        const { data } = await patchRescheduleAppointment(input.id, {
          doctor_id: input.doctorId,
          clinic_id: clinicId,
          appointment_date: input.appointmentDate,
          slot_start_time: slotStartTime,
          slot_end_time: slotEndTime,
          consultation_mode: input.consultationMode,
          appointment_type: input.appointmentType,
          consultation_fee: input.consultationFee,
          notes: input.notes ?? "",
        });
        const startDisplay =
          data.slot_start_time.length >= 5 ? data.slot_start_time.slice(0, 5) : data.slot_start_time;
        const feeNum = Number.parseFloat(String(data.consultation_fee ?? input.consultationFee));
        const row: Appointment = {
          id: String(data.id),
          patientProfileId: input.patientProfileId,
          patientAccountId: input.patientAccountId?.trim(),
          clinicId,
          patientName: data.patient_name,
          doctorId: input.doctorId,
          doctorName: data.doctor_name,
          appointmentDate: data.appointment_date,
          appointmentTime: startDisplay,
          consultationMode: (data.consultation_mode as Appointment["consultationMode"]) ?? input.consultationMode,
          appointmentType: (data.appointment_type as Appointment["appointmentType"]) ?? input.appointmentType,
          consultationFee: Number.isFinite(feeNum) ? feeNum : input.consultationFee,
          notes: typeof data.notes === "string" ? data.notes : input.notes,
          status: (data.status as Appointment["status"]) || "scheduled",
        };
        await fetchAppointments();
        return row;
      } finally {
        setMutationKey(null);
      }
    },
    [fetchAppointments]
  );

  const cancelAppointment = useCallback(
    async (id: string) => {
      setMutationKey("cancel");
      try {
        const res = await cancelAppointmentRequest(id);
        if (res.status < 200 || res.status >= 300) {
          throw new Error("CANCEL_FAILED");
        }
        await fetchAppointments();
      } finally {
        setMutationKey(null);
      }
    },
    [fetchAppointments]
  );

  const checkInAppointment = useCallback(
    async (id: string) => {
      setMutationKey("checkin");
      try {
        const row = listRows.find((a) => a.id === id);
        if (!row) throw new Error("NOT_FOUND");
        const clinic = row.clinicId ?? clinicId ?? "";
        const patientAccountId = row.patientAccountId?.trim();
        const patientProfileId = row.patientProfileId?.trim();
        if (!clinic || !patientAccountId || !patientProfileId) {
          throw new Error("MISSING_CHECKIN_FIELDS");
        }
        const { status } = await axiosClient.post("/queue/check-in/", {
          clinic_id: clinic,
          doctor_id: row.doctorId,
          patient_account_id: patientAccountId,
          patient_profile_id: patientProfileId,
          appointment_id: id,
        });
        if (status < 200 || status >= 300) {
          throw new Error("CHECKIN_FAILED");
        }
        await fetchAppointments();
      } finally {
        setMutationKey(null);
      }
    },
    [listRows, clinicId, fetchAppointments]
  );

  const todayIso = useMemo(() => todayStr(), []);

  const value = useMemo<HelpdeskAppointmentMockContextValue>(
    () => ({
      appointments: listRows,
      allAppointments: listRows,
      doctors,
      doctorsLoading,
      clinicId,
      listTab,
      setListTab,
      listDoctorId,
      setListDoctorId,
      listDate,
      setListDate,
      isLoading,
      mutationKey,
      fetchAppointments,
      resolveAppointmentForEdit,
      createAppointment,
      updateAppointment,
      cancelAppointment,
      checkInAppointment,
      todayIso,
    }),
    [
      listRows,
      doctors,
      doctorsLoading,
      clinicId,
      listTab,
      listDoctorId,
      listDate,
      isLoading,
      mutationKey,
      fetchAppointments,
      resolveAppointmentForEdit,
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
