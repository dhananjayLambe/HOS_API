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
}

const EncounterContext = createContext<EncounterContextType | undefined>(undefined);

export function EncounterProvider({ children }: { children: React.ReactNode }) {
  const [encounterCache, setEncounterCache] = useState<Record<string, EncounterSummary>>({});
  const inFlightRef = useRef<Map<string, Promise<EncounterSummary | null>>>(new Map());

  const getEncounterById = useCallback(
    (encounterId?: string | null): EncounterSummary | null => {
      if (!encounterId) return null;
      return encounterCache[encounterId] ?? null;
    },
    [encounterCache]
  );

  const fetchEncounterById = useCallback(
    async (encounterId: string, opts?: { force?: boolean }): Promise<EncounterSummary | null> => {
      if (!encounterId) return null;
      if (!opts?.force && encounterCache[encounterId]) {
        return encounterCache[encounterId];
      }

      const inFlight = inFlightRef.current.get(encounterId);
      if (inFlight) return inFlight;

      const request = backendAxiosClient
        .get<EncounterSummary>(`/consultations/encounter/${encounterId}/`)
        .then((res) => {
          const payload: EncounterSummary = {
            id: encounterId,
            status: res.data?.status,
            cancelled: res.data?.cancelled,
            visit_pnr: res.data?.visit_pnr ?? null,
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
          inFlightRef.current.delete(encounterId);
        });

      inFlightRef.current.set(encounterId, request);
      return request;
    },
    [encounterCache]
  );

  const value = useMemo(
    () => ({
      fetchEncounterById,
      getEncounterById,
    }),
    [fetchEncounterById, getEncounterById]
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
