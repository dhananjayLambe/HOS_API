"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical, Plus, Search } from "lucide-react";
import {
  ConsultationSectionCard,
  type ConsultationSectionCardHandle,
} from "@/components/consultations/consultation-section-card";
import { ConsultationEditingBadge } from "@/components/consultations/consultation-editing-badge";
import { useConsultationSectionScroll } from "@/components/consultations/consultation-section-scroll-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  fetchInvestigationSuggestions,
  type InvestigationSuggestionsResponse,
  type InvestigationSuggestionPackage,
  type InvestigationSuggestionTest,
} from "@/lib/diagnosticSuggestionsApi";
import {
  INVESTIGATION_DIAGNOSIS_PACKAGE_MAP,
  INVESTIGATION_DIAGNOSIS_TEST_MAP,
  INVESTIGATION_MASTER_ITEMS,
  INVESTIGATION_PACKAGES,
  INVESTIGATION_POPULAR_PACKAGE_IDS,
  INVESTIGATION_QUICK_PICKS,
} from "@/data/consultation-section-data";
import {
  CustomInvestigationSheet,
  type CustomInvestigationFormValues,
} from "@/components/consultations/custom-investigation-sheet";
import type { ConsultationSectionItem } from "@/lib/consultation-types";
import { cn } from "@/lib/utils";
import { useConsultationStore } from "@/store/consultationStore";
import {
  pickDefaultSectionItemId,
  shouldIgnoreSectionActivationClick,
} from "@/lib/consultation-section-activation";
import {
  fetchInvestigationSearch,
  type InvestigationSearchResponse,
} from "@/lib/diagnosticInvestigationSearchApi";
import { normalizePackageKey as normalizeBundleId } from "@/lib/diagnosticPackageIds";
import {
  evaluateSectionItemComplete,
  shouldShowInvestigationCustomTag,
} from "@/lib/consultation-completion";
import {
  canonicalInvestigationKey,
  dedupeInvestigationSearchTests,
  dedupeInvestigationSuggestionsByCanonical,
} from "@/lib/investigation-canonical";

const SEARCH_DEBOUNCE_MS = 200;
const MAX_SEARCH_RESULTS = 10;
const MAX_RECOMMENDATIONS = 6;
const MAX_PACKAGES = 4;
const SUGGESTION_REFETCH_DEBOUNCE_MS = 350;
const TOAST_DEDUPE_MS = 2000;

/** When `true`, skip live search API (e.g. local backend without PostgreSQL / pg_trgm). */
const FORCE_INVESTIGATION_SEARCH_STATIC =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_INVESTIGATION_SEARCH_FORCE_STATIC === "true";

type SearchResult = {
  kind: "test" | "package";
  id: string;
  label: string;
  /** API search ranking (higher is better). */
  match_score?: number;
  /** Offline static search rank (lower is better, 1 = best). */
  score?: number;
  service_codes?: string[];
  investigationFromApi?: {
    category: string;
    synopsis: string;
    sample_type: string;
    tat_hours_default: number;
    preparation_notes: string;
  };
};

