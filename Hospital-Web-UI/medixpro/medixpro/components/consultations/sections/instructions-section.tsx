"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { FileText, Lock, Loader2, Plus, Search, AlertTriangle } from "lucide-react";
import {
  ConsultationSectionCard,
  type ConsultationSectionCardHandle,
} from "@/components/consultations/consultation-section-card";
import { useConsultationSectionScroll } from "@/components/consultations/consultation-section-scroll-context";
import { ConsultationEditingBadge } from "@/components/consultations/consultation-editing-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConsultationStore } from "@/store/consultationStore";
import { apiClient } from "@/lib/apiClient";
import type { InstructionsSectionSchema, InstructionItemSchema } from "@/lib/consultation-schema-types";
import {
  extractPrimarySpecializationFromProfile,
  fetchInstructionSuggestions,
  normalizeSpecialtySlug,
  type InstructionSuggestionRow,
} from "@/lib/instructionSuggestionsApi";
import { getBearerAuthHeaders } from "@/lib/bearer-auth-headers";
import { cn, isUuidLike } from "@/lib/utils";
import { reorderItemsByActiveId } from "@/lib/consultation-chip-ux";
import {
  pickDefaultSectionItemId,
  shouldIgnoreSectionActivationClick,
} from "@/lib/consultation-section-activation";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { isEncounterInstructionIncomplete } from "@/lib/instruction-completion";

const INSTRUCTION_TEMPLATE_PREFIX = "tpl:";
const TOAST_DEDUPE_MS = 2000;
const DEFAULT_SPECIALTY_SLUG = "physician";
const SUGGESTIONS_LIMIT = 20;
/** In-flow capsule strip: show first N; "View more" reveals the rest (same idea as Investigations). */
const SUGGESTIONS_CAPSULE_CAP = 8;

// Module-level cache: fetch instructions render-schema at most once per app session (avoids repeated GETs on re-render/remount)
let instructionsRenderSchemaPromise: Promise<InstructionsSectionSchema | null> | null = null;

