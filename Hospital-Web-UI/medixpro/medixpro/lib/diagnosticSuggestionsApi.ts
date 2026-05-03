import { backendAxiosClient } from "@/lib/axiosClient";

export type InvestigationSuggestionTest = {
  id: string;
  name: string;
  score: number;
  confidence: number;
  confidence_label: string;
  reason: string;
  badges: string[];
};

export type InvestigationSuggestionPackage = {
  id: string;
  name: string;
  completion?: string;
  missing_tests?: string[];
};

export type InvestigationSuggestionsResponse = {
  engine_version: string;
  selected_tests: Array<{ id: string }>;
  common_tests: InvestigationSuggestionTest[];
  recommended_tests: InvestigationSuggestionTest[];
  recommended_packages: InvestigationSuggestionPackage[];
  popular_packages: InvestigationSuggestionPackage[];
};

export async function fetchInvestigationSuggestions(
  encounterId: string,
  opts?: { signal?: AbortSignal }
): Promise<InvestigationSuggestionsResponse> {
  const response = await backendAxiosClient.get<InvestigationSuggestionsResponse>(
    "/diagnostics/investigations/suggestions/",
    {
      params: { encounter_id: encounterId },
      signal: opts?.signal,
    }
  );
  return response.data;
}
