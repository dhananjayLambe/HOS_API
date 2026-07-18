"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  PatientLabHistoryService,
  patientLabHistoryQueryKeys,
} from "../services/patient-lab-history-service";
import type { ClinicalLabHistoryFilters } from "../types";

export function useClinicalLabHistorySummary(patientId: string | null | undefined) {
  return useQuery({
    queryKey: patientLabHistoryQueryKeys.summary(patientId || ""),
    queryFn: () => PatientLabHistoryService.getSummary(patientId!),
    enabled: Boolean(patientId),
    staleTime: 30_000,
  });
}

export function useClinicalLabHistoryList(
  patientId: string | null | undefined,
  filters: ClinicalLabHistoryFilters = {}
) {
  const { cursor: _c, ...stableFilters } = filters;
  return useInfiniteQuery({
    queryKey: patientLabHistoryQueryKeys.list(patientId || "", stableFilters),
    queryFn: ({ pageParam }) =>
      PatientLabHistoryService.list(patientId!, {
        ...stableFilters,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: Boolean(patientId),
    staleTime: 30_000,
  });
}

export function useClinicalLabHistoryDetail(
  patientId: string | null | undefined,
  reportId: string | null | undefined
) {
  return useQuery({
    queryKey: patientLabHistoryQueryKeys.detail(patientId || "", reportId || ""),
    queryFn: () => PatientLabHistoryService.getDetail(patientId!, reportId!),
    enabled: Boolean(patientId && reportId),
    staleTime: 15_000,
  });
}
