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

const SEARCH_DEBOUNCE_MS = 200;
const MAX_SEARCH_RESULTS = 10;
const MAX_RECOMMENDATIONS = 6;
const MAX_PACKAGES = 4;
const SUGGESTION_REFETCH_DEBOUNCE_MS = 350;

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
  const [recentlyAddedLabel, setRecentlyAddedLabel] = useState<string | null>(null);
  const [recentlyAddedItemId, setRecentlyAddedItemId] = useState<string | null>(null);
  const [lastRemovedItem, setLastRemovedItem] = useState<ConsultationSectionItem | null>(null);
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
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS).trim();
  const selectedItems = sectionItems.investigations ?? [];
  const selectedServiceIds = useMemo(
    () => new Set(selectedItems.map((it) => it.detail?.service_id ?? it.id)),
    [selectedItems]
  );
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
    const t = window.setTimeout(() => setRecentlyAddedLabel(null), 1200);
    return () => window.clearTimeout(t);
  }, [recentlyAddedLabel]);
  useEffect(() => {
    if (!recentlyAddedItemId) return;
    const t = window.setTimeout(() => setRecentlyAddedItemId(null), 500);
    return () => window.clearTimeout(t);
  }, [recentlyAddedItemId]);

  useEffect(() => {
    let dirty = false;
    Object.entries(appliedPackages).forEach(([bundleId, pkg]) => {
      const hasAny = pkg.test_ids.some((id) => selectedServiceIds.has(id));
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
    selectedDetail,
    selectedItems,
    selectedServiceIds,
    setSelectedDetail,
  ]);

  const masterById = useMemo(
    () =>
      Object.fromEntries(INVESTIGATION_MASTER_ITEMS.map((item) => [item.service_id, item])),
    []
  );
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
          toast.info("Live suggestions unavailable. Showing fallback recommendations.");
          didShowSuggestionsErrorRef.current = true;
        }
      })
      .finally(() => {
        if (!cancelled) setIsSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [encounterId, suggestionsRefetchSignal]);

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
        if (!out.includes(serviceId) && !selectedServiceIds.has(serviceId)) out.push(serviceId);
      });
    });
    return out.slice(0, MAX_RECOMMENDATIONS);
  }, [diagnosisKeys, selectedServiceIds]);

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

    if (selectedServiceIds.size > 0) {
      INVESTIGATION_PACKAGES.forEach((pkg) => {
        const selectedInBundle = pkg.service_ids.filter((id) => selectedServiceIds.has(id));
        const strictSubset =
          selectedInBundle.length > 0 && selectedInBundle.length < pkg.service_ids.length;
        if (strictSubset && !seen.has(pkg.bundle_id)) {
          seen.add(pkg.bundle_id);
          out.push(pkg.bundle_id);
        }
      });
    }
    return out.slice(0, MAX_PACKAGES);
  }, [diagnosisKeys, selectedServiceIds]);

  const fallbackPopularPackages = useMemo(() => {
    return INVESTIGATION_POPULAR_PACKAGE_IDS.filter((id) => !fallbackRecommendedPackages.includes(id));
  }, [fallbackRecommendedPackages]);

  const commonTestSuggestions = useMemo(() => {
    if (!useSuggestionsFallback && suggestions?.common_tests?.length) {
      return suggestions.common_tests.slice(0, MAX_SEARCH_RESULTS);
    }
    return INVESTIGATION_QUICK_PICKS.map((serviceId) => ({
      id: serviceId,
      name: masterById[serviceId]?.name ?? serviceId,
      score: 0,
      confidence: 0,
      confidence_label: "Suggested",
      reason: "Commonly used",
      badges: [],
    })) as InvestigationSuggestionTest[];
  }, [masterById, suggestions, useSuggestionsFallback]);

  const recommendedTestSuggestions = useMemo(() => {
    if (!useSuggestionsFallback && suggestions?.recommended_tests?.length) {
      return suggestions.recommended_tests.slice(0, MAX_RECOMMENDATIONS);
    }
    if (!useSuggestionsFallback && suggestions && !suggestions.recommended_tests?.length) {
      return commonTestSuggestions.slice(0, MAX_RECOMMENDATIONS);
    }
    return fallbackRecommendedTests.map((serviceId) => ({
      id: serviceId,
      name: masterById[serviceId]?.name ?? serviceId,
      score: 0,
      confidence: 0,
      confidence_label: "Recommended",
      reason: "Mapped from diagnosis",
      badges: [],
    })) as InvestigationSuggestionTest[];
  }, [commonTestSuggestions, fallbackRecommendedTests, masterById, suggestions, useSuggestionsFallback]);

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
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsInvestigationSearchLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

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
    const merged = [...searchResults.tests, ...searchResults.packages].sort(
      (a, b) => rank(b) - rank(a)
    );
    return merged.slice(0, MAX_SEARCH_RESULTS);
  }, [searchResults]);

  const flatResultsKey = useMemo(
    () => flatResults.map((r) => `${r.kind}:${r.id}`).join("|"),
    [flatResults]
  );

  useEffect(() => {
    setHighlightedResult(flatResults.length > 0 ? 0 : -1);
  }, [flatResults.length, flatResultsKey]);

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
      }
    ) => {
      if (selectedServiceIds.has(serviceId)) return false;
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
        is_custom: source === "manual" && !masterById[serviceId],
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
      replaceSectionItems("investigations", [nextItem, ...selectedItems]);
      setSelectedDetail({ section: "investigations", itemId: nextItem.id });
      searchInputRef.current?.focus();
      setRecentlyAddedLabel(master.name);
      setRecentlyAddedItemId(nextItem.id);
      return true;
    },
    [masterById, replaceSectionItems, selectedItems, selectedServiceIds, setSelectedDetail]
  );

  const handleApplyPackage = useCallback(
    (bundleId: string, opts?: { serviceCodes?: string[]; displayName?: string }) => {
      const canonicalId = normalizeBundleId(bundleId);
      const pkg = packageById[canonicalId];
      const serviceCodes = opts?.serviceCodes?.length ? opts.serviceCodes : pkg?.service_ids;
      if (!serviceCodes?.length) {
        toast.info("Package has no tests");
        return;
      }
      const added: string[] = [];
      serviceCodes.forEach((serviceId) => {
        const firstDiagnosisId = diagnosisIdByService[serviceId];
        const didAdd = addTest(serviceId, "bundle", {
          bundleId: canonicalId,
          diagnosisId: firstDiagnosisId,
        });
        if (didAdd) added.push(serviceId);
      });
      if (added.length === 0) {
        toast.info("Already added");
        return;
      }
      setAppliedPackage(canonicalId, serviceCodes);
      if (!pkg && opts?.displayName) {
        setBundleLabelOverrides((prev) => ({ ...prev, [canonicalId]: opts.displayName! }));
      }
      const pkgName = pkg?.name ?? opts?.displayName ?? canonicalId;
      const addedNames = added
        .map((id) => masterById[id]?.name ?? id)
        .slice(0, 3)
        .map((label) => `+ ${label}`);
      toast.success(`${pkgName}: ${addedNames.join(", ")}${added.length > 3 ? "..." : ""}`);
      searchInputRef.current?.focus();
    },
    [addTest, diagnosisIdByService, masterById, packageById, setAppliedPackage, toast]
  );

  const removeTest = useCallback(
    (itemId: string) => {
      const removed = selectedItems.find((item) => item.id === itemId) ?? null;
      if (selectedDetail?.section === "investigations" && selectedDetail.itemId === itemId) {
        setSelectedDetail(null);
      }
      replaceSectionItems(
        "investigations",
        selectedItems.filter((item) => item.id !== itemId)
      );
      if (removed) setLastRemovedItem(removed);
      searchInputRef.current?.focus();
    },
    [replaceSectionItems, selectedDetail, selectedItems, setSelectedDetail]
  );

  const selectedItemId =
    selectedDetail?.section === "investigations" ? selectedDetail.itemId ?? null : null;

  const packageGroups = useMemo(() => {
    return Object.entries(appliedPackages).map(([bundleId, map]) => {
      const itemsInBundle = selectedItems.filter((item) => item.detail?.bundle_id === bundleId);
      const matched = map.test_ids.filter((id) => selectedServiceIds.has(id)).length;
      const state = matched === 0 ? "none" : matched === map.test_ids.length ? "applied" : "modified";
      return { bundleId, itemsInBundle, matched, total: map.test_ids.length, state };
    });
  }, [appliedPackages, selectedItems, selectedServiceIds]);

  const standaloneItems = useMemo(
    () => selectedItems.filter((item) => !item.detail?.bundle_id),
    [selectedItems]
  );

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      if (result.kind === "test") {
        addTest(result.id, "manual", {
          displayName: result.label,
          investigationFromApi: result.investigationFromApi,
        });
      } else {
        const codes = result.service_codes?.length ? result.service_codes : undefined;
        handleApplyPackage(result.id, {
          serviceCodes: codes,
          displayName: result.label,
        });
      }
      setQuery("");
      searchInputRef.current?.focus();
    },
    [addTest, handleApplyPackage]
  );

  const handleAddNew = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const serviceId = slugify(trimmed);
    addTest(serviceId, "manual");
    setQuery("");
  }, [addTest, query]);

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
                        handleSearchSelect(flatResults[highlightedResult]);
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
                onClick={handleAddNew}
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
                {searchResults.tests.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Tests</p>
                    <div className="flex flex-wrap gap-2">
                      {searchResults.tests.map((result) => {
                        const idx = flatResults.findIndex(
                          (item) => item.id === result.id && item.kind === "test"
                        );
                        return (
                          <button
                            key={`test-${result.id}`}
                            type="button"
                            onClick={() => handleSearchSelect(result)}
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
                {searchResults.packages.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Packages</p>
                    <div className="flex flex-wrap gap-2">
                      {searchResults.packages.map((result) => {
                        const idx = flatResults.findIndex(
                          (item) => item.id === result.id && item.kind === "package"
                        );
                        return (
                          <button
                            key={`pkg-${result.id}`}
                            type="button"
                            onClick={() => handleSearchSelect(result)}
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
            {recentlyAddedLabel && (
              <p className="mb-2 text-xs text-emerald-700">+ {recentlyAddedLabel} added</p>
            )}
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No investigations added. Search to add tests or select from recommendations.
              </p>
            ) : (
              <div className="space-y-2.5">
                {lastRemovedItem && (
                  <div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5 text-xs">
                    <span className="text-muted-foreground">Removed {lastRemovedItem.label}</span>
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => {
                        replaceSectionItems("investigations", [lastRemovedItem, ...selectedItems]);
                        setLastRemovedItem(null);
                        searchInputRef.current?.focus();
                      }}
                    >
                      Undo
                    </button>
                  </div>
                )}
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
                          {group.itemsInBundle.map((item) => {
                            const selected = selectedItemId === item.id;
                            return (
                              <span
                                key={item.id}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-shadow",
                                  recentlyAddedItemId === item.id &&
                                    "ring-2 ring-emerald-300 shadow-[0_0_0_2px_rgba(16,185,129,0.18)]",
                                  selected
                                    ? "border-blue-300 bg-blue-100 text-blue-800 ring-2 ring-blue-200"
                                    : "border-border/40 bg-gray-100 text-gray-800"
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedDetail({ section: "investigations", itemId: item.id })
                                  }
                                  className="truncate"
                                >
                                  {item.label}
                                </button>
                                {selected && <ConsultationEditingBadge onDarkChip className="ml-1 shrink-0" />}
                                <button
                                  type="button"
                                  onClick={() => removeTest(item.id)}
                                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                                  aria-label={`Remove ${item.label}`}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                {standaloneItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {standaloneItems.map((item) => {
                      const selected = selectedItemId === item.id;
                      return (
                        <span
                          key={item.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-shadow",
                            recentlyAddedItemId === item.id &&
                              "ring-2 ring-emerald-300 shadow-[0_0_0_2px_rgba(16,185,129,0.18)]",
                            selected
                              ? "border-blue-300 bg-blue-100 text-blue-800 ring-2 ring-blue-200"
                              : "border-border/40 bg-gray-100 text-gray-800"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedDetail({ section: "investigations", itemId: item.id })}
                            className="truncate"
                          >
                            {item.label}
                          </button>
                          {selected && <ConsultationEditingBadge onDarkChip className="ml-1 shrink-0" />}
                          <button
                            type="button"
                            onClick={() => removeTest(item.id)}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                            aria-label={`Remove ${item.label}`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
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
              {commonTestSuggestions.map((test) => (
                <button
                  key={test.id}
                  type="button"
                  className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm hover:bg-muted/60"
                  onClick={() =>
                    addTest(test.id, "manual", {
                      displayName: test.name,
                      recommendationReason: test.reason,
                      recommendationScore: test.score,
                      confidenceLabel: test.confidence_label,
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
            {recommendedTestSuggestions.length === 0 ? (
              <p className="text-sm italic text-muted-foreground/80">No recommendations available</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {recommendedTestSuggestions.map((test) => (
                  <button
                    key={test.id}
                    type="button"
                    className="rounded-full border border-border bg-transparent px-3 py-1.5 text-sm hover:bg-muted/40"
                    onClick={() =>
                      addTest(test.id, "diagnosis_map", {
                        diagnosisId: diagnosisIdByService[test.id],
                        displayName: test.name,
                        recommendationReason: test.reason,
                        recommendationScore: test.score,
                        confidenceLabel: test.confidence_label,
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
                  const matched = pkg.service_ids.filter((id) => selectedServiceIds.has(id)).length;
                  const fullyAdded = matched === pkg.service_ids.length;
                  return (
                    <button
                      key={suggestedPackage.id}
                      type="button"
                      disabled={fullyAdded}
                      onClick={() => handleApplyPackage(bundleId)}
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
                const matched = pkg.service_ids.filter((id) => selectedServiceIds.has(id)).length;
                const fullyAdded = matched === pkg.service_ids.length;
                return (
                  <button
                    key={suggestedPackage.id}
                    type="button"
                    disabled={fullyAdded}
                    onClick={() => handleApplyPackage(bundleId)}
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
              })}
            </div>
          </div>
        </div>
      </ConsultationSectionCard>
    </div>
  );
}
