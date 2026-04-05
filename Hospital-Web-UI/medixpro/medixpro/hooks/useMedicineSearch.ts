"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import {
  fetchMedicineHybrid,
  fetchMedicineSuggestionsDirect,
} from "@/lib/medicineHybridApi";
import {
  flattenMedicineSuggestions,
  type MedicineSuggestionDrug,
  type MedicineSuggestionsResponse,
} from "@/lib/medicineSuggestionsApi";
import type { MedicineHybridResultRow } from "@/types/medicine";

const SEARCH_DEBOUNCE_MS = 300;
const DIAGNOSIS_DEBOUNCE_MS = 500;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 120;

type CachePayload = {
  chips: { id: string; label: string }[];
  byId: Record<string, MedicineSuggestionDrug>;
  hybridMeta: { mode: string; timing_ms: number } | null;
  expiresAt: number;
};

const medicineSearchCache = new Map<string, CachePayload>();

function diagnosisKey(ids: string[]): string {
  if (ids.length === 0) return "";
  return [...ids].sort().join("|");
}

function buildCacheKey(params: {
  doctorId: string;
  patientId: string | undefined;
  consultationId: string | undefined;
  diagnosisKey: string;
  q: string;
  mode: "suggestions" | "hybrid";
}): string {
  return [
    params.doctorId,
    params.patientId ?? "",
    params.consultationId ?? "",
    params.diagnosisKey,
    params.mode,
    params.q.trim().toLowerCase(),
  ].join("::");
}

function cacheGet(key: string): CachePayload | null {
  const hit = medicineSearchCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    medicineSearchCache.delete(key);
    return null;
  }
  return hit;
}

