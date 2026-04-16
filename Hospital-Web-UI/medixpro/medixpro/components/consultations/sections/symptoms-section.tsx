"use client";

import { useState, useId, useEffect, useMemo, useRef } from "react";
import { Thermometer, Plus, Search } from "lucide-react";
import {
  ConsultationSectionCard,
  type ConsultationSectionCardHandle,
} from "@/components/consultations/consultation-section-card";
import { useConsultationSectionScroll } from "@/components/consultations/consultation-section-scroll-context";
import { ConsultationEditingBadge } from "@/components/consultations/consultation-editing-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConsultationSearchAddDrawer } from "@/components/consultations/consultation-search-add-drawer";
import { SYMPTOM_ATTRIBUTES } from "@/data/consultation-section-data";
import { useConsultationStore } from "@/store/consultationStore";
import type { SymptomsSectionSchema } from "@/lib/consultation-schema-types";
import { cn } from "@/lib/utils";
import {
  CONSULTATION_TAB_SECTION_DATA_ATTR,
  reorderItemsByActiveId,
} from "@/lib/consultation-chip-ux";
import {
  pickDefaultSectionItemId,
  shouldIgnoreSectionActivationClick,
} from "@/lib/consultation-section-activation";
import { flushConsultationAutosave } from "@/lib/consultation-autosave";
import type {
  ConsultationSectionConfig,
  ConsultationSectionItem,
} from "@/lib/consultation-types";
import { evaluateSectionItemCompleteWithSchema } from "@/lib/consultation-completion";

