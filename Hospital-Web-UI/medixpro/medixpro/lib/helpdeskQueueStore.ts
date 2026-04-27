"use client";

import { create } from "zustand";
import { useMemo } from "react";
import { toast } from "sonner";
import axiosClient, { backendAxiosClient } from "@/lib/axiosClient";

export type QueueStatus = "waiting" | "vitals_done" | "in_consultation" | "completed";

/** Persisted vitals shape (aligned with POST /api/visits/{visit_id}/vitals/) */
export interface HelpdeskVitalsPayload {
  bp_systolic?: number;
  bp_diastolic?: number;
  weight?: number;
  height?: number;
  temperature?: number;
}

function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

export interface QueueEntry {
  id: string;
  /** ClinicalEncounter UUID when linked from server check-in */
  visitId: string | null;
  /** Human-readable visit identifier shown to users */
  visitPnr?: string | null;
  patientProfileId?: string;
  name: string;
  mobile: string;
  age?: number;
  gender?: string;
  /** Display token (e.g. appointment token); falls back to queue position in UI */
  token?: string;
  status: QueueStatus;
  priority: number;
  vitals: HelpdeskVitalsPayload | null;
  /** Present for server-backed rows — used for queue mutations */
  clinicId?: string | null;
  doctorId?: string | null;
}

export function vitalsPreviewLine(vitals: HelpdeskVitalsPayload | null | undefined): string | null {
  if (!vitals) return null;
  const parts: string[] = [];
  const sys = vitals.bp_systolic;
  const dia = vitals.bp_diastolic;
  if (sys != null && dia != null) parts.push(`BP: ${sys}/${dia}`);
  if (vitals.weight != null) parts.push(`W: ${vitals.weight}kg`);
  if (vitals.height != null) parts.push(`H: ${vitals.height}ft`);
  if (vitals.temperature != null) parts.push(`T: ${vitals.temperature}°F`);
  return parts.length ? parts.join(" | ") : null;
}

export function hasMeaningfulVitals(v: HelpdeskVitalsPayload | null | undefined): boolean {
  if (!v) return false;
  const bpPair = v.bp_systolic != null && v.bp_diastolic != null;
  const bpPartial = v.bp_systolic != null || v.bp_diastolic != null;
  if (bpPartial && !bpPair) return false;
  const other = v.weight != null || v.height != null || v.temperature != null;
  return bpPair || other;
}

function maskMobile(m: string): string {
  const d = m.replace(/\D/g, "");
  if (d.length < 4) return m;
  return `${d.slice(0, 2)}XXXXXX${d.slice(-2)}`;
}

