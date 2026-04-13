/**
 * Client for GET /api/consultation/instructions/suggestions (Next BFF → Django).
 */

import type { InstructionFieldSchema } from "@/lib/consultation-schema-types";
import { getBearerAuthHeaders } from "@/lib/bearer-auth-headers";

/** Matches Django instruction_suggestion_service / specialty JSON keys. */
export function normalizeSpecialtySlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Pull primary specialization string from DoctorFullProfile-style payloads. */
export function extractPrimarySpecializationFromProfile(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const prof = root.professional;
  if (prof && typeof prof === "object") {
    const p = (prof as Record<string, unknown>).primary_specialization;
    if (typeof p === "string" && p.trim()) return p.trim();
  }
  const direct = root.primary_specialization;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return null;
}

export type InstructionSuggestionRow = {
  key: string;
  label: string;
  category: string;
  requires_input: boolean;
  fields: InstructionFieldSchema[];
};

export type InstructionSuggestionsMeta = {
  total: number;
  filtered: number;
};

export type InstructionSuggestionsResponse = {
  success: boolean;
  data: InstructionSuggestionRow[];
  meta: InstructionSuggestionsMeta;
};

export type FetchInstructionSuggestionsParams = {
  q?: string;
  specialty?: string;
  category?: string;
  limit?: number;
  /** Instruction template keys to hide from results */
  excludeKeys?: string[];
};

const SUGGESTION_CACHE_TTL_MS = 90_000;

type SuggestionCacheEntry = {
  response: InstructionSuggestionsResponse;
  expiresAt: number;
};

const suggestionCache = new Map<string, SuggestionCacheEntry>();

function buildCacheKey(params: FetchInstructionSuggestionsParams): string {
  const q = (params.q ?? "").trim().toLowerCase();
  const specialty = normalizeSpecialtySlug(params.specialty ?? "");
  const category = normalizeSpecialtySlug(params.category ?? "");
  const limit = String(params.limit ?? 20);
  return `${q}|${specialty}|${category}|${limit}`;
}

export async function fetchInstructionSuggestions(
  params: FetchInstructionSuggestionsParams,
  init?: { signal?: AbortSignal }
): Promise<InstructionSuggestionsResponse> {
  const cacheKey = buildCacheKey(params);
  const cached = suggestionCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.response;
  }

  const sp = new URLSearchParams();
  const q = (params.q ?? "").trim();
  if (q) sp.set("q", q);
  const specialty = (params.specialty ?? "").trim();
  if (specialty) sp.set("specialty", specialty);
  const category = (params.category ?? "").trim();
  if (category) sp.set("category", category);
  const limit = params.limit ?? 20;
  sp.set("limit", String(limit));
  for (const key of params.excludeKeys ?? []) {
    const k = key.trim();
    if (k) sp.append("exclude", k);
  }

  const qs = sp.toString();
  const url = `/api/consultation/instructions/suggestions${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getBearerAuthHeaders(),
    },
    signal: init?.signal,
  });

  const data = (await res.json().catch(() => ({}))) as
    | InstructionSuggestionsResponse
    | { error?: string; detail?: string };

  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : typeof data === "object" && data && "detail" in data && typeof data.detail === "string"
          ? data.detail
          : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (!data || typeof data !== "object" || !("success" in data)) {
    throw new Error("Invalid suggestion response");
  }

  const typed = data as InstructionSuggestionsResponse;
  suggestionCache.set(cacheKey, {
    response: typed,
    expiresAt: now + SUGGESTION_CACHE_TTL_MS,
  });
  return typed;
}