function fetchInstructionsRenderSchema(specialty: string): Promise<InstructionsSectionSchema | null> {
  if (instructionsRenderSchemaPromise) return instructionsRenderSchemaPromise;
  instructionsRenderSchemaPromise = fetch(
    `/api/consultation/render-schema?specialty=${encodeURIComponent(specialty)}&section=instructions`
  )
    .then((res) => (res.ok ? res.json() : null))
    .then((data: InstructionsSectionSchema | null) =>
      data?.section === "instructions" && data.items ? data : null
    )
    .catch(() => null);
  return instructionsRenderSchemaPromise;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function InstructionsSection() {
  const toast = useToastNotification();
  const toastDedupeRef = useRef<Map<string, number>>(new Map());
  /** Empty deps: `useToastNotification()` returns a new object every render; do not depend on it. */
  const notify = useCallback((key: string, emit: () => void) => {
    const now = Date.now();
    const last = toastDedupeRef.current.get(key) ?? 0;
    if (now - last < TOAST_DEDUPE_MS) return;
    toastDedupeRef.current.set(key, now);
    emit();
  }, []);

  const {
    encounterId,
    instructionsSchema,
    setInstructionsSchema,
    instructionsList,
    setInstructionsList,
    consultationFinalized,
    setConsultationFinalized,
    selectedDetail,
    setSelectedDetail,
    setSelectedSymptomId,
    getInstructionTemplateByKeyOrId,
  } = useConsultationStore();

  const [loading, setLoading] = useState(false);
  const [inlineSearch, setInlineSearch] = useState("");
  const inlineSearchDebounced = useDebouncedValue(inlineSearch, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sectionCardRef = useRef<ConsultationSectionCardHandle>(null);
  const { registerSectionRef, activateSection, activeSectionKey } =
    useConsultationSectionScroll();

  const [specialtySlug, setSpecialtySlug] = useState(DEFAULT_SPECIALTY_SLUG);
  const [suggestionRows, setSuggestionRows] = useState<InstructionSuggestionRow[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [showAllInstructionSuggestions, setShowAllInstructionSuggestions] = useState(false);
  const suggestionsAbortRef = useRef<AbortController | null>(null);
  const suggestionsFetchGenRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.getProfile();
        if (cancelled) return;
        const profile =
          data && typeof data === "object" && "doctor_profile" in data
            ? (data as { doctor_profile?: unknown }).doctor_profile ?? data
            : data;
        const raw = extractPrimarySpecializationFromProfile(profile);
        if (raw) setSpecialtySlug(normalizeSpecialtySlug(raw));
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (encounterId) {
      setLoading(true);
      const encId = encounterId;
      const headers = getBearerAuthHeaders();
      /** Templates only — instructions are draft in Zustand until End Consultation (persisted in complete payload). */
      fetch(`/api/consultation/encounter/${encId}/instructions/templates`, {
        headers,
        credentials: "include",
      })
        .then(async (tRes) => {
          if (cancelled) return;
          if (useConsultationStore.getState().encounterId !== encId) return;
          if (!tRes.ok) {
            if (tRes.status === 403) setConsultationFinalized(true);
            return;
          }
          const tData = await tRes.json();
          if (cancelled) return;
          if (useConsultationStore.getState().encounterId !== encId) return;
          const categories = (tData.categories ?? []).map(
            (c: { id: string; code: string; name: string; display_order: number }) => ({
              id: c.id,
              code: c.code,
              name: c.name,
              display_order: c.display_order ?? 0,
            })
          );
          const templates: InstructionItemSchema[] = (tData.templates ?? []).map(
            (t: {
              id: string;
              key: string;
              label: string;
              category_code: string;
              requires_input: boolean;
              input_schema?: { fields: unknown[] };
              display_order?: number;
            }) => ({
              id: t.id,
              key: t.key,
              label: t.label,
              category_code: t.category_code,
              requires_input: t.requires_input,
              input_schema: t.input_schema,
              display_order: t.display_order ?? 0,
            })
          );
          setInstructionsSchema({
            section: "instructions",
            ui_type: "selectable_list_with_detail_panel",
            meta: {},
            categories,
            items: templates,
          });
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    // No encounter: static render-schema (items use key as id — not valid for Django POST).
    // Must not overwrite encounter-backed templates: see guard inside .then.
    const existing = useConsultationStore.getState().instructionsSchema;
    if (existing?.section === "instructions" && (existing?.items?.length ?? 0) > 0) {
      return;
    }
    setLoading(true);
    fetchInstructionsRenderSchema(specialtySlug)
      .then((data) => {
        if (cancelled) return;
        if (useConsultationStore.getState().encounterId) return;
        if (data) {
          setInstructionsSchema({
            ...data,
            categories: data.categories ?? [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [encounterId, specialtySlug, setInstructionsSchema, setConsultationFinalized]);

  const allTemplates = instructionsSchema?.items ?? [];

  const excludeTemplateKeys = useMemo(() => {
    const keys: string[] = [];
    for (const inst of instructionsList) {
      const t = getInstructionTemplateByKeyOrId(inst.instruction_template_id);
      if (t?.key) keys.push(t.key);
    }
    return keys;
  }, [instructionsList, getInstructionTemplateByKeyOrId]);

  useEffect(() => {
    if (consultationFinalized) {
      setSuggestionsLoading(false);
      return;
    }
    // While encounter templates / schema load, do not leave a stuck suggestions spinner
    // when a prior fetch was aborted (abort skips finally in older logic).
    if (loading) {
      suggestionsAbortRef.current?.abort();
      setSuggestionsLoading(false);
      setSuggestionsError(null);
      return;
    }

    suggestionsAbortRef.current?.abort();
    const ac = new AbortController();
    suggestionsAbortRef.current = ac;
    const gen = ++suggestionsFetchGenRef.current;
    const hasRowsAlready = suggestionRows.length > 0;
    setSuggestionsLoading(!hasRowsAlready);
    setSuggestionsError(null);
    fetchInstructionSuggestions(
      {
        q: inlineSearchDebounced,
        specialty: specialtySlug,
        limit: SUGGESTIONS_LIMIT,
      },
      { signal: ac.signal }
    )
      .then((res) => {
        if (ac.signal.aborted || gen !== suggestionsFetchGenRef.current) return;
        setSuggestionRows(res.data ?? []);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (gen !== suggestionsFetchGenRef.current) return;
        const msg = err instanceof Error ? err.message : "Failed to load instructions";
        setSuggestionsError(msg);
        notify("inst-suggestions-fail", () => toast.error("Failed to load instructions"));
      })
      .finally(() => {
        if (gen === suggestionsFetchGenRef.current) {
          setSuggestionsLoading(false);
        }
      });
    return () => ac.abort();
  }, [
    inlineSearchDebounced,
    specialtySlug,
    consultationFinalized,
    loading,
  ]);

  const filteredSuggestionRows = useMemo(() => {
    if (excludeTemplateKeys.length === 0) return suggestionRows;
    const excluded = new Set(excludeTemplateKeys);
    return suggestionRows.filter((row) => !excluded.has(row.key));
  }, [excludeTemplateKeys, suggestionRows]);

  const isSelected = (templateOrInstructionId: string) => {
    if (!selectedDetail || selectedDetail.section !== "instructions") return false;
    const id = selectedDetail.itemId;
    if (!id) return false;
    if (id.startsWith(INSTRUCTION_TEMPLATE_PREFIX)) {
      return id === INSTRUCTION_TEMPLATE_PREFIX + templateOrInstructionId;
    }
    return id === templateOrInstructionId;
  };

  const activeInstructionId =
    selectedDetail?.section === "instructions" ? selectedDetail.itemId ?? null : null;

  const orderedInstructions = useMemo(
    () => reorderItemsByActiveId(instructionsList, activeInstructionId),
    [instructionsList, activeInstructionId]
  );

  const selectInstructionAndScroll = useCallback(
    (itemId: string) => {
      setSelectedDetail({ section: "instructions", itemId });
      sectionCardRef.current?.expand();
      activateSection("instructions");
    },
    [setSelectedDetail, activateSection]
  );

  const isAdded = (templateId: string) =>
    instructionsList.some((i) => i.instruction_template_id === templateId);

  /** Show ⚠ only when template has required schema fields that are not yet filled (aligned with detail panel). */
  const isInstructionIncomplete = useCallback(
    (inst: {
      instruction_template_id: string;
      label: string;
      input_data?: Record<string, unknown> | null;
    }) => isEncounterInstructionIncomplete(inst, getInstructionTemplateByKeyOrId),
    [getInstructionTemplateByKeyOrId]
  );

  const incompleteCount = useMemo(
    () => instructionsList.filter((item) => isInstructionIncomplete(item)).length,
    [instructionsList, isInstructionIncomplete]
  );

  /** Match diagnosis/investigations: when this section becomes active, select a default row for the detail panel. */
  useEffect(() => {
    if (activeSectionKey !== "instructions") return;
    const currentSelectedId =
      selectedDetail?.section === "instructions" ? selectedDetail.itemId ?? null : null;
    if (currentSelectedId) return;
    const firstIncomplete = instructionsList.find((item) => isInstructionIncomplete(item));
    if (firstIncomplete) {
      setSelectedDetail({ section: "instructions", itemId: firstIncomplete.id });
    }
  }, [
    activeSectionKey,
    selectedDetail,
    instructionsList,
    isInstructionIncomplete,
    setSelectedDetail,
  ]);

  const suggestionRowsForCapsules = useMemo(() => {
    if (showAllInstructionSuggestions) return filteredSuggestionRows;
    return filteredSuggestionRows.slice(0, SUGGESTIONS_CAPSULE_CAP);
  }, [filteredSuggestionRows, showAllInstructionSuggestions]);

  const handleTemplateClick = (template: InstructionItemSchema) => {
    if (consultationFinalized) return;
    setSelectedSymptomId(null);
    const templateKeyOrId =
      (template as InstructionItemSchema & { id?: string }).id ?? template.key;
    const apiTemplateId = (template as InstructionItemSchema & { id?: string }).id;
    if (!apiTemplateId || !isUuidLike(String(apiTemplateId))) {
      notify("inst-invalid-tpl", () =>
        toast.error("Instruction template is missing a valid id. Reload the page or pick another item.")
      );
      return;
    }

    if (!template.requires_input) {
      if (isAdded(templateKeyOrId)) {
        const existing = instructionsList.find(
          (i) => i.instruction_template_id === templateKeyOrId
        );
        notify("inst-dup", () => toast.error("Instruction already added"));
        if (existing) selectInstructionAndScroll(existing.id);
        return;
      }
      {
        const tempId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? `inst-draft-${crypto.randomUUID()}`
            : `inst-local-${templateKeyOrId}-${Date.now()}`;
        setInstructionsList([
          {
            id: tempId,
            instruction_template_id: templateKeyOrId,
            label: template.label,
            input_data: {},
            custom_note: null,
            is_active: true,
          },
          ...instructionsList,
        ]);
        selectInstructionAndScroll(tempId);
        notify(`inst-add:${tempId}`, () => toast.success("Instruction added"));
      }
      return;
    }

    if (isAdded(templateKeyOrId)) {
      const existing = instructionsList.find(
        (i) => i.instruction_template_id === templateKeyOrId
      );
      notify("inst-dup", () => toast.error("Instruction already added"));
      if (existing) selectInstructionAndScroll(existing.id);
      return;
    }
    setSelectedDetail({
      section: "instructions",
      itemId: INSTRUCTION_TEMPLATE_PREFIX + apiTemplateId,
    });
    sectionCardRef.current?.expand();
    activateSection("instructions");
  };

  const handleSuggestionPick = (row: InstructionSuggestionRow) => {
    if (consultationFinalized) return;
    const template =
      getInstructionTemplateByKeyOrId(row.key) ??
      allTemplates.find(
        (t) => t.label.trim().toLowerCase() === row.label.trim().toLowerCase()
      );
    if (!template) {
      notify("inst-sug-missing-tpl", () =>
        toast.error("This instruction is not available for your specialty. Try reloading.")
      );
      return;
    }
    const templateKeyOrId =
      (template as InstructionItemSchema & { id?: string }).id ?? template.key;
    if (isAdded(templateKeyOrId)) {
      const existing = instructionsList.find(
        (i) => i.instruction_template_id === templateKeyOrId
      );
      notify("inst-dup", () => toast.error("Instruction already added"));
      if (existing) selectInstructionAndScroll(existing.id);
      setInlineSearch("");
      return;
    }
    handleTemplateClick(template);
    setInlineSearch("");
  };

  const handleCustomInstructionSubmit = () => {
    const text = customText.trim();
    if (!text) return;
    const key = `custom_${Date.now()}`;
    const tempId = `inst-local-${key}`;
    setSelectedSymptomId(null);
    setInstructionsList([
      {
        id: tempId,
        instruction_template_id: key,
        label: text,
        input_data: {},
        custom_note: null,
        is_active: true,
      },
      ...instructionsList,
    ]);
    selectInstructionAndScroll(tempId);
    setCustomDialogOpen(false);
    setCustomText("");
    notify(`inst-custom-local:${tempId}`, () => toast.success("Instruction added"));
  };

  const handleAddedInstructionClick = (instructionId: string) => {
    setSelectedSymptomId(null);
    selectInstructionAndScroll(instructionId);
  };

  const handleRemoveInstruction = (instructionId: string) => {
    if (consultationFinalized) return;
    const removedLabel =
      instructionsList.find((i) => i.id === instructionId)?.label ?? "Instruction";
    setInstructionsList(instructionsList.filter((i) => i.id !== instructionId));
    if (selectedDetail?.section === "instructions" && selectedDetail?.itemId === instructionId) {
      setSelectedDetail(null);
    }
    notify(`inst-rm:${instructionId}`, () => toast.success(`${removedLabel} removed`));
  };

  const locked = consultationFinalized;

  const handleSectionCardActivate = useCallback(() => {
    activateSection("instructions");
    sectionCardRef.current?.expand();
    if (selectedDetail?.section === "instructions" && selectedDetail.itemId) return;
    const defaultItemId = pickDefaultSectionItemId(
      orderedInstructions,
      (item) => isInstructionIncomplete(item)
    );
    if (defaultItemId) {
      setSelectedDetail({ section: "instructions", itemId: defaultItemId });
      return;
    }
    setSelectedDetail({ section: "instructions" });
  }, [activateSection, isInstructionIncomplete, orderedInstructions, selectedDetail, setSelectedDetail]);

  const handleSectionContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (shouldIgnoreSectionActivationClick(event.target, event.currentTarget)) return;
      handleSectionCardActivate();
    },
    [handleSectionCardActivate]
  );

  const handleSectionContainerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handleSectionCardActivate();
    },
    [handleSectionCardActivate]
  );

  return (
    <div
      ref={(el) => registerSectionRef("instructions", el)}
      id="instructions-section"
      role="button"
      tabIndex={0}
      onClick={handleSectionContainerClick}
      onKeyDown={handleSectionContainerKeyDown}
      className={cn(
        "ccp-mid-section scroll-mt-2 rounded-2xl cursor-pointer transition-colors hover:border-blue-300/70 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40",
        activeSectionKey === "instructions" && "ccp-mid-section--active"
      )}
    >
    <ConsultationSectionCard
      ref={sectionCardRef}
      title="Instructions"
      icon={<FileText className="text-muted-foreground" />}
      incompleteCount={incompleteCount}
      defaultOpen={false}
      onOpenChange={(open) => {
        if (open) {
          window.requestAnimationFrame(() => searchInputRef.current?.focus());
        }
      }}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading instructions…</span>
        </div>
      ) : (
        <div className="space-y-3">
          {locked && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              <Lock className="h-4 w-4 shrink-0" />
              Consultation finalized
            </div>
          )}

          <div className="consultation-section-search-row sticky top-0 z-[5] -mx-1 px-1 bg-card/95 dark:bg-card/95 backdrop-blur-sm pb-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                id="instructions-search-input"
                ref={searchInputRef}
                type="search"
                placeholder="Search instructions"
                value={inlineSearch}
                autoComplete="off"
                onFocus={() => {
                  activateSection("instructions");
                  sectionCardRef.current?.expand();
                }}
                onChange={(e) => {
                  activateSection("instructions", { scroll: false });
                  setInlineSearch(e.target.value);
                }}
                className="h-10 pl-9 rounded-lg bg-muted/40 border-border/60 text-foreground placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-2"
                aria-label="Search instructions"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 h-10 rounded-lg"
              onClick={() => {
                activateSection("instructions");
                sectionCardRef.current?.expand();
                setCustomDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>
          </div>

          <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
            <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Add custom instruction</DialogTitle>
                <DialogDescription>
                  Add a custom instruction for this consultation.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Type the instruction for the patient…"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="min-h-[100px] resize-y"
                aria-label="Custom instruction text"
              />
              <p className="text-xs text-muted-foreground">
                Stored in this consultation until you end the visit; then it is saved with the consultation record.
              </p>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setCustomDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCustomInstructionSubmit}
                  disabled={!customText.trim()}
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {instructionsList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {orderedInstructions.map((inst) => {
                const focused = isSelected(inst.id);
                const incomplete = isInstructionIncomplete(inst);
                return (
                  <span
                    key={inst.id}
                    data-no-section-activate="true"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ease-in-out",
                      focused
                        ? "border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200"
                        : incomplete
                          ? "border-orange-50 bg-orange-50 text-gray-800 hover:bg-orange-100"
                          : "border-border/40 bg-gray-100 text-gray-800 hover:bg-gray-200"
                    )}
                    title={incomplete ? "Input required – fill details in the right panel" : undefined}
                    onClick={(e) => {
                      if (locked) return;
                      const el = e.target as HTMLElement;
                      if (el.closest('button[aria-label^="Remove"]')) return;
                      if (el.closest("button")) return;
                      handleAddedInstructionClick(inst.id);
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddedInstructionClick(inst.id);
                      }}
                      disabled={locked}
                      className="min-w-0 cursor-pointer truncate rounded-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {inst.label}
                    </button>
                    {focused && (
                      <ConsultationEditingBadge onDarkChip className="ml-1 shrink-0" />
                    )}
                    {incomplete && (
                      <span
                        className={cn(
                          "shrink-0",
                          focused ? "text-amber-700 dark:text-amber-600" : "text-amber-700 dark:text-amber-600"
                        )}
                        aria-hidden
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {!locked && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveInstruction(inst.id);
                        }}
                        className={cn(
                          "ml-0.5 rounded-full p-0.5 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          focused ? "hover:bg-blue-200 dark:hover:bg-blue-300/40" : "hover:bg-muted"
                        )}
                        aria-label={`Remove ${inst.label}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {instructionsList.length > 0 &&
            (filteredSuggestionRows.length > 0 || suggestionsLoading || suggestionsError) && (
              <hr className="border-border my-2" />
            )}

          <div className="space-y-2" data-no-section-activate="true">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Suggested instructions
            </p>
            {suggestionsLoading && filteredSuggestionRows.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Loading suggestions…
              </div>
            )}
            {suggestionsError && !suggestionsLoading && (
              <p className="text-sm text-amber-800 dark:text-amber-200">{suggestionsError}</p>
            )}
            {!suggestionsLoading && !suggestionsError && filteredSuggestionRows.length === 0 && (
              <p className="text-sm text-muted-foreground">No instructions match your search.</p>
            )}
            {!suggestionsError && filteredSuggestionRows.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2">
                  {suggestionRowsForCapsules.map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      disabled={locked}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleSuggestionPick(row);
                      }}
                      className={cn(
                        "rounded-full border border-muted-foreground/40 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        locked
                          ? "cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground"
                          : "hover:border-muted-foreground/60 hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      {row.label}
                    </button>
                  ))}
                </div>
                {filteredSuggestionRows.length > SUGGESTIONS_CAPSULE_CAP ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() =>
                      setShowAllInstructionSuggestions((v) => !v)
                    }
                  >
                    {showAllInstructionSuggestions ? "View less" : "View more"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </ConsultationSectionCard>
    </div>
  );
}