function normalizeMobile(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

function isSamePatientEntry(
  left: { patientProfileId?: string; mobile?: string | null },
  right: { patientProfileId?: string; mobile?: string | null }
): boolean {
  if (left.patientProfileId && right.patientProfileId) {
    return left.patientProfileId === right.patientProfileId;
  }
  const lm = normalizeMobile(left.mobile);
  const rm = normalizeMobile(right.mobile);
  if (!left.patientProfileId && !right.patientProfileId && lm.length >= 10 && rm.length >= 10) {
    return lm === rm;
  }
  return false;
}

/** sessionStorage key — tracks which calendar day the helpdesk queue UI was last aligned to (local timezone). */
const HELPDESK_QUEUE_DAY_KEY = "medixpro_helpdesk_queue_calendar_day";

/** Local calendar date `YYYY-MM-DD` for “today’s queue” boundaries. */
export function helpdeskQueueCalendarDayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when the browser tab has a stored day that is not today (e.g. tab left open past midnight). */
export function isHelpdeskQueueCalendarDayStale(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const stored = sessionStorage.getItem(HELPDESK_QUEUE_DAY_KEY);
  if (stored === null) return false;
  return stored !== helpdeskQueueCalendarDayLocal();
}

/** Raw row from `HelpdeskQueueRowSerializer` (GET queue/helpdesk/today/). */
interface HelpdeskQueueRowApi {
  id: string;
  visit_id: string | null;
  visit_pnr?: string | null;
  patient?: string | null;
  patient_name?: string | null;
  patient_mobile?: string | null;
  age?: number | null;
  gender?: string | null;
  token?: string | null;
  vitals?: Record<string, unknown> | null;
  status: string;
  position_in_queue?: number | null;
  doctor?: string | null;
  clinic?: string | null;
}

function mapApiStatus(raw: string): QueueStatus {
  if (raw === "waiting" || raw === "vitals_done" || raw === "in_consultation" || raw === "completed") {
    return raw;
  }
  return "completed";
}

function vitalsFromPreview(vitals: Record<string, unknown> | null | undefined): HelpdeskVitalsPayload | null {
  if (!vitals || typeof vitals !== "object") return null;
  const out: HelpdeskVitalsPayload = {};
  const bp = vitals.bp;
  if (typeof bp === "string") {
    const m = /^(\d+)\s*\/\s*(\d+)$/.exec(bp.trim());
    if (m) {
      out.bp_systolic = Number(m[1]);
      out.bp_diastolic = Number(m[2]);
    }
  }
  const w = vitals.weight;
  if (typeof w === "number") out.weight = w;
  else if (typeof w === "string" && w.trim() !== "") {
    const n = Number(w);
    if (!Number.isNaN(n)) out.weight = n;
  }
  const h = vitals.height;
  if (typeof h === "number") out.height = h;
  else if (typeof h === "string" && h.trim() !== "") {
    const n = Number(h);
    if (!Number.isNaN(n)) out.height = n;
  }
  const t = vitals.temperature;
  if (typeof t === "number") out.temperature = t;
  else if (typeof t === "string" && t.trim() !== "") {
    const n = Number(t);
    if (!Number.isNaN(n)) out.temperature = n;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Map GET /api/visits/{visit_id}/vitals/ body to the same shape used for POST.
 * Use when opening the vitals dialog so fields match server state (not just queue preview).
 */
export function mapVisitVitalsApiResponse(data: unknown): HelpdeskVitalsPayload | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const out: HelpdeskVitalsPayload = {};
  if (typeof d.bp_systolic === "number") out.bp_systolic = d.bp_systolic;
  if (typeof d.bp_diastolic === "number") out.bp_diastolic = d.bp_diastolic;
  if (typeof d.weight === "number") out.weight = d.weight;
  else if (typeof d.weight === "string" && d.weight.trim() !== "") {
    const n = Number(d.weight);
    if (!Number.isNaN(n)) out.weight = n;
  }
  if (typeof d.height === "number") out.height = d.height;
  else if (typeof d.height === "string" && d.height.trim() !== "") {
    const n = Number(d.height);
    if (!Number.isNaN(n)) out.height = n;
  }
  const tempUnit = typeof d.temperature_unit === "string" ? d.temperature_unit.toLowerCase() : "c";
  if (typeof d.temperature === "number") {
    out.temperature = tempUnit === "f" ? d.temperature : Number(cToF(d.temperature).toFixed(2));
  } else if (typeof d.temperature === "string" && d.temperature.trim() !== "") {
    const n = Number(d.temperature);
    if (!Number.isNaN(n)) out.temperature = tempUnit === "f" ? n : Number(cToF(n).toFixed(2));
  }
  return Object.keys(out).length ? out : null;
}

function mapHelpdeskQueueRowToEntry(row: HelpdeskQueueRowApi): QueueEntry {
  const pos = row.position_in_queue ?? 0;
  const status = mapApiStatus(row.status);
  return {
    id: row.id,
    visitId: row.visit_id,
    visitPnr: row.visit_pnr ?? null,
    patientProfileId: row.patient ?? undefined,
    name: (row.patient_name || "").trim() || "Patient",
    mobile: (row.patient_mobile || "").trim(),
    age: row.age ?? undefined,
    gender: row.gender ?? undefined,
    token: row.token ?? undefined,
    status,
    priority: 10_000 - pos,
    vitals: vitalsFromPreview(row.vitals ?? undefined),
    clinicId: row.clinic ?? null,
    doctorId: row.doctor ?? null,
  };
}

function mapHelpdeskQueueApiResponse(rows: unknown): QueueEntry[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => mapHelpdeskQueueRowToEntry(r as HelpdeskQueueRowApi));
}

interface HelpdeskQueueState {
  entries: QueueEntry[];
  headerSearch: string;
  /** Scroll/highlight a row after add-to-queue */
  highlightQueueEntryId: string | null;
  setHeaderSearch: (q: string) => void;
  setHighlightQueueEntryId: (id: string | null) => void;
  hydrateFromServer: (serverEntries: QueueEntry[]) => void;
  fetchTodayQueue: () => Promise<{ rolledOver: boolean }>;
  addPatient: (name: string, mobile: string) => string;
  addPatientFromSearch: (patient: { id: string; full_name: string; mobile?: string | null }) => string;
  findEntryByPatient: (patient: { id: string; mobile?: string | null }) => QueueEntry | null;
  moveToTop: (id: string) => Promise<void>;
  saveVitals: (id: string, vitals: HelpdeskVitalsPayload) => void;
  startConsultation: (id: string) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
}

let idCounter = 100;

/** Coalesce overlapping refreshes (poll + day watch + visibility). */
let fetchTodayQueueInFlight: Promise<{ rolledOver: boolean }> | null = null;

export const useHelpdeskQueueStore = create<HelpdeskQueueState>((set, get) => ({
  entries: [],
  headerSearch: "",
  highlightQueueEntryId: null,

  setHeaderSearch: (q) => set({ headerSearch: q }),
  setHighlightQueueEntryId: (id) => set({ highlightQueueEntryId: id }),

  hydrateFromServer: (serverEntries) => {
    set((s) => {
      const locals = s.entries.filter((e) => e.id.startsWith("hq-"));
      const mergedLocals = locals.filter(
        (loc) =>
          !serverEntries.some(
            (se) => isSamePatientEntry(loc, se)
          )
      );
      return { entries: [...serverEntries, ...mergedLocals] };
    });
  },

  fetchTodayQueue: () => {
    if (fetchTodayQueueInFlight) return fetchTodayQueueInFlight;
    fetchTodayQueueInFlight = (async () => {
      let rolledOver = false;
      if (typeof sessionStorage !== "undefined") {
        const today = helpdeskQueueCalendarDayLocal();
        const prev = sessionStorage.getItem(HELPDESK_QUEUE_DAY_KEY);
        if (prev !== null && prev !== today) {
          rolledOver = true;
          idCounter = 100;
          set({
            entries: [],
            highlightQueueEntryId: null,
            headerSearch: "",
          });
        }
        sessionStorage.setItem(HELPDESK_QUEUE_DAY_KEY, today);
      }

      const { data } = await axiosClient.get<unknown>("/queue/helpdesk/today/");
      const mapped = mapHelpdeskQueueApiResponse(data);
      get().hydrateFromServer(mapped);
      if (rolledOver && typeof window !== "undefined") {
        toast.message("New day — today's queue was refreshed; yesterday's list was cleared.");
      }
      return { rolledOver };
    })().finally(() => {
      fetchTodayQueueInFlight = null;
    });
    return fetchTodayQueueInFlight;
  },

  addPatient: (name, mobile) => {
    const id = `hq-${++idCounter}`;
    set((s) => {
      const maxP = s.entries.reduce((m, e) => Math.max(m, e.priority), 0);
      return {
        entries: [
          ...s.entries,
          {
            id,
            visitId: null,
            patientProfileId: undefined,
            name: name.trim(),
            mobile: mobile.trim(),
            age: undefined,
            gender: undefined,
            token: undefined,
            status: "waiting" as const,
            priority: maxP + 1,
            vitals: null,
            clinicId: null,
            doctorId: null,
          },
        ],
      };
    });
    return id;
  },

  addPatientFromSearch: (patient) => {
    const existing = get().findEntryByPatient(patient);
    if (existing) return existing.id;

    const id = `hq-${++idCounter}`;
    set((s) => {
      const maxP = s.entries.reduce((m, e) => Math.max(m, e.priority), 0);
      return {
        entries: [
          ...s.entries,
          {
            id,
            visitId: null,
            patientProfileId: patient.id,
            name: (patient.full_name || "").trim() || "Unnamed Patient",
            mobile: (patient.mobile || "").trim(),
            age: undefined,
            gender: undefined,
            token: undefined,
            status: "waiting" as const,
            priority: maxP + 1,
            vitals: null,
            clinicId: null,
            doctorId: null,
          },
        ],
      };
    });
    return id;
  },

  findEntryByPatient: (patient) => {
    const targetMobile = normalizeMobile(patient.mobile);
    const entries = get().entries;
    return (
      entries.find((entry) => entry.patientProfileId && entry.patientProfileId === patient.id) ??
      (!patient.id
        ? entries.find((entry) => normalizeMobile(entry.mobile) === targetMobile)
        : null) ??
      null
    );
  },

  moveToTop: async (id) => {
    const e = get().entries.find((x) => x.id === id);
    if (!e || (e.status !== "waiting" && e.status !== "vitals_done")) return;
    if (!e.id.startsWith("hq-")) {
      await backendAxiosClient.patch("queue/urgent/", { queue_id: id });
      await get().fetchTodayQueue();
      return;
    }
    set((s) => {
      const maxP = s.entries.reduce((m, x) => Math.max(m, x.priority), 0);
      return {
        entries: s.entries.map((x) => (x.id === id ? { ...x, priority: maxP + 1 } : x)),
      };
    });
  },

  saveVitals: (id, vitals) =>
    set((s) => ({
      entries: s.entries.map((e) => {
        if (e.id !== id) return e;
        if (e.status === "in_consultation" || e.status === "completed") {
          return { ...e, vitals: { ...(e.vitals ?? {}), ...vitals } };
        }
        const merged: HelpdeskVitalsPayload = { ...(e.vitals ?? {}), ...vitals };
        const meaningful = hasMeaningfulVitals(merged);
        const nextStatus: QueueStatus = meaningful ? "vitals_done" : "waiting";
        return { ...e, vitals: merged, status: nextStatus };
      }),
    })),

  startConsultation: async (id) => {
    throw new Error("Only doctor can start consultation.");
  },

  removeFromQueue: async (id) => {
    const e = get().entries.find((x) => x.id === id);
    if (e && !e.id.startsWith("hq-")) {
      await backendAxiosClient.patch("queue/skip/", { queue_id: id, clinic_id: e.clinicId });
      await get().fetchTodayQueue();
      return;
    }
    set((s) => ({
      entries: s.entries.filter((row) => row.id !== id),
    }));
  },
}));

export { maskMobile };

/**
 * Sorted by priority; filtered by header search (name / mobile digits).
 * Active = not completed (completed rows optional in product; we still list for audit).
 */
export function useFilteredQueueEntries(): QueueEntry[] {
  const entries = useHelpdeskQueueStore((s) => s.entries);
  const headerSearch = useHelpdeskQueueStore((s) => s.headerSearch);
  return useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    const list = [...entries].sort((a, b) => b.priority - a.priority);
    if (!q) return list;
    const digits = q.replace(/\D/g, "");
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (digits.length > 0 && e.mobile.replace(/\D/g, "").includes(digits))
    );
  }, [entries, headerSearch]);
}