function cacheSet(key: string, payload: Omit<CachePayload, "expiresAt">): void {
  if (medicineSearchCache.size >= CACHE_MAX_ENTRIES) {
    const first = medicineSearchCache.keys().next().value;
    if (first !== undefined) medicineSearchCache.delete(first);
  }
  medicineSearchCache.set(key, {
    ...payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function hybridRowToSuggestionDrug(row: MedicineHybridResultRow): MedicineSuggestionDrug {
  const form = row.formulation;
  return {
    id: row.id,
    brand_name: row.brand_name,
    display_name: row.display_name,
    generic_name: null,
    strength: row.strength || null,
    drug_type: row.drug_type,
    is_common: false,
    formulation: form
      ? {
          id: form.id ?? "00000000-0000-0000-0000-000000000000",
          name: form.name,
        }
      : null,
    source: row.source,
    last_used: row.last_used ?? null,
    last_used_ago: null,
    dominant_signal: row.source,
  };
}

export interface UseMedicineSearchOptions {
  doctorId: string | null | undefined;
  patientId: string | null | undefined;
  consultationId: string | null | undefined;
  diagnosisIds: string[];
  searchQuery: string;
  limit?: number;
  enabled?: boolean;
}

export interface UseMedicineSearchResult {
  chips: { id: string; label: string }[];
  byId: Record<string, MedicineSuggestionDrug>;
  loading: boolean;
  error: Error | null;
  reload: () => void;
  hybridMeta: { mode: string; timing_ms: number } | null;
  /** True while a hybrid request is in flight (for skeleton / "Searching…"). */
  isHybridLoading: boolean;
}

/**
 * Empty search → suggestions API immediately (no debounce on empty).
 * Typing → debounced hybrid API.
 * In-memory cache (5m TTL), AbortController + monotonic requestId to avoid stale UI.
 */
export function useMedicineSearch(options: UseMedicineSearchOptions): UseMedicineSearchResult {
  const debouncedTyping = useDebouncedValue(options.searchQuery, SEARCH_DEBOUNCE_MS);
  const debouncedDiagnosisIds = useDebouncedValue(options.diagnosisIds, DIAGNOSIS_DEBOUNCE_MS);

  /** Empty query updates immediately so suggestions prefetch without waiting 300ms. */
  const effectiveSearchQuery = useMemo(() => {
    const raw = options.searchQuery.trim();
    if (raw === "") return "";
    return debouncedTyping.trim();
  }, [options.searchQuery, debouncedTyping]);

  const diagnosisIdsKey = useMemo(() => diagnosisKey(debouncedDiagnosisIds), [debouncedDiagnosisIds]);

  const [byId, setById] = useState<Record<string, MedicineSuggestionDrug>>({});
  const [chips, setChips] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hybridMeta, setHybridMeta] = useState<{ mode: string; timing_ms: number } | null>(
    null
  );
  const [reloadNonce, setReloadNonce] = useState(0);

  const requestIdRef = useRef(0);

  const reload = useCallback(() => setReloadNonce((n) => n + 1), []);

  const doctorId = options.doctorId?.trim() || null;
  const enabled = options.enabled !== false && Boolean(doctorId && options.patientId);

  const isHybridLoading = Boolean(
    loading && effectiveSearchQuery.length > 0
  );

  useEffect(() => {
    if (!enabled || !doctorId) {
      setById({});
      setChips([]);
      setLoading(false);
      setError(null);
      setHybridMeta(null);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const q = effectiveSearchQuery;
    const diagnosisIdsForApi =
      debouncedDiagnosisIds.length > 0 ? debouncedDiagnosisIds : [];
    const limit = options.limit;
    const patientId = options.patientId ?? undefined;
    const consultationId = options.consultationId ?? undefined;

    const run = async () => {
      const myRequestId = ++requestIdRef.current;
      const mode = q.length === 0 ? "suggestions" : "hybrid";
      const cacheKey = buildCacheKey({
        doctorId,
        patientId,
        consultationId,
        diagnosisKey: diagnosisIdsKey,
        q: q,
        mode,
      });

      try {
        const cached = cacheGet(cacheKey);
        if (cached) {
          if (myRequestId !== requestIdRef.current) return;
          setChips(cached.chips);
          setById(cached.byId);
          setHybridMeta(cached.hybridMeta);
          setLoading(false);
          return;
        }

        if (q.length === 0) {
          const data: MedicineSuggestionsResponse = await fetchMedicineSuggestionsDirect(
            {
              doctorId,
              patientId,
              consultationId,
              diagnosisIds: diagnosisIdsForApi,
              limit,
            },
            { signal: ac.signal }
          );
          if (myRequestId !== requestIdRef.current) return;
          const flat = flattenMedicineSuggestions(data);
          if (ac.signal.aborted) return;
          setChips(flat.chips);
          setById(flat.byId);
          setHybridMeta(null);
          cacheSet(cacheKey, {
            chips: flat.chips,
            byId: flat.byId,
            hybridMeta: null,
          });
        } else {
          const res = await fetchMedicineHybrid(
            {
              doctorId,
              patientId,
              consultationId,
              diagnosisIds: diagnosisIdsForApi,
              limit,
              q,
            },
            { signal: ac.signal }
          );
          if (myRequestId !== requestIdRef.current) return;
          const nextById: Record<string, MedicineSuggestionDrug> = {};
          const nextChips: { id: string; label: string }[] = [];
          const seen = new Set<string>();
          for (const row of res.results ?? []) {
            if (!row?.id || seen.has(row.id)) continue;
            seen.add(row.id);
            const drug = hybridRowToSuggestionDrug(row);
            nextById[row.id] = drug;
            const label =
              (row.display_name || row.brand_name || "").trim() || "Medicine";
            nextChips.push({ id: row.id, label });
          }
          if (ac.signal.aborted) return;
          setChips(nextChips);
          setById(nextById);
          setHybridMeta(res.meta ?? null);
          cacheSet(cacheKey, {
            chips: nextChips,
            byId: nextById,
            hybridMeta: res.meta ?? null,
          });
        }
      } catch (e: unknown) {
        if (axios.isCancel(e)) return;
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          if (myRequestId === requestIdRef.current && !ac.signal.aborted) {
            setChips([]);
            setById({});
            setHybridMeta(null);
          }
          return;
        }
        if (myRequestId === requestIdRef.current && !ac.signal.aborted) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setChips([]);
          setById({});
          setHybridMeta(null);
        }
      } finally {
        if (myRequestId === requestIdRef.current && !ac.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      ac.abort();
    };
  }, [
    enabled,
    doctorId,
    options.patientId,
    options.consultationId,
    options.limit,
    effectiveSearchQuery,
    diagnosisIdsKey,
    debouncedDiagnosisIds,
    reloadNonce,
  ]);

  return {
    chips,
    byId,
    loading,
    error,
    reload,
    hybridMeta,
    isHybridLoading,
  };
}
