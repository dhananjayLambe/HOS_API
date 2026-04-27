"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import axiosClient from "@/lib/axiosClient";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

export function usePatientSearchQuery(enabled = true, limit = 10) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.length < MIN_CHARS) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosClient.get("/patients/search/", {
        params: { query: trimmed, limit },
      });
      setResults(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      setResults([]);
      if (isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as Record<string, unknown> | undefined;
        const detail =
          (typeof data?.detail === "string" && data.detail) ||
          (typeof data?.message === "string" && data.message) ||
          (typeof data?.error === "string" && data.error) ||
          err.message;
        const suffix = detail ? `: ${detail}` : "";
        if (status === 401) {
          setError(`Unauthorized (401)${suffix}. Re-login and try again.`);
        } else if (status === 403) {
          setError(`Forbidden (403)${suffix}`);
        } else if (status) {
          setError(`Search failed (${status})${suffix}`);
        } else {
          setError(`Search failed${suffix || ". Check network and API URL."}`);
        }
      } else {
        setError("Search failed. Try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (!enabled) {
      setQuery("");
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < MIN_CHARS) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void performSearch(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, enabled, performSearch]);

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    setResults([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    reset,
    performSearch,
    minChars: MIN_CHARS,
  };
}
