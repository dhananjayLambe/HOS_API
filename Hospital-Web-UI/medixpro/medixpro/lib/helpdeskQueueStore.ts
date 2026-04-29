"use client";

import { create } from "zustand";
import { useMemo } from "react";
import { toast } from "sonner";
import axiosClient, { backendAxiosClient } from "@/lib/axiosClient";
import { debugSessionLog } from "@/lib/debugSessionLog";

export type QueueStatus = "waiting" | "vitals_done" | "in_consultation" | "completed";
export const DRAGGABLE_STATUSES: ReadonlyArray<QueueStatus> = ["waiting", "vitals_done"];

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

type MoveDirection = "top" | "up" | "down" | "bottom";

type ReorderQueueItemPayload = {
  id: string;
  position: number;
};

function isServerBackedEntry(entry: QueueEntry): boolean {
  return !entry.id.startsWith("hq-");
}

export function isQueueEntryDraggable(status: QueueStatus): boolean {
  return DRAGGABLE_STATUSES.includes(status);
}

function byPriorityDesc(a: QueueEntry, b: QueueEntry): number {
  return b.priority - a.priority;
}

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function applySortedPriority(entries: QueueEntry[], sorted: QueueEntry[]): QueueEntry[] {
  const max = sorted.length;
  const byId = new Map<string, number>();
  sorted.forEach((entry, idx) => {
    byId.set(entry.id, max - idx);
  });
  return entries.map((entry) => {
    const p = byId.get(entry.id);
    return p == null ? entry : { ...entry, priority: p };
  });
}

