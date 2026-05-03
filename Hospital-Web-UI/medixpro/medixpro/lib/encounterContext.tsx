"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import axios, { AxiosError } from "axios";
import { backendAxiosClient } from "@/lib/axiosClient";

export interface EncounterSummary {
  id: string;
  status?: string;
  cancelled?: boolean;
  visit_pnr?: string | null;
  consultation_id?: string | null;
}

interface EncounterContextType {
  fetchEncounterById: (encounterId: string, opts?: { force?: boolean }) => Promise<EncounterSummary | null>;
  getEncounterById: (encounterId?: string | null) => EncounterSummary | null;
  /** Bump detail version and drop cache so the next fetch wins; in-flight responses with an older version are ignored. */
  invalidateEncounterById: (encounterId: string) => void;
}

const EncounterContext = createContext<EncounterContextType | undefined>(undefined);

export function EncounterProvider({ children }: { children: React.ReactNode }) {
  const [encounterCache, setEncounterCache] = useState<Record<string, EncounterSummary>>({});
  const encounterCacheRef = useRef<Record<string, EncounterSummary>>({});
  encounterCacheRef.current = encounterCache;

  const encounterDetailVersionRef = useRef<Record<string, number>>({});
  const inFlightRef = useRef<Map<string, Promise<EncounterSummary | null>>>(new Map());

  const invalidateEncounterById = useCallback((encounterId: string) => {
    encounterDetailVersionRef.current[encounterId] =
      (encounterDetailVersionRef.current[encounterId] ?? 0) + 1;
    setEncounterCache((prev) => {
      if (!(encounterId in prev)) return prev;
      const next = { ...prev };
      delete next[encounterId];
      return next;
    });
  }, []);

  const fetchEncounterById = useCallback(
    async (encounterId: string, opts?: { force?: boolean }): Promise<EncounterSummary | null> => {
      if (!encounterId) return null;

      if (opts?.force) {
        // Serialize with any in-flight GET: a second force used to invalidate+bump version while the first
        // GET was still pending, so the first response was discarded (null) and callers never got visit_pnr.
        const pending = inFlightRef.current.get(encounterId);
        if (pending) {
          try {
            await pending;
          } catch {
            // ignore — next invalidate+fetch refreshes
          }
        }
        invalidateEncounterById(encounterId);
      } else if (encounterCacheRef.current[encounterId]) {
        return encounterCacheRef.current[encounterId];
      }

      const inFlight = inFlightRef.current.get(encounterId);
      if (inFlight && !opts?.force) {
        return inFlight;
      }

      const versionAtFetchStart = encounterDetailVersionRef.current[encounterId] ?? 0;

      const request = backendAxiosClient
        .get<EncounterSummary>(`/consultations/encounter/${encounterId}/`)
        .then((res) => {
          const currentVersion = encounterDetailVersionRef.current[encounterId] ?? 0;
          if (versionAtFetchStart !== currentVersion) {
            return null;
          }
          const rawPnr = (res.data as { visit_pnr?: string | null } | undefined)?.visit_pnr;
          const visit_pnr =
            rawPnr != null && String(rawPnr).trim() !== "" ? String(rawPnr).trim() : null;
          const payload: EncounterSummary = {
            id: encounterId,
            status: res.data?.status,
            cancelled: res.data?.cancelled,
            visit_pnr,
            consultation_id: res.data?.consultation_id ?? null,
          };
          setEncounterCache((prev) => ({ ...prev, [encounterId]: payload }));
          return payload;
        })
        .catch((error) => {
          if (axios.isCancel(error) || error?.code === AxiosError.ERR_CANCELED) {
            return null;
          }
          throw error;
        })
        .finally(() => {
          if (inFlightRef.current.get(encounterId) === request) {
            inFlightRef.current.delete(encounterId);
          }
        });

      inFlightRef.current.set(encounterId, request);
      return request;
    },
    [invalidateEncounterById]
  );

  const getEncounterById = useCallback(
    (encounterId?: string | null): EncounterSummary | null => {
      if (!encounterId) return null;
      return encounterCache[encounterId] ?? null;
    },
    [encounterCache]
  );

  const value = useMemo(
    () => ({
      fetchEncounterById,
      getEncounterById,
      invalidateEncounterById,
    }),
    [fetchEncounterById, getEncounterById, invalidateEncounterById]
  );

  return <EncounterContext.Provider value={value}>{children}</EncounterContext.Provider>;
}

export function useEncounter() {
  const context = useContext(EncounterContext);
  if (!context) {
    throw new Error("useEncounter must be used within an EncounterProvider");
  }
  return context;
}
