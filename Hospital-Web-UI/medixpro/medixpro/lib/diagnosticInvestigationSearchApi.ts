/**
 * Investigation catalog search (`GET /api/diagnostics/search/`).
 *
 * Backend requires PostgreSQL + `pg_trgm`. For local UI work without it, set
 * `NEXT_PUBLIC_INVESTIGATION_SEARCH_FORCE_STATIC=true` so the consultations
 * panel uses offline static matches only (see `investigations-section.tsx`).
 */
import { backendAxiosClient } from "@/lib/axiosClient";

/** Aligns with `GET /api/diagnostics/search/` response. */
export type InvestigationSearchTestRow = {
  type: "test";
  id: string;
  name: string;
  match_score: number;
  category: string;
  synopsis: string;
  sample_type: string;
  tat_hours_default: number;
  preparation_notes: string;
};

export type InvestigationSearchPackageRow = {
  type: "package";
  id: string;
  name: string;
  match_score: number;
  test_count: number;
  service_codes: string[];
  synopsis: string;
};

export type InvestigationSearchMeta = {
  query: string;
  total_results: number;
  did_you_mean?: string;
};

export type InvestigationSearchResponse = {
  tests: InvestigationSearchTestRow[];
  packages: InvestigationSearchPackageRow[];
  meta: InvestigationSearchMeta;
};

export type InvestigationSearchParams = {
  q: string;
  type?: "all" | "test" | "package";
  limit?: number;
};

export async function fetchInvestigationSearch(
  params: InvestigationSearchParams,
  opts?: { signal?: AbortSignal }
): Promise<InvestigationSearchResponse> {
  const response = await backendAxiosClient.get<InvestigationSearchResponse>("/diagnostics/search/", {
    params: {
      q: params.q,
      type: params.type ?? "all",
      limit: params.limit ?? 10,
    },
    signal: opts?.signal,
  });
  return response.data;
}