function sameQueueScope(a: QueueEntry, b: QueueEntry): boolean {
  return a.doctorId === b.doctorId && a.clinicId === b.clinicId;
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

/** Compare profile UUIDs from DRF; ignores dash/case differences. */
function profileIdsEqual(a: string | undefined, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}

function isSamePatientEntry(
  left: { patientProfileId?: string; mobile?: string | null },
  right: { patientProfileId?: string; mobile?: string | null }
): boolean {
  if (left.patientProfileId && right.patientProfileId) {
    return profileIdsEqual(left.patientProfileId, right.patientProfileId);
  }
  const lm = normalizeMobile(left.mobile);
  const rm = normalizeMobile(right.mobile);
  if (!left.patientProfileId && !right.patientProfileId && lm.length >= 10 && rm.length >= 10) {
    return lm === rm;
  }
  return false;
}

/**
 * sessionStorage key — Django `localdate()` used for `created_at__date` on GET helpdesk/today/
 * (see response header `X-Queue-Calendar-Date`). Rollover must use this, not the browser-only
 * calendar day, or tabs near midnight can clear/refetch against the wrong server "today".
 */
const HELPDESK_QUEUE_SERVER_DAY_KEY = "medixpro_helpdesk_server_queue_date";

/** Local calendar date `YYYY-MM-DD` (browser) — used for WebSocket path segments only. */
export function helpdeskQueueCalendarDayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  isReorderUpdating: boolean;
  isReordering: boolean;
  setHeaderSearch: (q: string) => void;
  setHighlightQueueEntryId: (id: string | null) => void;
  startRealtimeSync: () => void;
  stopRealtimeSync: () => void;
  reorderEntries: (activeId: string, overId: string) => Promise<boolean>;
  moveEntry: (id: string, direction: MoveDirection) => Promise<boolean>;
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
let queueUpdatesWs: WebSocket | null = null;

/** Coalesce overlapping refreshes (poll + day watch + visibility). */
let fetchTodayQueueInFlight: Promise<{ rolledOver: boolean }> | null = null;

export const useHelpdeskQueueStore = create<HelpdeskQueueState>((set, get) => ({
  entries: [],
  headerSearch: "",
  highlightQueueEntryId: null,
  isReorderUpdating: false,
  isReordering: false,

  setHeaderSearch: (q) => set({ headerSearch: q }),
  setHighlightQueueEntryId: (id) => set({ highlightQueueEntryId: id }),

  startRealtimeSync: () => {
    if (typeof window === "undefined" || queueUpdatesWs) return;
    const explicit = process.env.NEXT_PUBLIC_WS_URL?.trim();
    if (!explicit) return;
    const first = get().entries.find((entry) => !!entry.clinicId && !!entry.doctorId);
    if (!first?.clinicId || !first?.doctorId) return;
    const date = helpdeskQueueCalendarDayLocal();
    const wsBase = explicit.replace(/\/+$/, "");
    const wsUrl = `${wsBase}/ws/queue-updates/${first.clinicId}/${first.doctorId}/${date}/`;
    try {
      queueUpdatesWs = new WebSocket(wsUrl);
    } catch {
      queueUpdatesWs = null;
      return;
    }
    queueUpdatesWs.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { clinic_id?: string; doctor_id?: string };
        if (!payload.clinic_id || !payload.doctor_id) return;
        const hasScope = get().entries.some(
          (entry) => entry.clinicId === payload.clinic_id && entry.doctorId === payload.doctor_id
        );
        if (!hasScope || get().isReordering) return;
        void get().fetchTodayQueue().catch(() => undefined);
      } catch {
        // Ignore malformed websocket message payloads.
      }
    };
    queueUpdatesWs.onclose = () => {
      queueUpdatesWs = null;
    };
    queueUpdatesWs.onerror = () => {
      queueUpdatesWs?.close();
      queueUpdatesWs = null;
    };
  },

  stopRealtimeSync: () => {
    if (queueUpdatesWs) {
      queueUpdatesWs.close();
      queueUpdatesWs = null;
    }
  },

  reorderEntries: async (activeId, overId) => {
    if (activeId === overId) return false;
    if (get().isReorderUpdating) return false;

    const previousEntries = get().entries;
    const sorted = [...previousEntries].sort(byPriorityDesc);
    const fromIndex = sorted.findIndex((entry) => entry.id === activeId);
    const toIndex = sorted.findIndex((entry) => entry.id === overId);
    if (fromIndex < 0 || toIndex < 0) return false;

    const active = sorted[fromIndex];
    const over = sorted[toIndex];
    if (!isQueueEntryDraggable(active.status) || !isQueueEntryDraggable(over.status)) return false;
    if (!sameQueueScope(active, over)) return false;

    const nextSorted = applySortedPriority(previousEntries, arrayMove(sorted, fromIndex, toIndex)).sort(byPriorityDesc);
    set({ entries: nextSorted, isReorderUpdating: true, isReordering: true });

    try {
      const scoped = nextSorted.filter(
        (entry) => isServerBackedEntry(entry) && sameQueueScope(entry, active) && isQueueEntryDraggable(entry.status)
      );
      if (scoped.length > 0) {
        const queue: ReorderQueueItemPayload[] = scoped.map((entry, index) => ({
          id: entry.id,
          position: index + 1,
        }));
        await axiosClient.patch("/queue/helpdesk/reorder/", { queue });
      }
      return true;
    } catch (error) {
      set({ entries: previousEntries });
      throw error;
    } finally {
      set({ isReorderUpdating: false, isReordering: false });
    }
  },

  moveEntry: async (id, direction) => {
    if (get().isReorderUpdating) return false;
    const sorted = [...get().entries].sort(byPriorityDesc);
    const active = sorted.find((entry) => entry.id === id);
    if (!active || !isQueueEntryDraggable(active.status)) return false;

    const scopeEntries = sorted.filter((entry) => sameQueueScope(entry, active) && isQueueEntryDraggable(entry.status));
    const currentScopeIndex = scopeEntries.findIndex((entry) => entry.id === id);
    if (currentScopeIndex < 0) return false;

    let targetScopeIndex = currentScopeIndex;
    if (direction === "top") targetScopeIndex = 0;
    if (direction === "up") targetScopeIndex = Math.max(0, currentScopeIndex - 1);
    if (direction === "down") targetScopeIndex = Math.min(scopeEntries.length - 1, currentScopeIndex + 1);
    if (direction === "bottom") targetScopeIndex = scopeEntries.length - 1;
    if (targetScopeIndex === currentScopeIndex) return false;

    const overId = scopeEntries[targetScopeIndex]?.id;
    if (!overId) return false;
    return get().reorderEntries(id, overId);
  },

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
      const resp = await axiosClient.get<unknown>("/queue/helpdesk/today/");
      const data = resp.data;
      const headerDay = resp.headers["x-queue-calendar-date"];
      const serverDay =
        typeof headerDay === "string" && headerDay.trim() !== "" ? headerDay.trim() : helpdeskQueueCalendarDayLocal();

      if (typeof sessionStorage !== "undefined") {
        const prevServer = sessionStorage.getItem(HELPDESK_QUEUE_SERVER_DAY_KEY);
        if (prevServer !== null && prevServer !== serverDay) {
          rolledOver = true;
          idCounter = 100;
          set({
            entries: [],
            highlightQueueEntryId: null,
            headerSearch: "",
          });
        }
        sessionStorage.setItem(HELPDESK_QUEUE_SERVER_DAY_KEY, serverDay);
      }

      const mapped = mapHelpdeskQueueApiResponse(data);
      get().hydrateFromServer(mapped);
      // #region agent log
      {
        const n = get().entries.length;
        const locals = get().entries.filter((e) => e.id.startsWith("hq-")).length;
        debugSessionLog({
          runId: "add-queue-debug",
          hypothesisId: "H1_H3",
          location: "helpdeskQueueStore.ts:fetchTodayQueue",
          message: "after hydrateFromServer",
          data: { serverRowCount: mapped.length, storeEntryCount: n, localHqCount: locals },
        });
      }
      // #endregion
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
    // #region agent log
    const byProfile = entries.find(
      (entry) => entry.patientProfileId && profileIdsEqual(entry.patientProfileId, patient.id)
    );
    const byMobile =
      !patient.id ? entries.find((entry) => normalizeMobile(entry.mobile) === targetMobile) : null;
    const result = byProfile ?? byMobile ?? null;
    debugSessionLog({
      runId: "add-queue-debug",
      hypothesisId: "H1_H2",
      location: "helpdeskQueueStore.ts:findEntryByPatient",
      message: "queue duplicate lookup",
      data: {
        profileMatchNormalized: true,
        entryCount: entries.length,
        hasPatientId: Boolean(patient.id),
        hasMobileDigits: targetMobile.length > 0,
        matchedBy: byProfile ? "profileId" : byMobile ? "mobile" : "none",
        hasMatch: Boolean(result),
        matchIdPrefix: result ? (result.id.startsWith("hq-") ? "hq" : "srv") : "none",
        matchStatus: result?.status ?? null,
        hasVisitId: Boolean(result?.visitId),
        hasClinicId: Boolean(result?.clinicId),
      },
    });
    // #endregion
    return result;
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

export function resetHelpdeskQueueStoreState(): void {
  idCounter = 100;
  fetchTodayQueueInFlight = null;
  useHelpdeskQueueStore.setState({
    entries: [],
    headerSearch: "",
    highlightQueueEntryId: null,
    isReorderUpdating: false,
    isReordering: false,
  });
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(HELPDESK_QUEUE_SERVER_DAY_KEY);
  }
}