function symptomId() {
  return `sym-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function SymptomsSection() {
  const {
    symptoms,
    addSymptom,
    removeSymptom,
    setSelectedSymptomId,
    selectedSymptomId,
    symptomsSchema,
    setSymptomsSchema,
    getSymptomSchemaForLabel,
  } = useConsultationStore();
  const [search, setSearch] = useState("");
  const inputId = useId();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialValue, setDrawerInitialValue] = useState<string | undefined>(
    undefined
  );
  const sectionCardRef = useRef<ConsultationSectionCardHandle>(null);
  const { registerSectionRef, registerTabSectionExpander, activateSection, activeSectionKey } =
    useConsultationSectionScroll();

  useEffect(() => {
    return registerTabSectionExpander("symptoms", () => sectionCardRef.current?.expand());
  }, [registerTabSectionExpander]);

  useEffect(() => {
    if (activeSectionKey !== "symptoms") return;
    if (selectedSymptomId) return;
    const firstIncomplete = symptoms.find((s) => isSymptomIncomplete(s));
    if (firstIncomplete) {
      setSelectedSymptomId(firstIncomplete.id);
    }
  }, [activeSectionKey, selectedSymptomId, symptoms, setSelectedSymptomId]);

  // Load backend-driven schema for symptoms (Phase 1: physician only).
  useEffect(() => {
    if (symptomsSchema) return;

    const controller = new AbortController();

    async function loadSchema() {
      try {
        const res = await fetch(
          `/api/consultation/render-schema?specialty=physician&section=symptoms`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          // Fail silently for now; UI falls back to manual add only.
          return;
        }
        const data = (await res.json()) as SymptomsSectionSchema;
        if (data.section === "symptoms" && Array.isArray(data.items)) {
          setSymptomsSchema(data);
        }
      } catch {
        // Ignore network errors; do not block consultation.
      }
    }

    void loadSchema();
    return () => controller.abort();
  }, [symptomsSchema, setSymptomsSchema]);

  const selectSymptomAndScroll = (id: string) => {
    setSelectedSymptomId(id);
    sectionCardRef.current?.expand();
    activateSection("symptoms");
  };

  const add = (name: string, isCustom = false) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // If symptom already exists, just select it instead of doing nothing
    const existing = symptoms.find(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      selectSymptomAndScroll(existing.id);
      setSearch("");
      return;
    }

    const id = symptomId();
    addSymptom({ id, name: trimmed, isCustom, is_custom: isCustom, is_complete: false });
    selectSymptomAndScroll(id);
    setSearch("");
  };

  const isSymptomIncomplete = (item: ConsultationSectionItem) => {
    const schemaItem = getSymptomSchemaForLabel(item.name ?? item.label);
    const isComplete = evaluateSectionItemCompleteWithSchema("symptoms", item, {
      fields: schemaItem?.fields,
      no_hard_required: Boolean(symptomsSchema?.meta?.rules?.no_hard_required),
    });
    return !isComplete;
  };

  const incompleteCount = useMemo(
    () => symptoms.filter((s) => isSymptomIncomplete(s)).length,
    [symptoms, symptomsSchema, getSymptomSchemaForLabel]
  );

  const orderedSymptoms = useMemo(
    () => reorderItemsByActiveId(symptoms, selectedSymptomId),
    [symptoms, selectedSymptomId]
  );

  const filteredSuggestions = useMemo(() => {
    if (!symptomsSchema) return [];
    const q = search.trim().toLowerCase();
    const base = symptomsSchema.items.filter(
      (item) =>
        !symptoms.some(
          (s) => s.name.toLowerCase() === item.display_name.toLowerCase()
        )
    );
    if (!q) return base;
    return base.filter(
      (item) =>
        item.display_name.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q)
    );
  }, [symptomsSchema, symptoms, search]);

  const drawerConfig: ConsultationSectionConfig = useMemo(
    () => ({
      type: "symptoms",
      itemLabel: "Symptom",
      searchPlaceholder: "Search symptoms",
      staticOptions:
        symptomsSchema?.items.map((item) => ({
          id: item.key,
          label: item.display_name,
        })) ?? [],
      durationOptions: [],
      // For Add Symptom, Category should default to "Symptom".
      attributeOptions: ["Symptom"],
    }),
    [symptomsSchema]
  );

  const existingItems: ConsultationSectionItem[] = useMemo(
    () =>
      symptoms.map((s) => ({
        id: s.id,
        label: s.name,
        isCustom: Boolean(s.isCustom ?? s.is_custom),
      })),
    [symptoms]
  );

  const openDrawer = () => {
    activateSection("symptoms");
    sectionCardRef.current?.expand();
    const trimmed = search.trim();
    setDrawerInitialValue(trimmed || undefined);
    setDrawerOpen(true);
  };

  const handleSectionCardActivate = () => {
    activateSection("symptoms");
    sectionCardRef.current?.expand();
    if (selectedSymptomId) return;
    const defaultItemId = pickDefaultSectionItemId(
      symptoms,
      (item) => isSymptomIncomplete(item)
    );
    if (defaultItemId) {
      setSelectedSymptomId(defaultItemId);
    }
  };

  const handleSectionContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (shouldIgnoreSectionActivationClick(event.target, event.currentTarget)) {
      return;
    }
    handleSectionCardActivate();
  };

  const handleSectionContainerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleSectionCardActivate();
  };

  const handleDrawerSelect = (item: ConsultationSectionItem) => {
    add(item.label, Boolean(item.isCustom));
  };

  const handleDrawerAddNew = (
    item: Omit<ConsultationSectionItem, "id">
  ): ConsultationSectionItem => {
    const id = symptomId();
    add(item.label, true);
    return { ...item, id };
  };

  return (
    <>
    <div
      ref={(el) => registerSectionRef("symptoms", el)}
      id="symptoms-section"
      role="button"
      tabIndex={0}
      onClick={handleSectionContainerClick}
      onKeyDown={handleSectionContainerKeyDown}
      className={cn(
        "ccp-mid-section scroll-mt-2 rounded-2xl cursor-pointer transition-colors hover:border-blue-300/70 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40",
        activeSectionKey === "symptoms" && "ccp-mid-section--active"
      )}
    >
    <ConsultationSectionCard
      ref={sectionCardRef}
      title="Symptoms"
      icon={<Thermometer className="text-muted-foreground" />}
      defaultOpen
      incompleteCount={incompleteCount}
    >
      <div className="space-y-2">
        <div className="consultation-section-search-row sticky top-0 z-[5] -mx-1 px-1 bg-card/95 dark:bg-card/95 backdrop-blur-sm pb-2 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={inputId}
              type="search"
              {...{ [CONSULTATION_TAB_SECTION_DATA_ATTR]: "symptoms" }}
              placeholder="Search symptoms"
              value={search}
              onFocus={() => {
                activateSection("symptoms");
                sectionCardRef.current?.expand();
              }}
              onChange={(e) => {
                activateSection("symptoms", { scroll: false });
                setSearch(e.target.value);
              }}
              onBlur={() => void flushConsultationAutosave({ reason: "blur" })}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const trimmed = search.trim();
                if (!trimmed) return;

                // If symptom already exists → just select it
                const existing = symptoms.find(
                  (s) => s.name.toLowerCase() === trimmed.toLowerCase()
                );
                if (existing) {
                  selectSymptomAndScroll(existing.id);
                  setSearch("");
                  return;
                }

                // If exactly one suggested backend option → add/select it directly
                if (filteredSuggestions.length === 1) {
                  add(filteredSuggestions[0].display_name, false);
                  return;
                }

                // Otherwise open the Add Symptom drawer prefilled with this value
                activateSection("symptoms");
                sectionCardRef.current?.expand();
                setDrawerInitialValue(trimmed);
                setDrawerOpen(true);
              }}
              className="h-10 rounded-lg border-border/60 bg-muted/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-2"
              aria-label="Search symptoms"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 shrink-0 gap-1.5 rounded-lg"
            onClick={openDrawer}
          >
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </div>
        </div>

        {symptoms.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {orderedSymptoms.map((s) => {
              const incomplete = isSymptomIncomplete(s);
              const selected = selectedSymptomId === s.id;
              return (
                <span
                  key={s.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ease-in-out",
                    selected
                      ? "border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200"
                      : incomplete
                        ? "border-orange-50 bg-orange-50 text-gray-800 hover:bg-orange-100"
                        : "border-border/40 bg-gray-100 text-gray-800 hover:bg-gray-200"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectSymptomAndScroll(s.id)}
                    className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full min-w-0 truncate text-left"
                  >
                    {s.name}
                  </button>
                  {selected && (
                    <ConsultationEditingBadge onDarkChip className="ml-1 shrink-0" />
                  )}
                  {(s.is_custom ?? s.isCustom) && (
                    <span className="rounded-full border-0 bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                      CUSTOM
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSymptom(s.id);
                    }}
                    className={cn(
                      "ml-0.5 rounded-full p-0.5 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "hover:bg-indigo-700 dark:hover:bg-indigo-700"
                        : "hover:bg-muted"
                    )}
                    aria-label={`Remove ${s.name}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Separator when both selected symptoms and suggestions/search exist */}
        {symptoms.length > 0 && filteredSuggestions.length > 0 && (
          <hr className="my-2 border-border" />
        )}

        {/* Suggested symptoms from backend schema */}
        {symptomsSchema && filteredSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filteredSuggestions.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => add(item.display_name, false)}
                className="rounded-full border border-muted-foreground/40 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/50 hover:text-foreground"
              >
                {item.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </ConsultationSectionCard>
    </div>
    <ConsultationSearchAddDrawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      config={drawerConfig}
      existingItems={existingItems}
      onSelect={handleDrawerSelect}
      onAddNew={handleDrawerAddNew}
      onDuplicate={() => {
        const trimmed = (drawerInitialValue ?? "").trim();
        const existing = trimmed
          ? symptoms.find((s) => s.name.toLowerCase() === trimmed.toLowerCase())
          : undefined;
        if (existing) {
          selectSymptomAndScroll(existing.id);
        }
      }}
      initialValue={drawerInitialValue}
    />
  </>
  );
}
