"use client";

import { create } from "zustand";
import { useMemo } from "react";
import { toast } from "sonner";

export type QueueStatus = "waiting" | "pre_consult" | "with_doctor";

export interface Vitals {
  bp: string;
  pulse: string;
  temp: string;
  weight: string;
  height: string;
  notes: string;
}

export interface QueueEntry {
  id: string;
  patientProfileId?: string;
  name: string;
  mobile: string;
  status: QueueStatus;
  priority: number;
  vitals?: Partial<Vitals>;
}

const emptyVitals = (): Vitals => ({
  bp: "",
  pulse: "",
  temp: "",
  weight: "",
  height: "",
  notes: "",
});

function maskMobile(m: string): string {
  const d = m.replace(/\D/g, "");
  if (d.length < 4) return m;
  return `${d.slice(0, 2)}XXXXXX${d.slice(-2)}`;
}

function normalizeMobile(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

interface HelpdeskQueueState {
  entries: QueueEntry[];
  headerSearch: string;
  /** Cross-page: open vitals for this queue id (e.g. bottom nav Pre-Consult) */
  preConsultTargetId: string | null;
  setHeaderSearch: (q: string) => void;
  setPreConsultTargetId: (id: string | null) => void;
  /** Bottom nav / sidebar: focus first pre-consult patient vitals */
  openPreConsultFlow: () => void;
  addPatient: (name: string, mobile: string) => string;
  addPatientFromSearch: (patient: { id: string; full_name: string; mobile?: string | null }) => string;
  findEntryByPatient: (patient: { id: string; mobile?: string | null }) => QueueEntry | null;
  moveToTop: (id: string) => void;
  checkIn: (id: string) => void;
  updateVitals: (id: string, vitals: Partial<Vitals>, sendToDoctor?: boolean) => void;
}

let idCounter = 100;

export const useHelpdeskQueueStore = create<HelpdeskQueueState>((set, get) => ({
  entries: [
    { id: "q1", patientProfileId: "seed-q1", name: "Rahul Sharma", mobile: "9876543212", status: "waiting", priority: 3 },
    { id: "q2", patientProfileId: "seed-q2", name: "Priya Patel", mobile: "9123456780", status: "pre_consult", priority: 2 },
    { id: "q3", patientProfileId: "seed-q3", name: "Amit Kumar", mobile: "9988776655", status: "waiting", priority: 1 },
  ],
  headerSearch: "",
  preConsultTargetId: null,

  setHeaderSearch: (q) => set({ headerSearch: q }),
  setPreConsultTargetId: (id) => set({ preConsultTargetId: id }),

  openPreConsultFlow: () => {
    const { entries } = get();
    const sorted = [...entries].sort((a, b) => b.priority - a.priority);
    const target = sorted.find((e) => e.status === "pre_consult");
    if (!target) {
      toast.message("No patient in Pre-Consult");
      return;
    }
    set({ preConsultTargetId: target.id });
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
            patientProfileId: undefined,
            name: name.trim(),
            mobile: mobile.trim(),
            status: "waiting" as const,
            priority: maxP + 1,
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
            patientProfileId: patient.id,
            name: (patient.full_name || "").trim() || "Unnamed Patient",
            mobile: (patient.mobile || "").trim(),
            status: "waiting" as const,
            priority: maxP + 1,
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
      (targetMobile
        ? entries.find((entry) => normalizeMobile(entry.mobile) === targetMobile)
        : null) ??
      null
    );
  },

  moveToTop: (id) =>
    set((s) => {
      const maxP = s.entries.reduce((m, e) => Math.max(m, e.priority), 0);
      return {
        entries: s.entries.map((e) => (e.id === id ? { ...e, priority: maxP + 1 } : e)),
      };
    }),

  checkIn: (id) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, status: "pre_consult" as const, vitals: { ...e.vitals, ...emptyVitals() } } : e
      ),
      preConsultTargetId: id,
    })),

  updateVitals: (id, vitals, sendToDoctor = false) =>
    set((s) => ({
      entries: s.entries.map((e) => {
        if (e.id !== id) return e;
        const merged = { ...emptyVitals(), ...e.vitals, ...vitals };
        return {
          ...e,
          vitals: merged,
          status: sendToDoctor ? ("with_doctor" as const) : e.status,
        };
      }),
    })),
}));

export { maskMobile, emptyVitals };

/**
 * Sorted by priority; filtered by header search (name / mobile digits).
 * Must not return a new array from a raw Zustand selector each time — that triggers
 * useSyncExternalStore "getSnapshot" / infinite update loops in React 19.
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
