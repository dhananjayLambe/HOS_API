"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchMedicineSuggestions,
  flattenMedicineSuggestions,
  type MedicineSuggestionDrug,
  type MedicineSuggestionsResponse,
} from "@/lib/medicineSuggestionsApi";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export interface UseMedicineSuggestionsOptions {
  doctorId: string | null | undefined;
  patientId: string | null | undefined;
  consultationId: string | null | undefined;
  /** Master UUIDs only; debounced 500ms inside hook. */
  diagnosisIds: string[];
  limit?: number;
  enabled?: boolean;
}

export interface UseMedicineSuggestionsResult {
  data: MedicineSuggestionsResponse | null;
  chips: { id: string; label: string }[];
  byId: Record<string, MedicineSuggestionDrug>;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * Loads medicine suggestions; debounces diagnosis ids (500ms). Sends `diagnosis_ids` only when
 * the debounced list is non-empty to avoid useless diagnosis-scoped refetches while the list is empty.
 */
export function useMedicineSuggestions(
  options: UseMedicineSuggestionsOptions
): UseMedicineSuggestionsResult {
  const debouncedDiagnosisIds = useDebouncedValue(options.diagnosisIds, 500);
  const diagnosisIdsKey = useMemo(() => {
    if (debouncedDiagnosisIds.length === 0) return "";
    return [...debouncedDiagnosisIds].sort().join("|");
  }, [debouncedDiagnosisIds]);

  const [data, setData] = useState<MedicineSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const reload = useCallback(() => setReloadNonce((n) => n + 1), []);

  const doctorId = options.doctorId?.trim() || null;
  const enabled = options.enabled !== false && Boolean(doctorId);

  const flat = useMemo(() => {
    if (!data) return { chips: [] as { id: string; label: string }[], byId: {} as Record<string, MedicineSuggestionDrug> };
    return flattenMedicineSuggestions(data);
  }, [data]);

  useEffect(() => {
    if (!enabled || !doctorId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const diagnosisIdsForApi =
      debouncedDiagnosisIds.length > 0 ? debouncedDiagnosisIds : [];

    fetchMedicineSuggestions({
      doctorId,
      patientId: options.patientId ?? undefined,
      consultationId: options.consultationId ?? undefined,
      diagnosisIds: diagnosisIdsForApi,
      limit: options.limit,
    })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    doctorId,
    options.patientId,
    options.consultationId,
    options.limit,
    diagnosisIdsKey,
    reloadNonce,
  ]);

  return {
    data,
    chips: flat.chips,
    byId: flat.byId,
    loading,
    error,
    reload,
  };
}
