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
  CreateAppointmentInput,
  HelpdeskAppointmentSection,
  MockDoctor,
  UpdateAppointmentInput,
} from "@/lib/helpdesk/helpdeskAppointmentTypes";
import {
  cancelAppointmentRequest,
  createAppointment as postAppointment,
  fetchAppointmentDetail,
  getAppointments,
  patchRescheduleAppointment,
  postAppointmentCheckIn,
  type AppointmentCheckInResponse,
  type GetAppointmentsParams,
} from "@/lib/api/appointments";
import { mapAppointmentListApiRow } from "@/lib/helpdesk/mapAppointmentListRow";
import {
  mergeFirstAppointmentPage,
  parseCursorFromNext,
} from "@/lib/helpdesk/appointmentListMerge";
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
  listSection: HelpdeskAppointmentSection;
  setListSection: (s: HelpdeskAppointmentSection) => void;
  listDoctorId: string;
  setListDoctorId: (id: string) => void;
  listDate: string;
  setListDate: (d: string) => void;
  listSearch: string;
  setListSearch: (q: string) => void;
  /** Empty string = all statuses */
  listStatus: string;
  setListStatus: (s: string) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  mutationKey: string | null;
  fetchAppointments: () => Promise<void>;
  loadMore: () => Promise<void>;
  resolveAppointmentForEdit: (id: string) => Promise<Appointment | null>;
  createAppointment: (input: CreateAppointmentInput) => Promise<Appointment>;
  updateAppointment: (input: UpdateAppointmentInput) => Promise<Appointment>;
  cancelAppointment: (id: string) => Promise<void>;
  checkInAppointment: (id: string) => Promise<AppointmentCheckInResponse>;
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
  const [listSection, setListSection] = useState<HelpdeskAppointmentSection>("primary");
  const [listDoctorId, setListDoctorId] = useState("");
  const [listDate, setListDate] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [mutationKey, setMutationKey] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<MockDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const listFetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(listSearch.trim()), 350);
    return () => window.clearTimeout(t);
  }, [listSearch]);

  const buildListParams = useCallback((): GetAppointmentsParams => {
    const params: GetAppointmentsParams = { section: listSection };
    if (clinicId?.trim()) params.clinic_id = clinicId.trim();
    if (listDoctorId.trim()) params.doctor_id = listDoctorId.trim();
    // Date filter applies only to Today (ops); it hides upcoming/archive rows.
    if (listSection === "primary" && listDate.trim()) params.date = listDate.trim();
    if (debouncedSearch) params.search = debouncedSearch;
    if (listStatus.trim()) params.status = listStatus.trim();
    return params;
  }, [listSection, clinicId, listDoctorId, listDate, debouncedSearch, listStatus]);

  const setListSectionWithDefaults = useCallback((section: HelpdeskAppointmentSection) => {
    setListSection(section);
    if (section !== "primary") {
      setListDate("");
    }
    if (section === "secondary") {
      setListStatus((prev) => (prev && prev !== "scheduled" ? "" : prev));
    }
  }, []);

  const loadInitial = useCallback(async () => {
    if (doctorsLoading) return;

    listFetchAbortRef.current?.abort();
    const ac = new AbortController();
    listFetchAbortRef.current = ac;

    setIsLoading(true);
    try {
      const res = await getAppointments(buildListParams(), { signal: ac.signal });
      if (ac.signal.aborted) return;

      if (res.status >= 200 && res.status < 300 && res.data && Array.isArray(res.data.results)) {
        setListRows(res.data.results.map((row) => mapAppointmentListApiRow(row)));
        setNextCursor(parseCursorFromNext(res.data.next));
      } else {
        toast.error("Failed to load appointments");
        setListRows([]);
        setNextCursor(undefined);
      }
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      const name = (e as Error)?.name;
      if (code === "ERR_CANCELED" || name === "CanceledError") return;
      toast.error("Failed to load appointments");
      setListRows([]);
      setNextCursor(undefined);
    } finally {
      if (!ac.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [buildListParams, doctorsLoading]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      const res = await getAppointments({ ...buildListParams(), cursor: nextCursor });
      if (res.status >= 200 && res.status < 300 && res.data && Array.isArray(res.data.results)) {
        const mapped = res.data.results.map((row) => mapAppointmentListApiRow(row));
        setListRows((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          const append = mapped.filter((x) => !seen.has(x.id));
          return [...prev, ...append];
        });
        setNextCursor(parseCursorFromNext(res.data.next));
      }
    } catch {
      toast.error("Could not load more appointments");
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, isLoading, buildListParams]);

  const pollFirstPage = useCallback(async () => {
    if (doctorsLoading || mutationKey) return;
    try {
      const res = await getAppointments(buildListParams());
      if (res.status >= 200 && res.status < 300 && res.data && Array.isArray(res.data.results)) {
        const mapped = res.data.results.map((row) => mapAppointmentListApiRow(row));
        setListRows((prev) => mergeFirstAppointmentPage(prev, mapped));
        setNextCursor(parseCursorFromNext(res.data.next));
      }
    } catch {
      /* ignore transient poll errors */
    }
  }, [buildListParams, doctorsLoading, mutationKey]);

  useEffect(() => {
    if (listSection !== "primary") return;
    if (doctorsLoading) return;
    const id = window.setInterval(() => {
      void pollFirstPage();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [listSection, doctorsLoading, pollFirstPage]);

  const fetchAppointments = useCallback(async () => {
    await loadInitial();
  }, [loadInitial]);

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
      const cid = input.clinicId?.trim();
      const slotStartTime = input.slotStartTime?.trim();
      const slotEndTime = input.slotEndTime?.trim();
      if (!cid || !slotStartTime || !slotEndTime) {
        throw new Error("MISSING_BOOKING_FIELDS");
      }

      setMutationKey("update");
      try {
        const { data } = await patchRescheduleAppointment(input.id, {
          doctor_id: input.doctorId,
          clinic_id: cid,
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
          clinicId: cid,
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
    async (id: string): Promise<AppointmentCheckInResponse> => {
      setMutationKey("checkin");
      try {
        const res = await postAppointmentCheckIn(id);
        if (res.status < 200 || res.status >= 300) {
          const raw = res.data as { all?: { code?: string; message?: string } } | undefined;
          const code = raw?.all?.code ?? "UNKNOWN_ERROR";
          const message = raw?.all?.message ?? "Something went wrong";
          const err = new Error(message);
          (err as { code?: string }).code = code;
          throw err;
        }
        await fetchAppointments();
        return res.data as AppointmentCheckInResponse;
      } finally {
        setMutationKey(null);
      }
    },
    [fetchAppointments]
  );

  const todayIso = useMemo(() => todayStr(), []);
  const hasMore = Boolean(nextCursor);

  const value = useMemo<HelpdeskAppointmentMockContextValue>(
    () => ({
      appointments: listRows,
      allAppointments: listRows,
      doctors,
      doctorsLoading,
      clinicId,
      listSection,
      setListSection: setListSectionWithDefaults,
      listDoctorId,
      setListDoctorId,
      listDate,
      setListDate,
      listSearch,
      setListSearch,
      listStatus,
      setListStatus,
      isLoading,
      isLoadingMore,
      hasMore,
      mutationKey,
      fetchAppointments,
      loadMore,
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
      listSection,
      setListSectionWithDefaults,
      listDoctorId,
      listDate,
      listSearch,
      listStatus,
      isLoading,
      isLoadingMore,
      hasMore,
      mutationKey,
      fetchAppointments,
      loadMore,
      resolveAppointmentForEdit,
      createAppointment,
      updateAppointment,
      cancelAppointment,
      checkInAppointment,
      todayIso,
    ]
  );

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