/** Fuzzy key for matching suggestion package names to static bundle ids (alphanumeric only). */
function stripKeyForPackageLookup(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Dedup fallback when comparing free-text / custom entries to existing rows. */
function normalizeInvestigationName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isSearchPackageFullyAdded(
  result: SearchResult,
  packageById: Record<string, (typeof INVESTIGATION_PACKAGES)[number] | undefined>,
  selectedServiceIds: Set<string>,
  selectedCanonicalKeys: Set<string>,
  masterById: Record<string, (typeof INVESTIGATION_MASTER_ITEMS)[number] | undefined>
): boolean {
  const canon = normalizeBundleId(result.id);
  const pkg = packageById[canon];
  const codes =
    result.service_codes && result.service_codes.length > 0
      ? result.service_codes
      : pkg?.service_ids;
  if (!codes?.length) return false;
  return codes.every((id) => {
    if (selectedServiceIds.has(id)) return true;
    const label = masterById[id]?.name ?? id;
    return selectedCanonicalKeys.has(canonicalInvestigationKey(id, label));
  });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function InvestigationsSection() {
  const toast = useToastNotification();
  const toastDedupeRef = useRef<Map<string, number>>(new Map());
  const notify = useCallback((key: string, emit: () => void) => {
    const now = Date.now();
    const last = toastDedupeRef.current.get(key) ?? 0;
    if (now - last < TOAST_DEDUPE_MS) return;
    toastDedupeRef.current.set(key, now);
    emit();
  }, []);
  const sectionCardRef = useRef<ConsultationSectionCardHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const didLoadSuggestionsRef = useRef(false);
  const didShowSuggestionsErrorRef = useRef(false);
  const {
    sectionItems,
    selectedDetail,
    setSelectedDetail,
    replaceSectionItems,
    diagnosisSchemaByKey,
    appliedPackages,
    setAppliedPackage,
    clearAppliedPackage,
    encounterId,
  } = useConsultationStore();
  const { registerSectionRef, activateSection, activeSectionKey } = useConsultationSectionScroll();

  const [query, setQuery] = useState("");
  const [highlightedResult, setHighlightedResult] = useState(0);
  const [recentlyAddedItemId, setRecentlyAddedItemId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<InvestigationSuggestionsResponse | null>(null);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [useSuggestionsFallback, setUseSuggestionsFallback] = useState(false);
  const [investigationSearchApi, setInvestigationSearchApi] = useState<InvestigationSearchResponse | null>(
    null
  );
  const [isInvestigationSearchLoading, setIsInvestigationSearchLoading] = useState(false);
  const [useInvestigationSearchFallback, setUseInvestigationSearchFallback] = useState(false);
  const [bundleLabelOverrides, setBundleLabelOverrides] = useState<Record<string, string>>({});
  const [customInvestigationSheetOpen, setCustomInvestigationSheetOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS).trim();
  const selectedItems = sectionItems.investigations ?? [];
  const selectedServiceIds = useMemo(
    () => new Set(selectedItems.map((it) => it.detail?.service_id ?? it.id)),
    [selectedItems]
  );
  const selectedNormalizedNames = useMemo(() => {
    const s = new Set<string>();
    for (const it of selectedItems) {
      const label = (it.label ?? it.name ?? "").trim();
      if (label) s.add(normalizeInvestigationName(label));
    }
    return s;
  }, [selectedItems]);
  const catalogNormalizedNames = useMemo(() => {
    const s = new Set<string>();
    INVESTIGATION_MASTER_ITEMS.forEach((item) => {
      s.add(normalizeInvestigationName(item.name));
      item.aliases?.forEach((a) => s.add(normalizeInvestigationName(a)));
    });
    return s;
  }, []);
  /** Resolves API UUIDs + variant labels (e.g. CBC vs Complete Blood Count (CBC)) to one master `service_id`. */
  const selectedCanonicalKeys = useMemo(() => {
    const s = new Set<string>();
    for (const it of selectedItems) {
      const sid = it.detail?.service_id ?? it.id;
      const lab = it.label ?? it.name ?? "";
      s.add(canonicalInvestigationKey(sid, lab));
    }
    return s;
  }, [selectedItems]);
  const selectionGuardRef = useRef(0);
  const runWithSelectionGuard = useCallback((fn: () => void) => {
    const now = Date.now();
    if (now - selectionGuardRef.current < 320) return;
    selectionGuardRef.current = now;
    fn();
  }, []);
  const selectedDiagnosis = sectionItems.diagnosis ?? [];
  const suggestionsRefetchSignal = useDebouncedValue(
    JSON.stringify({
      diagnosis: selectedDiagnosis.map((item) => item.diagnosisKey ?? item.label).sort(),
    }),
    SUGGESTION_REFETCH_DEBOUNCE_MS
  );

  useEffect(() => {
    if (activeSectionKey !== "investigations") return;
    const currentSelectedId =
      selectedDetail?.section === "investigations" ? selectedDetail.itemId ?? null : null;
    if (currentSelectedId) return;
    const defaultItemId = pickDefaultSectionItemId(selectedItems, () => false);
    if (defaultItemId) {
      setSelectedDetail({ section: "investigations", itemId: defaultItemId });
    }
  }, [activeSectionKey, selectedDetail, selectedItems, setSelectedDetail]);

  useEffect(() => {
    if (!recentlyAddedItemId) return;
    const t = window.setTimeout(() => setRecentlyAddedItemId(null), 500);
    return () => window.clearTimeout(t);
  }, [recentlyAddedItemId]);

  const masterById = useMemo(
    () =>
      Object.fromEntries(INVESTIGATION_MASTER_ITEMS.map((item) => [item.service_id, item])),
    []
  );

  useEffect(() => {
    let dirty = false;
    Object.entries(appliedPackages).forEach(([bundleId, pkg]) => {
      const hasAny = pkg.test_ids.some((id) => {
        if (selectedServiceIds.has(id)) return true;
        const label = masterById[id]?.name ?? id;
        return selectedCanonicalKeys.has(canonicalInvestigationKey(id, label));
      });
      if (!hasAny) {
        clearAppliedPackage(bundleId);
        dirty = true;
      }
    });
    if (dirty && selectedDetail?.section === "investigations" && selectedDetail.itemId) {
      const stillExists = selectedItems.some((item) => item.id === selectedDetail.itemId);
      if (!stillExists) setSelectedDetail(null);
    }
  }, [
    appliedPackages,
    clearAppliedPackage,
    masterById,
    selectedCanonicalKeys,
    selectedDetail,
    selectedItems,
    selectedServiceIds,
    setSelectedDetail,
  ]);

  const packageById = useMemo(
    () =>
      Object.fromEntries(
        INVESTIGATION_PACKAGES.map((item) => [normalizeBundleId(item.bundle_id), item])
      ),
    []
  );
  const packageIdByNormalizedName = useMemo(
    () =>
      Object.fromEntries(
        INVESTIGATION_PACKAGES.map((item) => [
          stripKeyForPackageLookup(item.name),
          normalizeBundleId(item.bundle_id),
        ])
      ),
    []
  );
  const packageIdByAlias = useMemo(() => {
    const aliases: Record<string, string> = {};
    INVESTIGATION_PACKAGES.forEach((pkg) => {
      const canon = normalizeBundleId(pkg.bundle_id);
      aliases[stripKeyForPackageLookup(pkg.bundle_id)] = canon;
      aliases[stripKeyForPackageLookup(pkg.name)] = canon;
    });
    return aliases;
  }, []);

  useEffect(() => {
    if (!encounterId) return;
    let cancelled = false;
    setIsSuggestionsLoading(!didLoadSuggestionsRef.current);
    setSuggestionsError(null);

    fetchInvestigationSuggestions(encounterId)
      .then((payload) => {
        if (cancelled) return;
        setSuggestions(payload);
        setUseSuggestionsFallback(false);
        didLoadSuggestionsRef.current = true;
        didShowSuggestionsErrorRef.current = false;
      })
      .catch(() => {
        if (cancelled) return;
        setUseSuggestionsFallback(true);
        setSuggestionsError("Could not load live suggestions. Showing fallback recommendations.");
        if (!didShowSuggestionsErrorRef.current) {
          notify("suggestions-fallback", () =>
            toast.info("Live suggestions unavailable. Showing fallback recommendations.")
          );
          didShowSuggestionsErrorRef.current = true;
        }
      })
      .finally(() => {
        if (!cancelled) setIsSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [encounterId, notify, suggestionsRefetchSignal, toast]);

  const diagnosisKeys = useMemo(() => {
    return selectedDiagnosis.map((dx) => (dx.diagnosisKey ?? dx.label).toLowerCase());
  }, [selectedDiagnosis]);

  const diagnosisIdByService = useMemo(() => {
    const mapping: Record<string, string> = {};
    selectedDiagnosis.forEach((dx) => {
      const key = (dx.diagnosisKey ?? dx.label).toLowerCase();
      const diagnosisId = dx.diagnosisKey
        ? (diagnosisSchemaByKey[dx.diagnosisKey] as { id?: string } | undefined)?.id
        : undefined;
      const serviceIds = INVESTIGATION_DIAGNOSIS_TEST_MAP[key] ?? [];
      if (diagnosisId && typeof diagnosisId === "string") {
        serviceIds.forEach((serviceId) => {
          if (!mapping[serviceId]) mapping[serviceId] = diagnosisId;
        });
      }
    });
    return mapping;
  }, [selectedDiagnosis, diagnosisSchemaByKey]);

  const fallbackRecommendedTests = useMemo(() => {
    const out: string[] = [];
    diagnosisKeys.forEach((key) => {
      (INVESTIGATION_DIAGNOSIS_TEST_MAP[key] ?? []).forEach((serviceId) => {
        const name = masterById[serviceId]?.name ?? serviceId;
        const covered =
          selectedServiceIds.has(serviceId) ||
          selectedCanonicalKeys.has(canonicalInvestigationKey(serviceId, name));
        if (!out.includes(serviceId) && !covered) out.push(serviceId);
      });
    });
    return out.slice(0, MAX_RECOMMENDATIONS);
  }, [diagnosisKeys, masterById, selectedCanonicalKeys, selectedServiceIds]);

  const fallbackRecommendedPackages = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];

    diagnosisKeys.forEach((key) => {
      (INVESTIGATION_DIAGNOSIS_PACKAGE_MAP[key] ?? []).forEach((bundleId) => {
        if (!seen.has(bundleId)) {
          seen.add(bundleId);
          out.push(bundleId);
        }
      });
    });

    if (selectedServiceIds.size > 0 || selectedCanonicalKeys.size > 0) {
      INVESTIGATION_PACKAGES.forEach((pkg) => {
        const selectedInBundle = pkg.service_ids.filter((id) => {
          if (selectedServiceIds.has(id)) return true;
          const label = masterById[id]?.name ?? id;
          return selectedCanonicalKeys.has(canonicalInvestigationKey(id, label));
        });
        const strictSubset =
          selectedInBundle.length > 0 && selectedInBundle.length < pkg.service_ids.length;
        if (strictSubset && !seen.has(pkg.bundle_id)) {
          seen.add(pkg.bundle_id);
          out.push(pkg.bundle_id);
        }
      });
    }
    return out.slice(0, MAX_PACKAGES);
  }, [diagnosisKeys, masterById, selectedCanonicalKeys, selectedServiceIds]);

  const fallbackPopularPackages = useMemo(() => {
    return INVESTIGATION_POPULAR_PACKAGE_IDS.filter((id) => !fallbackRecommendedPackages.includes(id));
  }, [fallbackRecommendedPackages]);

  const commonTestSuggestions = useMemo(() => {
    let list: InvestigationSuggestionTest[];
    if (!useSuggestionsFallback && suggestions?.common_tests?.length) {
      list = suggestions.common_tests.slice(0, MAX_SEARCH_RESULTS);
    } else {
      list = INVESTIGATION_QUICK_PICKS.map((serviceId) => ({
        id: serviceId,
        name: masterById[serviceId]?.name ?? serviceId,
        score: 0,
        confidence: 0,
        confidence_label: "Suggested",
        reason: "Commonly used",
        badges: [],
      })) as InvestigationSuggestionTest[];
    }
    return dedupeInvestigationSuggestionsByCanonical(list);
  }, [masterById, suggestions, useSuggestionsFallback]);

  const recommendedTestSuggestions = useMemo(() => {
    let list: InvestigationSuggestionTest[];
    if (!useSuggestionsFallback && suggestions?.recommended_tests?.length) {
      list = suggestions.recommended_tests.slice(0, MAX_RECOMMENDATIONS);
    } else if (!useSuggestionsFallback && suggestions && !suggestions.recommended_tests?.length) {
      list = commonTestSuggestions.slice(0, MAX_RECOMMENDATIONS);
    } else {
      list = fallbackRecommendedTests.map((serviceId) => ({
        id: serviceId,
        name: masterById[serviceId]?.name ?? serviceId,
        score: 0,
        confidence: 0,
        confidence_label: "Recommended",
        reason: "Mapped from diagnosis",
        badges: [],
      })) as InvestigationSuggestionTest[];
    }
    return dedupeInvestigationSuggestionsByCanonical(list);
  }, [commonTestSuggestions, fallbackRecommendedTests, masterById, suggestions, useSuggestionsFallback]);

  const visibleCommonTestSuggestions = useMemo(
    () =>
      commonTestSuggestions.filter(
        (t) => !selectedCanonicalKeys.has(canonicalInvestigationKey(t.id, t.name))
      ),
    [commonTestSuggestions, selectedCanonicalKeys]
  );

  const visibleRecommendedTestSuggestions = useMemo(
    () =>
      recommendedTestSuggestions.filter(
        (t) => !selectedCanonicalKeys.has(canonicalInvestigationKey(t.id, t.name))
      ),
    [recommendedTestSuggestions, selectedCanonicalKeys]
  );

  const normalizedRecommendedPackages = useMemo(() => {
    const source: InvestigationSuggestionPackage[] =
      !useSuggestionsFallback && suggestions?.recommended_packages?.length
        ? suggestions.recommended_packages.slice(0, MAX_PACKAGES)
        : fallbackRecommendedPackages.map((bundleId) => ({
            id: bundleId,
            name: packageById[normalizeBundleId(bundleId)]?.name ?? bundleId,
          }));
    return source
      .map((pkg) => {
        const bundleId =
          (packageById[normalizeBundleId(pkg.id)] ? normalizeBundleId(pkg.id) : null) ??
          packageIdByNormalizedName[stripKeyForPackageLookup(pkg.name)] ??
          packageIdByAlias[stripKeyForPackageLookup(pkg.id)] ??
          null;
        return { source: pkg, bundleId };
      })
      .filter((row) => Boolean(row.bundleId) || useSuggestionsFallback);
  }, [
    fallbackRecommendedPackages,
    packageById,
    packageIdByAlias,
    packageIdByNormalizedName,
    suggestions,
    useSuggestionsFallback,
  ]);

  const normalizedPopularPackages = useMemo(() => {
    const source: InvestigationSuggestionPackage[] =
      !useSuggestionsFallback && suggestions?.popular_packages?.length
        ? suggestions.popular_packages.slice(0, MAX_PACKAGES)
        : fallbackPopularPackages.map((bundleId) => ({
            id: bundleId,
            name: packageById[normalizeBundleId(bundleId)]?.name ?? bundleId,
          }));
    return source
      .map((pkg) => {
        const bundleId =
          (packageById[normalizeBundleId(pkg.id)] ? normalizeBundleId(pkg.id) : null) ??
          packageIdByNormalizedName[stripKeyForPackageLookup(pkg.name)] ??
          packageIdByAlias[stripKeyForPackageLookup(pkg.id)] ??
          null;
        return { source: pkg, bundleId };
      })
      .filter((row) => Boolean(row.bundleId) || useSuggestionsFallback);
  }, [
    fallbackPopularPackages,
    packageById,
    packageIdByAlias,
    packageIdByNormalizedName,
    suggestions,
    useSuggestionsFallback,
  ]);

  const staticSearchResults = useMemo(() => {
    if (!debouncedQuery) return { tests: [] as SearchResult[], packages: [] as SearchResult[] };
    const q = debouncedQuery.toLowerCase();
    const lower = (value: string) => value.toLowerCase();

    const scoreTest = (name: string, aliases: string[] = []) => {
      const bag = [lower(name), ...aliases.map(lower)];
      if (bag.some((v) => v === q)) return 1;
      if (bag.some((v) => v.startsWith(q))) return 3;
      if (bag.some((v) => v.includes(q))) return 5;
      return 99;
    };
    const scorePackage = (name: string) => {
      const n = lower(name);
      if (n === q) return 2;
      if (n.startsWith(q)) return 4;
      if (n.includes(q)) return 6;
      return 99;
    };

    const testMatches = INVESTIGATION_MASTER_ITEMS.map((item) => ({
      kind: "test" as const,
      id: item.service_id,
      label: item.name,
      score: scoreTest(item.name, item.aliases ?? []),
    }))
      .filter((it) => it.score < 99)
      .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label));

    const packageMatches = INVESTIGATION_PACKAGES.map((item) => ({
      kind: "package" as const,
      id: normalizeBundleId(item.bundle_id),
      label: item.name,
      score: scorePackage(item.name),
    }))
      .filter((it) => it.score < 99)
      .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label));

    const merged = [...testMatches, ...packageMatches].sort(
      (a, b) => a.score - b.score || a.label.localeCompare(b.label)
    );
    const capped = merged.slice(0, MAX_SEARCH_RESULTS);
    return {
      tests: capped.filter((it) => it.kind === "test"),
      packages: capped.filter((it) => it.kind === "package"),
    };
  }, [debouncedQuery]);

  useEffect(() => {
    if (FORCE_INVESTIGATION_SEARCH_STATIC || debouncedQuery.length < 2) {
      setInvestigationSearchApi(null);
      setIsInvestigationSearchLoading(false);
      setUseInvestigationSearchFallback(false);
      return;
    }


    const controller = new AbortController();
    setInvestigationSearchApi(null);
    setIsInvestigationSearchLoading(true);

    fetchInvestigationSearch(
      { q: debouncedQuery, type: "all", limit: MAX_SEARCH_RESULTS },
      { signal: controller.signal }
    )
      .then((data) => {
        setInvestigationSearchApi(data);
        setUseInvestigationSearchFallback(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setInvestigationSearchApi(null);
        setUseInvestigationSearchFallback(true);
        if (process.env.NODE_ENV !== "production") {
          console.warn("[investigation search]", err);
        }
        notify("search-api-error", () =>
          toast.error("Unable to fetch tests. Try again")
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsInvestigationSearchLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, notify, toast]);

  const searchResults = useMemo(() => {
    if (!debouncedQuery) return { tests: [] as SearchResult[], packages: [] as SearchResult[] };

    const useStatic =
      FORCE_INVESTIGATION_SEARCH_STATIC || useInvestigationSearchFallback;

    if (useStatic) {
      return staticSearchResults;
    }

    if (isInvestigationSearchLoading && !investigationSearchApi) {
      return { tests: [] as SearchResult[], packages: [] as SearchResult[] };
    }

    if (!investigationSearchApi) {
      return staticSearchResults;
    }

    const tests: SearchResult[] = investigationSearchApi.tests.map((t) => ({
      kind: "test",
      id: t.id,
      label: t.name,
      match_score: t.match_score,
      investigationFromApi: {
        category: t.category,
        synopsis: t.synopsis,
        sample_type: t.sample_type,
        tat_hours_default: t.tat_hours_default,
        preparation_notes: t.preparation_notes,
      },
    }));
    const packages: SearchResult[] = investigationSearchApi.packages.map((p) => ({
      kind: "package",
      id: p.id,
      label: p.name,
      match_score: p.match_score,
      service_codes: p.service_codes,
    }));
    tests.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    packages.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    return { tests, packages };
  }, [
    debouncedQuery,
    investigationSearchApi,
    isInvestigationSearchLoading,
    staticSearchResults,
    useInvestigationSearchFallback,
  ]);

  /** Hide tests/packages already fully represented in selection (instant UI, O(1) checks). */
  const filteredSearchResults = useMemo(() => {
    const tests = dedupeInvestigationSearchTests(searchResults.tests).filter(
      (t) =>
        !selectedCanonicalKeys.has(canonicalInvestigationKey(t.id, t.label)) &&
        !selectedServiceIds.has(t.id)
    );
    return {
      tests,
      packages: searchResults.packages.filter(
        (p) =>
          !isSearchPackageFullyAdded(
            p,
            packageById,
            selectedServiceIds,
            selectedCanonicalKeys,
            masterById
          )
      ),
    };
  }, [
    masterById,
    packageById,
    searchResults.packages,
    searchResults.tests,
    selectedCanonicalKeys,
    selectedServiceIds,
  ]);

  const searchDidYouMean = investigationSearchApi?.meta?.did_you_mean;
  const showSearchDidYouMean =
    !!debouncedQuery &&
    debouncedQuery.length >= 2 &&
    !FORCE_INVESTIGATION_SEARCH_STATIC &&
    !useInvestigationSearchFallback &&
    investigationSearchApi &&
    investigationSearchApi.meta.total_results === 0 &&
    !!searchDidYouMean;

  const flatResults = useMemo(() => {
    const rank = (r: SearchResult) =>
      r.match_score ??
      (typeof r.score === "number" && r.score < 99 ? (99 - r.score) / 99 : 0);
    const merged = [...filteredSearchResults.tests, ...filteredSearchResults.packages].sort(
      (a, b) => rank(b) - rank(a)
    );
    return merged.slice(0, MAX_SEARCH_RESULTS);
  }, [filteredSearchResults.packages, filteredSearchResults.tests]);

  const flatResultsKey = useMemo(
    () => flatResults.map((r) => `${r.kind}:${r.id}`).join("|"),
    [flatResults]
  );

  useEffect(() => {
    setHighlightedResult(flatResults.length > 0 ? 0 : -1);
  }, [flatResults.length, flatResultsKey]);

  useEffect(() => {
    if (debouncedQuery.length < 2) return;
    if (isInvestigationSearchLoading) return;
    if (filteredSearchResults.tests.length > 0 || filteredSearchResults.packages.length > 0) return;
    notify(`no-results:${debouncedQuery}`, () =>
      toast.info(`No tests found for '${debouncedQuery}'`)
    );
  }, [
    debouncedQuery,
    filteredSearchResults.packages.length,
    filteredSearchResults.tests.length,
    isInvestigationSearchLoading,
    notify,
    toast,
  ]);

  const addTest = useCallback(
    (
      serviceId: string,
      source: "manual" | "diagnosis_map" | "bundle",
      opts?: {
        bundleId?: string;
        diagnosisId?: string;
        displayName?: string;
        recommendationReason?: string;
        recommendationScore?: number;
        confidenceLabel?: string;
        investigationFromApi?: SearchResult["investigationFromApi"];
        /** Set when picking from Common tests / search UI so live API ids not in static master stay catalog. */
        fromCatalogUi?: boolean;
        /** Used when applying packages: one summary toast instead of per-test toasts. */
        suppressSuccessToast?: boolean;
      }
    ) => {
      const labelForCanon = opts?.displayName ?? masterById[serviceId]?.name ?? "";
      if (selectedCanonicalKeys.has(canonicalInvestigationKey(serviceId, labelForCanon))) return false;
      const master = masterById[serviceId] ?? {
        service_id: serviceId,
        name: opts?.displayName ?? serviceId,
        category: "Investigation",
        sample: "NA",
        tat: "NA",
        preparation: "NA",
      };
      const api = opts?.investigationFromApi;
      const preparationDisplay =
        api?.preparation_notes?.trim() ||
        api?.synopsis?.trim() ||
        master.preparation;
      const sampleDisplay = api?.sample_type?.trim() ? api.sample_type : master.sample;
      const tatDisplay =
        typeof api?.tat_hours_default === "number"
          ? `${api.tat_hours_default} hours`
          : master.tat;
      const categoryDisplay = api?.category?.trim() ? api.category : master.category;

      const nextItem: ConsultationSectionItem = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: master.name,
        name: master.name,
        /** Custom = free-text Enter only, or non-catalog without catalog UI flags — not live suggestion picks. */
        is_custom:
          source === "manual" &&
          !masterById[serviceId] &&
          !opts?.investigationFromApi &&
          !opts?.fromCatalogUi,
        is_complete: false,
        detail: {
          service_id: master.service_id,
          recommendation_source: source,
          ...(source === "bundle" && opts?.bundleId ? { bundle_id: opts.bundleId } : {}),
          ...(source === "diagnosis_map" && opts?.diagnosisId
            ? { diagnosis_id: opts.diagnosisId }
            : {}),
          ...(opts?.recommendationReason ? { recommendation_reason: opts.recommendationReason } : {}),
          ...(typeof opts?.recommendationScore === "number"
            ? { recommendation_score: opts.recommendationScore }
            : {}),
          ...(opts?.confidenceLabel ? { confidence_label: opts.confidenceLabel } : {}),
          price_snapshot: null,
          urgency: "routine",
          instructions: [],
          notes: "",
          investigation_category: categoryDisplay,
          investigation_sample: sampleDisplay,
          investigation_tat: tatDisplay,
          investigation_preparation: preparationDisplay,
        },
      };
      nextItem.is_complete = evaluateSectionItemComplete("investigations", nextItem);
      replaceSectionItems("investigations", [nextItem, ...selectedItems]);
      setSelectedDetail({ section: "investigations", itemId: nextItem.id });
      searchInputRef.current?.focus();
      setRecentlyAddedItemId(nextItem.id);
      if (source !== "bundle" && !opts?.suppressSuccessToast) {
        const addedLabel = master.name;
        const dedupeKey = `add-success:${canonicalInvestigationKey(serviceId, labelForCanon)}`;
        notify(dedupeKey, () => {
          toast.success(`${addedLabel} added to selected tests`);
        });
      }
      return true;
    },
    [masterById, notify, replaceSectionItems, selectedItems, selectedCanonicalKeys, setSelectedDetail, toast]
  );

  const addCustomInvestigationItem = useCallback(
    (form: CustomInvestigationFormValues) => {
      const displayName = form.name.trim();
      if (
        selectedNormalizedNames.has(normalizeInvestigationName(displayName)) ||
        selectedCanonicalKeys.has(canonicalInvestigationKey(displayName, displayName))
      ) {
        notify(`custom-dup:${normalizeInvestigationName(displayName)}`, () =>
          toast.info("Test already exists")
        );
        return;
      }
      const serviceId = `custom-${
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      }`;
      const nextItem: ConsultationSectionItem = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: displayName,
        name: displayName,
        is_custom: true,
        is_complete: false,
        detail: {
          service_id: serviceId,
          recommendation_source: "manual",
          price_snapshot: null,
          urgency: form.urgency,
          custom_investigation_type: form.custom_investigation_type,
          instructions: [],
          notes: form.instructions,
          investigation_category: "Custom",
          investigation_sample: "—",
          investigation_tat: "—",
          investigation_preparation: "—",
        },
      };
      nextItem.is_complete = evaluateSectionItemComplete("investigations", nextItem);
      replaceSectionItems("investigations", [nextItem, ...selectedItems]);
      setSelectedDetail({ section: "investigations", itemId: nextItem.id });
      searchInputRef.current?.focus();
      setRecentlyAddedItemId(nextItem.id);
      setQuery("");
      notify(`custom-add:${normalizeInvestigationName(displayName)}`, () =>
        toast.success("Custom test added")
      );
    },
    [notify, replaceSectionItems, selectedItems, selectedCanonicalKeys, selectedNormalizedNames, setSelectedDetail, toast]
  );

  const handleApplyPackage = useCallback(
    (bundleId: string, opts?: { serviceCodes?: string[]; displayName?: string }) => {
      const canonicalId = normalizeBundleId(bundleId);
      const pkg = packageById[canonicalId];
      const serviceCodes = opts?.serviceCodes?.length ? opts.serviceCodes : pkg?.service_ids;
      if (!serviceCodes?.length) {
        notify(`pkg-no-tests:${canonicalId}`, () => toast.info("Package has no tests"));
        return;
      }
      const added: string[] = [];
      let skipped = 0;
      serviceCodes.forEach((serviceId) => {
        const firstDiagnosisId = diagnosisIdByService[serviceId];
        const didAdd = addTest(serviceId, "bundle", {
          bundleId: canonicalId,
          diagnosisId: firstDiagnosisId,
          suppressSuccessToast: true,
        });
        if (didAdd) added.push(serviceId);
        else skipped += 1;
      });
      if (added.length === 0) {
        notify(`pkg-included:${canonicalId}`, () => toast.info("Package already included"));
        return;
      }
      setAppliedPackage(canonicalId, serviceCodes);
      if (!pkg && opts?.displayName) {
        setBundleLabelOverrides((prev) => ({ ...prev, [canonicalId]: opts.displayName! }));
      }
      const pkgName = pkg?.name ?? opts?.displayName ?? canonicalId;
      if (skipped > 0) {
        notify(`pkg-partial:${canonicalId}`, () =>
          toast.success(`${pkgName}: Package added (duplicates skipped)`)
        );
      } else {
        notify(`pkg-full:${canonicalId}`, () => toast.success(`${pkgName} added`));
      }
      searchInputRef.current?.focus();
    },
    [addTest, diagnosisIdByService, masterById, notify, packageById, setAppliedPackage, toast]
  );

  const removeTest = useCallback(
    (itemId: string) => {
      const removed = selectedItems.find((item) => item.id === itemId) ?? null;
      if (!removed) return;
      const label = removed.label ?? removed.name ?? "Test";
      const nextList = selectedItems.filter((item) => item.id !== itemId);
      if (selectedDetail?.section === "investigations" && selectedDetail.itemId === itemId) {
        setSelectedDetail(null);
      }
      replaceSectionItems("investigations", nextList);
      searchInputRef.current?.focus();
      notify(`remove:${itemId}`, () =>
        toast.success(`${label} removed`, {
          action: {
            label: "Undo",
            onClick: () => {
              replaceSectionItems("investigations", [removed, ...nextList]);
              setSelectedDetail({ section: "investigations", itemId: removed.id });
              searchInputRef.current?.focus();
              notify(`undo:${removed.id}`, () => toast.success(`${label} restored`));
            },
          },
        })
      );
    },
    [notify, replaceSectionItems, selectedDetail, selectedItems, setSelectedDetail, toast]
  );

  const selectedItemId =
    selectedDetail?.section === "investigations" ? selectedDetail.itemId ?? null : null;

  const packageGroups = useMemo(() => {
    return Object.entries(appliedPackages).map(([bundleId, map]) => {
      const itemsInBundle = selectedItems.filter((item) => item.detail?.bundle_id === bundleId);
      const matched = map.test_ids.filter((id) => {
        if (selectedServiceIds.has(id)) return true;
        const label = masterById[id]?.name ?? id;
        return selectedCanonicalKeys.has(canonicalInvestigationKey(id, label));
      }).length;
      const state = matched === 0 ? "none" : matched === map.test_ids.length ? "applied" : "modified";
      return { bundleId, itemsInBundle, matched, total: map.test_ids.length, state };
    });
  }, [appliedPackages, masterById, selectedCanonicalKeys, selectedItems, selectedServiceIds]);

  const standaloneItems = useMemo(
    () => selectedItems.filter((item) => !item.detail?.bundle_id),
    [selectedItems]
  );

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      if (result.kind === "test") {
        if (
          selectedServiceIds.has(result.id) ||
          selectedCanonicalKeys.has(canonicalInvestigationKey(result.id, result.label))
        ) {
          notify(`dup-search-t:${result.id}`, () =>
            toast.warning("This test is already in your list")
          );
          return;
        }
        const ok = addTest(result.id, "manual", {
          displayName: result.label,
          investigationFromApi: result.investigationFromApi,
          fromCatalogUi: true,
        });
        if (!ok) {
          notify(`dup-search-t2:${result.id}`, () =>
            toast.warning("This test is already in your list")
          );
          return;
        }
      } else {
        if (
          isSearchPackageFullyAdded(
            result,
            packageById,
            selectedServiceIds,
            selectedCanonicalKeys,
            masterById
          )
        ) {
          notify(`dup-search-p:${result.id}`, () =>
            toast.info("Package already included")
          );
          return;
        }
        const codes = result.service_codes?.length ? result.service_codes : undefined;
        handleApplyPackage(result.id, {
          serviceCodes: codes,
          displayName: result.label,
        });
      }
      setQuery("");
      searchInputRef.current?.focus();
    },
    [
      addTest,
      handleApplyPackage,
      masterById,
      notify,
      packageById,
      selectedCanonicalKeys,
      selectedServiceIds,
      toast,
    ]
  );

  const handleAddNew = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (trimmed.length < 2) {
      notify("enter-two-chars", () => toast.warning("Enter at least 2 characters"));
      return;
    }
    runWithSelectionGuard(() => {
      const n = normalizeInvestigationName(trimmed);
      if (selectedNormalizedNames.has(n)) {
        notify(`addnew-dup-name:${n}`, () =>
          toast.warning("This test is already in your list")
        );
        return;
      }
      if (catalogNormalizedNames.has(n)) {
        notify(`addnew-catalog:${n}`, () =>
          toast.info("This matches a catalog investigation — use search or suggestions to add it.")
        );
        return;
      }
      const serviceId = slugify(trimmed);
      if (selectedServiceIds.has(serviceId)) {
        notify(`addnew-dup-svc:${serviceId}`, () =>
          toast.warning("This test is already in your list")
        );
        return;
      }
      if (selectedCanonicalKeys.has(canonicalInvestigationKey(serviceId, trimmed))) {
        notify(`addnew-dup-can:${serviceId}`, () =>
          toast.warning("This test is already in your list")
        );
        return;
      }
      const ok = addTest(serviceId, "manual");
      if (!ok) {
        notify(`addnew-fail:${serviceId}`, () =>
          toast.warning("This test is already in your list")
        );
        return;
      }
      setQuery("");
    });
  }, [
    addTest,
    catalogNormalizedNames,
    notify,
    query,
    runWithSelectionGuard,
    selectedCanonicalKeys,
    selectedNormalizedNames,
    selectedServiceIds,
    toast,
  ]);

  const handleSectionCardActivate = useCallback(() => {
    activateSection("investigations");
    sectionCardRef.current?.expand();
  }, [activateSection]);

  const handleSectionContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (shouldIgnoreSectionActivationClick(event.target, event.currentTarget)) return;
      handleSectionCardActivate();
    },
    [handleSectionCardActivate]
  );

  return (
    <>
    <TooltipProvider delayDuration={200}>
    <div
      ref={(el) => registerSectionRef("investigations", el)}
      id="investigations-section"
      role="button"
      tabIndex={0}
      onClick={handleSectionContainerClick}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleSectionCardActivate();
      }}
      className={cn(
        "ccp-mid-section scroll-mt-2 rounded-2xl cursor-pointer transition-colors hover:border-blue-300/70 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40",
        activeSectionKey === "investigations" && "ccp-mid-section--active"
      )}
    >
      <ConsultationSectionCard
        ref={sectionCardRef}
        title="Investigations"
        icon={<FlaskConical className="text-muted-foreground" />}
        defaultOpen={false}
      >
        <div className="space-y-3">
          <div className="consultation-section-search-row sticky top-0 z-[5] -mx-1 bg-card/95 px-1 pb-2 pt-0.5 backdrop-blur-sm dark:bg-card/95">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search investigations, scans, packages... (Enter to add)"
                  value={query}
                  onFocus={() => {
                    activateSection("investigations");
                    sectionCardRef.current?.expand();
                  }}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setQuery("");
                      return;
                    }
                    if (event.key === "ArrowDown" && flatResults.length > 0) {
                      event.preventDefault();
                      setHighlightedResult((prev) => Math.min(prev + 1, flatResults.length - 1));
                      return;
                    }
                    if (event.key === "ArrowUp" && flatResults.length > 0) {
                      event.preventDefault();
                      setHighlightedResult((prev) => Math.max(prev - 1, 0));
                      return;
                    }
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (highlightedResult >= 0 && flatResults[highlightedResult]) {
                        runWithSelectionGuard(() =>
                          handleSearchSelect(flatResults[highlightedResult])
                        );
                        return;
                      }
                      handleAddNew();
                    }
                  }}
                  className="h-10 rounded-lg border-border/60 bg-muted/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-2"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 shrink-0 gap-1.5 rounded-lg"
                onClick={() => setCustomInvestigationSheetOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add New
              </Button>
            </div>
            {!!debouncedQuery && debouncedQuery.length >= 2 && (
              <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-card p-2">
                {isInvestigationSearchLoading &&
                  !FORCE_INVESTIGATION_SEARCH_STATIC &&
                  debouncedQuery.length >= 2 && (
                    <p className="text-xs text-muted-foreground">Searching catalog…</p>
                  )}
                {useInvestigationSearchFallback && debouncedQuery.length >= 2 && (
                  <p className="text-xs text-amber-700">
                    Live search unavailable. Using offline matches.
                  </p>
                )}
                {showSearchDidYouMean && searchDidYouMean && (
                  <button
                    type="button"
                    className="text-left text-xs text-blue-700 hover:underline"
                    onClick={() => setQuery(searchDidYouMean)}
                  >
                    Did you mean &quot;{searchDidYouMean}&quot;?
                  </button>
                )}
                {filteredSearchResults.tests.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Tests</p>
                    <div className="flex flex-wrap gap-2">
                      {filteredSearchResults.tests.map((result) => {
                        const idx = flatResults.findIndex(
                          (item) => item.id === result.id && item.kind === "test"
                        );
                        return (
                          <button
                            key={`test-${result.id}`}
                            type="button"
                            onClick={() =>
                              runWithSelectionGuard(() => handleSearchSelect(result))
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm",
                              idx === highlightedResult
                                ? "border-blue-500 bg-blue-50 text-blue-800"
                                : "border-border bg-muted/40 hover:bg-muted/60"
                            )}
                          >
                            {result.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {filteredSearchResults.packages.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Packages</p>
                    <div className="flex flex-wrap gap-2">
                      {filteredSearchResults.packages.map((result) => {
                        const idx = flatResults.findIndex(
                          (item) => item.id === result.id && item.kind === "package"
                        );
                        return (
                          <button
                            key={`pkg-${result.id}`}
                            type="button"
                            onClick={() =>
                              runWithSelectionGuard(() => handleSearchSelect(result))
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm font-medium",
                              idx === highlightedResult
                                ? "border-blue-500 bg-blue-50 text-blue-800"
                                : "border-border bg-muted/30 hover:bg-muted/60"
                            )}
                          >
                            {result.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Selected Tests</p>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No investigations added. Search to add tests or select from recommendations.
              </p>
            ) : (
              <div className="space-y-2.5">
                {packageGroups
                  .filter((group) => group.state !== "none")
                  .map((group) => {
                    const canon = normalizeBundleId(group.bundleId);
                    const pkg = packageById[canon];
                    const pkgTitle = pkg?.name ?? bundleLabelOverrides[canon] ?? group.bundleId;
                    return (
                      <div
                        key={group.bundleId}
                        className="space-y-2 rounded-lg border border-violet-200/70 bg-violet-50/40 px-2.5 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-violet-800">
                              {pkgTitle} ({group.state === "applied" ? "Applied" : "Modified"}) •{" "}
                              {group.matched}/{group.total} matched
                            </p>
                          </div>
                          <button
                            type="button"
                            className="ml-auto rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/60"
                            onClick={() => {
                              if (
                                selectedDetail?.section === "investigations" &&
                                selectedDetail.itemId &&
                                selectedItems.some(
                                  (item) =>
                                    item.id === selectedDetail.itemId &&
                                    item.detail?.bundle_id === group.bundleId
                                )
                              ) {
                                setSelectedDetail(null);
                              }
                              replaceSectionItems(
                                "investigations",
                                selectedItems.filter((item) => item.detail?.bundle_id !== group.bundleId)
                              );
                              clearAppliedPackage(group.bundleId);
                              searchInputRef.current?.focus();
                            }}
                          >
                            Remove Package
                          </button>
                        </div>
                        <hr className="border-violet-200/70" />
                        <div className="flex flex-wrap gap-1.5">
                          {group.itemsInBundle.map((item) => (
                            <InvestigationItemChip
                              key={item.id}
                              item={item}
                              selected={selectedItemId === item.id}
                              recentlyAdded={recentlyAddedItemId === item.id}
                              onSelect={() =>
                                setSelectedDetail({ section: "investigations", itemId: item.id })
                              }
                              onRemove={() => removeTest(item.id)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                {standaloneItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {standaloneItems.map((item) => (
                      <InvestigationItemChip
                        key={item.id}
                        item={item}
                        selected={selectedItemId === item.id}
                        recentlyAdded={recentlyAddedItemId === item.id}
                        onSelect={() =>
                          setSelectedDetail({ section: "investigations", itemId: item.id })
                        }
                        onRemove={() => removeTest(item.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <hr className="border-border" />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Common Tests
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {useSuggestionsFallback ? "Fallback recommendations" : "Live suggestions"}
            </p>
            {isSuggestionsLoading && (
              <p className="mb-2 text-xs text-muted-foreground">Loading live suggestions…</p>
            )}
            {suggestionsError && (
              <p className="mb-2 text-xs text-amber-700">{suggestionsError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {visibleCommonTestSuggestions.map((test) => (
                <button
                  key={test.id}
                  type="button"
                  className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm hover:bg-muted/60"
                  onClick={() =>
                    runWithSelectionGuard(() => {
                      const ok = addTest(test.id, "manual", {
                        displayName: test.name,
                        recommendationReason: test.reason,
                        recommendationScore: test.score,
                        confidenceLabel: test.confidence_label,
                        fromCatalogUi: true,
                      });
                      if (!ok)
                        notify(`sugg-common-dup:${test.id}`, () =>
                          toast.info(`${test.name} is already added`)
                        );
                    })
                  }
                >
                  {test.name}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-border" />

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Recommended Tests</p>
            {visibleRecommendedTestSuggestions.length === 0 ? (
              <p className="text-sm italic text-muted-foreground/80">No recommendations available</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {visibleRecommendedTestSuggestions.map((test) => (
                  <button
                    key={test.id}
                    type="button"
                    className="rounded-full border border-border bg-transparent px-3 py-1.5 text-sm hover:bg-muted/40"
                    onClick={() =>
                      runWithSelectionGuard(() => {
                        const ok = addTest(test.id, "diagnosis_map", {
                          diagnosisId: diagnosisIdByService[test.id],
                          displayName: test.name,
                          recommendationReason: test.reason,
                          recommendationScore: test.score,
                          confidenceLabel: test.confidence_label,
                        });
                        if (!ok)
                          notify(`sugg-rec-dup:${test.id}`, () =>
                            toast.info(`${test.name} is already added`)
                          );
                      })
                    }
                    title={test.reason}
                  >
                    {test.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Recommended Packages</p>
            {normalizedRecommendedPackages.length === 0 ? (
              <p className="text-sm italic text-muted-foreground/80">No recommendations available</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {normalizedRecommendedPackages.map(({ source: suggestedPackage, bundleId }) => {
                  if (!bundleId) return null;
                  const pkg = packageById[bundleId];
                  if (!pkg) return null;
                  const matched = pkg.service_ids.filter((id) => {
                    if (selectedServiceIds.has(id)) return true;
                    const label = masterById[id]?.name ?? id;
                    return selectedCanonicalKeys.has(canonicalInvestigationKey(id, label));
                  }).length;
                  const fullyAdded = matched === pkg.service_ids.length;
                  const btn = (
                    <button
                      key={suggestedPackage.id}
                      type="button"
                      disabled={fullyAdded}
                      onClick={() =>
                        runWithSelectionGuard(() => handleApplyPackage(bundleId))
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-left text-sm font-medium",
                        fullyAdded
                          ? "cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground"
                          : "border-border bg-muted/20 hover:bg-muted/40"
                      )}
                    >
                      {pkg.name} ({matched}/{pkg.service_ids.length}){" "}
                      {!fullyAdded ? `→ Add remaining ${pkg.service_ids.length - matched} tests` : ""}
                      {fullyAdded ? " • Already added" : ""}
                    </button>
                  );
                  return fullyAdded ? (
                    <Tooltip key={suggestedPackage.id}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">{btn}</span>
                      </TooltipTrigger>
                      <TooltipContent>Already added</TooltipContent>
                    </Tooltip>
                  ) : (
                    btn
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Popular Packages</p>
            <div className="flex flex-wrap gap-2">
              {normalizedPopularPackages.map(({ source: suggestedPackage, bundleId }) => {
                if (!bundleId) return null;
                const pkg = packageById[bundleId];
                if (!pkg) return null;
                const matched = pkg.service_ids.filter((id) => {
                  if (selectedServiceIds.has(id)) return true;
                  const label = masterById[id]?.name ?? id;
                  return selectedCanonicalKeys.has(canonicalInvestigationKey(id, label));
                }).length;
                const fullyAdded = matched === pkg.service_ids.length;
                const btn = (
                  <button
                    key={suggestedPackage.id}
                    type="button"
                    disabled={fullyAdded}
                    onClick={() =>
                      runWithSelectionGuard(() => handleApplyPackage(bundleId))
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-semibold",
                      fullyAdded
                        ? "cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground"
                        : "border-border bg-muted/20 hover:bg-muted/40"
                    )}
                  >
                    {pkg.name}
                    {fullyAdded ? " • Already added" : ""}
                  </button>
                );
                return fullyAdded ? (
                  <Tooltip key={suggestedPackage.id}>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">{btn}</span>
                    </TooltipTrigger>
                    <TooltipContent>Already added</TooltipContent>
                  </Tooltip>
                ) : (
                  btn
                );
              })}
            </div>
          </div>
        </div>
      </ConsultationSectionCard>
    </div>
    <CustomInvestigationSheet
      open={customInvestigationSheetOpen}
      onOpenChange={setCustomInvestigationSheetOpen}
      initialName={query}
      onSave={addCustomInvestigationItem}
    />
    </TooltipProvider>
    </>
  );
}

/** Unified with medicines/symptoms: name on chip; CUSTOM sub-tag; incomplete = orange (no complete on chip). */
function InvestigationItemChip({
  item,
  selected,
  recentlyAdded,
  onSelect,
  onRemove,
}: {
  item: ConsultationSectionItem;
  selected: boolean;
  recentlyAdded: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const incomplete = !evaluateSectionItemComplete("investigations", item);
  const showCustomTag = shouldShowInvestigationCustomTag(item);

  return (
    <span className="inline-flex max-w-full flex-col gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-all duration-200 ease-in-out",
          recentlyAdded &&
            "ring-2 ring-emerald-300 shadow-[0_0_0_2px_rgba(16,185,129,0.18)]",
          selected
            ? "border-blue-300 bg-blue-100 text-blue-800 ring-2 ring-blue-200 hover:bg-blue-200"
            : incomplete
              ? "border-orange-50 bg-orange-50 text-gray-800 hover:bg-orange-100"
              : "border-border/40 bg-gray-100 text-gray-800 hover:bg-gray-200"
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 truncate text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
        >
          {item.label}
        </button>
        {selected && <ConsultationEditingBadge onDarkChip className="ml-1 shrink-0" />}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "ml-0.5 shrink-0 rounded-full p-0.5 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selected ? "hover:bg-indigo-700 dark:hover:bg-indigo-700" : "hover:bg-muted"
          )}
          aria-label={`Remove ${item.label}`}
        >
          ×
        </button>
      </span>
      {showCustomTag && (
        <span className="flex flex-wrap gap-1 pl-1">
          <span className="rounded-md border-0 bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
            CUSTOM
          </span>
        </span>
      )}
    </span>
  );
}
