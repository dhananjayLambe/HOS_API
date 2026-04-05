"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Plus, Search, AlertTriangle } from "lucide-react";
import {
  ConsultationSectionCard,
  type ConsultationSectionCardHandle,
} from "@/components/consultations/consultation-section-card";
import { useConsultationSectionScroll } from "@/components/consultations/consultation-section-scroll-context";
import { ConsultationEditingBadge } from "@/components/consultations/consultation-editing-badge";
import { ConsultationSearchAddDrawer } from "@/components/consultations/consultation-search-add-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConsultationStore } from "@/store/consultationStore";
import type {
  ConsultationSectionType,
  ConsultationSectionItem,
  ConsultationSectionConfig,
} from "@/lib/consultation-types";
import { getSectionConfig } from "@/data/consultation-section-data";
import {
  getMedicineValidationMessages,
  isMedicineItemComplete,
  withDefaultMedicineDetail,
  withMedicineDetailFromSuggestion,
} from "@/lib/medicine-prescription-utils";
import type { MedicineSuggestionDrug } from "@/lib/medicineSuggestionsApi";

/** True if item is missing mandatory fields.
 *
 * - For most sections, we require Duration (when applicable) and Severity.
 * - For Findings and Diagnosis, we only show a warning while **no detail at all** has been added.
 */
function isItemIncomplete(
  item: ConsultationSectionItem,
  config: ConsultationSectionConfig
): boolean {
  const d = item.detail ?? {};

  if (config.type === "medicines") {
    return !isMedicineItemComplete(item);
  }

  // Findings & Diagnosis: treat as incomplete only when there is no useful detail filled.
  if (config.type === "findings" || config.type === "diagnosis") {
    const hasStandardDetail =
      !!d.notes ||
      !!d.duration ||
      !!d.severity ||
      (Array.isArray(d.attributes) && d.attributes.length > 0) ||
      (Array.isArray(d.customTags) && d.customTags.length > 0);

    // Also consider any other non-empty custom fields that may come from schema.
    const hasCustomDetail =
      Object.keys(d).some((key) => {
        if (
          key === "notes" ||
          key === "duration" ||
          key === "severity" ||
          key === "attributes" ||
          key === "customTags"
        ) {
          return false;
        }
        const value = (d as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return value !== null && value !== undefined && String(value).trim() !== "";
      });

    return !(hasStandardDetail || hasCustomDetail);
  }

  // Default rule (symptoms, etc.): duration (when applicable) and severity.
  const needsDuration = config.durationOptions.length > 0;
  const missingDuration = needsDuration && !d.duration;
  const missingSeverity = !d.severity;
  return missingDuration || missingSeverity;
}
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CONSULTATION_TAB_SECTION_DATA_ATTR,
  reorderItemsByActiveId,
} from "@/lib/consultation-chip-ux";
import { flushConsultationAutosave } from "@/lib/consultation-autosave";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface ConsultationSectionProps {
  type: ConsultationSectionType;
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  /** Optional config override (used for dynamic sections like findings). */
  configOverride?: ConsultationSectionConfig;
  /** Django suggestions (flattened, deduped by drug id server-side order). */
  medicineSuggestionChips?: { id: string; label: string }[];
  medicineSuggestionById?: Record<string, MedicineSuggestionDrug>;
  medicineSuggestionsLoading?: boolean;
}

export function ConsultationSection({
  type,
  title,
  icon,
  defaultOpen = false,
  configOverride,
  medicineSuggestionChips,
  medicineSuggestionById,
  medicineSuggestionsLoading = false,
}: ConsultationSectionProps) {
  const config = configOverride ?? getSectionConfig(type);
  const {
    getSectionItems,
    addSectionItem,
    removeSectionItem,
    setSelectedDetail,
    selectedDetail,
    medicinesSearchFocusNonce,
  } = useConsultationStore();
  const { toast } = useToast();
  const items = getSectionItems(type);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialValue, setDrawerInitialValue] = useState("");
  const [inlineSearch, setInlineSearch] = useState("");
  const inlineSearchDebounced = useDebouncedValue(inlineSearch, 300);
  const sectionHeaderRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sectionCardRef = useRef<ConsultationSectionCardHandle>(null);
  const { registerSectionRef, registerTabSectionExpander, activateSection, activeSectionKey } =
    useConsultationSectionScroll();

  useEffect(() => {
    if (type !== "medicines") return;
    return registerTabSectionExpander("medicines", () => sectionCardRef.current?.expand());
  }, [type, registerTabSectionExpander]);

  useEffect(() => {
    if (type !== "medicines" || medicinesSearchFocusNonce === 0) return;
    searchInputRef.current?.focus();
    activateSection("medicines");
  }, [type, medicinesSearchFocusNonce, activateSection]);

  const isSelected = selectedDetail?.section === type;
  const selectedId = isSelected ? selectedDetail?.itemId ?? null : null;

  const selectItemAndScroll = useCallback(
    (itemId: string) => {
      setSelectedDetail({ section: type, itemId });
      sectionCardRef.current?.expand();
      activateSection(type);
    },
    [type, setSelectedDetail, activateSection]
  );

  const orderedItems = useMemo(
    () => reorderItemsByActiveId(items, selectedId ?? null),
    [items, selectedId]
  );

  const allOptions = useMemo(
    () => [
      ...config.staticOptions,
      ...items.filter((i) => i.isCustom).map((i) => ({ id: i.id, label: i.label })),
    ],
    [config.staticOptions, items]
  );

  /** Medicines: API suggestions first, then static + custom; dedupe by id only. */
  const mergedInlineOptions = useMemo(() => {
    if (type !== "medicines") return allOptions;
    const api = medicineSuggestionChips ?? [];
    const seen = new Set<string>();
    const out: { id: string; label: string }[] = [];
    for (const o of api) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      out.push(o);
    }
    for (const o of allOptions) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      out.push(o);
    }
    return out;
  }, [type, medicineSuggestionChips, allOptions]);

  const filteredInline = useMemo(() => {
    const q = inlineSearchDebounced.trim().toLowerCase();
    const base = type === "medicines" ? mergedInlineOptions : allOptions;
    if (!q) return base.slice(0, 25);
    return base.filter((o) => o.label.toLowerCase().includes(q));
  }, [inlineSearchDebounced, allOptions, mergedInlineOptions, type]);

  const hasInlineResults = filteredInline.length > 0;
  const canAddInline = inlineSearchDebounced.trim().length > 0;
  const showAddInline = canAddInline && !filteredInline.some(
    (o) => o.label.toLowerCase() === inlineSearchDebounced.trim().toLowerCase()
  );

  const resolveMedicineItemToAdd = useCallback(
    (item: ConsultationSectionItem): ConsultationSectionItem => {
      const api = medicineSuggestionById?.[item.id];
      if (api) {
        return withMedicineDetailFromSuggestion({ ...item }, api);
      }
      return withDefaultMedicineDetail(item);
    },
    [medicineSuggestionById]
  );

  const incompleteCount = useMemo(
    () => items.filter((i) => isItemIncomplete(i, config)).length,
    [items, config]
  );

  const handleAddFromList = useCallback(
    (item: ConsultationSectionItem) => {
      const exists = items.some((i) =>
        type === "medicines"
          ? i.id === item.id
          : i.label.toLowerCase() === item.label.toLowerCase()
      );
      if (exists) {
        const existing = items.find((i) =>
          type === "medicines"
            ? i.id === item.id
            : i.label.toLowerCase() === item.label.toLowerCase()
        );
        if (existing) {
          selectItemAndScroll(existing.id);
        }
        if (type !== "medicines") {
          toast({ title: "Item already exists", variant: "destructive" });
        }
        setDrawerOpen(false);
        return;
      }
      const toAdd = type === "medicines" ? resolveMedicineItemToAdd(item) : item;
      addSectionItem(type, toAdd);
      selectItemAndScroll(toAdd.id);
      setDrawerOpen(false);
    },
    [type, items, addSectionItem, selectItemAndScroll, toast, resolveMedicineItemToAdd]
  );

  const handleAddNewFromDrawer = useCallback(
    (item: Omit<ConsultationSectionItem, "id">): ConsultationSectionItem => {
      const id = generateId(type.slice(0, 3));
      const med = item.detail?.medicine;
      const detail =
        type === "medicines" && med
          ? {
              ...item.detail,
              medicine: { ...med, drug_id: id },
            }
          : item.detail;
      const newItem: ConsultationSectionItem = { ...item, id, detail };
      const toAdd = type === "medicines" ? withDefaultMedicineDetail(newItem) : newItem;
      addSectionItem(type, toAdd);
      return toAdd;
    },
    [type, addSectionItem]
  );

  const handleSelectFromDrawer = useCallback(
    (item: ConsultationSectionItem) => {
      const exists = items.some((i) =>
        type === "medicines"
          ? i.id === item.id
          : i.label.toLowerCase() === item.label.toLowerCase()
      );
      if (exists) {
        const existing = items.find((i) =>
          type === "medicines"
            ? i.id === item.id
            : i.label.toLowerCase() === item.label.toLowerCase()
        );
        if (existing) {
          selectItemAndScroll(existing.id);
        }
        setDrawerOpen(false);
        return;
      }
      const toAdd = type === "medicines" ? resolveMedicineItemToAdd(item) : item;
      addSectionItem(type, toAdd);
      selectItemAndScroll(toAdd.id);
      setDrawerOpen(false);
    },
    [type, items, addSectionItem, selectItemAndScroll, resolveMedicineItemToAdd]
  );

  const handleInlineSelect = (item: ConsultationSectionItem) => {
    const existingByIdOrLabel = items.find((i) =>
      type === "medicines"
        ? i.id === item.id
        : i.id === item.id || i.label.toLowerCase() === item.label.toLowerCase()
    );
    if (existingByIdOrLabel) {
      selectItemAndScroll(existingByIdOrLabel.id);
      setInlineSearch("");
      return;
    }
    const toAdd = type === "medicines" ? resolveMedicineItemToAdd(item) : item;
    addSectionItem(type, toAdd);
    selectItemAndScroll(toAdd.id);
    setInlineSearch("");
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = inlineSearch.trim();
    if (!trimmed) return;

    // If exists → auto-select
    const existing = items.find(
      (i) => i.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      selectItemAndScroll(existing.id);
      setInlineSearch("");
      return;
    }

    // If exactly one match in suggestions → add and select
    if (hasInlineResults && filteredInline.length === 1) {
      const opt = filteredInline[0];
      const item = items.find((i) => i.id === opt.id) ?? {
        id: opt.id,
        label: opt.label,
      };
      handleInlineSelect(item as ConsultationSectionItem);
      return;
    }

    // If not exists → open Add drawer with value pre-filled so doctor can add details
    activateSection(type);
    sectionCardRef.current?.expand();
    setDrawerInitialValue(trimmed);
    setDrawerOpen(true);
    setInlineSearch("");
  };

  const openDrawer = () => {
    activateSection(type);
    sectionCardRef.current?.expand();
    const typed = inlineSearchDebounced.trim();
    if (typed && !items.some((i) => i.label.toLowerCase() === typed.toLowerCase())) {
      setDrawerInitialValue(typed);
    } else {
      setDrawerInitialValue("");
    }
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerInitialValue("");
    sectionHeaderRef.current?.focus();
  };

  return (
    <>
      <div
        ref={(el) => registerSectionRef(type, el)}
        id={`${type}-section`}
        className={cn(
          "ccp-mid-section scroll-mt-2 rounded-2xl",
          activeSectionKey === type && "ccp-mid-section--active"
        )}
      >
      <ConsultationSectionCard
        ref={sectionCardRef}
        title={title}
        icon={icon}
        defaultOpen={defaultOpen}
        incompleteCount={incompleteCount}
      >
        <div className="space-y-3">
          {/* Row 1: Optional left chip + Search bar + Add New — sticky within section while scrolling */}
          <div className="consultation-section-search-row sticky top-0 z-[5] -mx-1 px-1 bg-card/95 dark:bg-card/95 backdrop-blur-sm pb-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            {config.searchLeftChip && (
              <span className="inline-flex rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {config.searchLeftChip}
              </span>
            )}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                type="search"
                {...(type === "medicines"
                  ? { [CONSULTATION_TAB_SECTION_DATA_ATTR]: "medicines" }
                  : {})}
                placeholder={config.searchPlaceholder}
                value={inlineSearch}
                onFocus={() => {
                  activateSection(type);
                  sectionCardRef.current?.expand();
                }}
                onChange={(e) => {
                  activateSection(type, { scroll: false });
                  setInlineSearch(e.target.value);
                }}
                onBlur={() => {
                  if (type === "medicines") void flushConsultationAutosave({ reason: "blur" });
                }}
                onKeyDown={handleInlineKeyDown}
                className="h-10 pl-9 rounded-lg bg-muted/40 border-border/60 text-foreground placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-2"
                aria-label={`Search ${title}`}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 shrink-0 h-10 rounded-lg transition-all",
                showAddInline && "ring-2 ring-blue-500 ring-offset-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/50"
              )}
              onClick={openDrawer}
              ref={sectionHeaderRef}
            >
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>
          </div>

          {/* Selected chips: active first, indigo highlight, × to remove */}
          {items.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {orderedItems.map((item) => (
                <Chip
                  key={item.id}
                  label={item.label}
                  selected={selectedId === item.id}
                  isIncomplete={isItemIncomplete(item, config)}
                  tags={
                    type === "medicines"
                      ? [
                          ...(item.isCustom ? [{ key: "custom", label: "Custom" }] : []),
                          ...(item.detail?.medicine?.is_chronic
                            ? [{ key: "chronic", label: "Chronic" }]
                            : []),
                        ]
                      : undefined
                  }
                  validationLines={
                    type === "medicines"
                      ? getMedicineValidationMessages(item).map((m) => `⚠ ${m}`)
                      : undefined
                  }
                  onSelect={() => selectItemAndScroll(item.id)}
                  onRemove={() => removeSectionItem(type, item.id)}
                />
              ))}
            </div>
          )}

          {/* Separator line when both selected and suggested areas exist */}
          {items.length > 0 &&
            (hasInlineResults ||
              canAddInline ||
              (!inlineSearchDebounced &&
                (type === "medicines" ? mergedInlineOptions.length > 0 : allOptions.length > 0)) ||
              (type === "medicines" && medicineSuggestionsLoading)) && (
            <hr className="border-border my-2" />
          )}

          {/* Suggested items: light grey chips, click to add */}
          {type === "medicines" &&
          medicineSuggestionsLoading &&
          !inlineSearchDebounced &&
          !hasInlineResults &&
          !canAddInline ? (
            <div className="flex flex-wrap gap-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-24 animate-pulse rounded-full bg-muted"
                />
              ))}
            </div>
          ) : hasInlineResults ? (
            <div className="flex flex-wrap gap-2">
              {filteredInline
                .filter((opt) =>
                  type === "medicines"
                    ? !items.some((i) => i.id === opt.id)
                    : !items.some((i) => i.id === opt.id || i.label === opt.label)
                )
                .map((opt) => {
                  const item = items.find((i) => i.id === opt.id) ?? {
                    id: opt.id,
                    label: opt.label,
                  };
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleInlineSelect(item as ConsultationSectionItem)}
                      className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground hover:bg-muted/60 hover:border-muted-foreground/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {opt.label}
                    </button>
                  );
                })}
            </div>
          ) : canAddInline ? (
            type === "medicines" ? (
              <button
                type="button"
                onClick={() => {
                  activateSection(type);
                  sectionCardRef.current?.expand();
                  const t = inlineSearch.trim() || inlineSearchDebounced.trim();
                  setDrawerInitialValue(t);
                  setDrawerOpen(true);
                  setInlineSearch("");
                }}
                className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Create &quot;{inlineSearch.trim() || inlineSearchDebounced.trim()}&quot;
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                No results found. Press Enter or use Add New to add it.
              </p>
            )
          ) : !inlineSearchDebounced && mergedInlineOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mergedInlineOptions
                .filter((opt) =>
                  type === "medicines"
                    ? !items.some((i) => i.id === opt.id)
                    : !items.some((i) => i.id === opt.id || i.label === opt.label)
                )
                .slice(0, 20)
                .map((opt) => {
                    const item = { id: opt.id, label: opt.label };
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleInlineSelect(item as ConsultationSectionItem)}
                        className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground hover:bg-muted/60 hover:border-muted-foreground/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {opt.label}
                      </button>
                    );
                })}
            </div>
          ) : type === "medicines" &&
            !inlineSearchDebounced &&
            !hasInlineResults &&
            !canAddInline &&
            mergedInlineOptions.length === 0 &&
            !medicineSuggestionsLoading ? (
            <p className="text-sm text-muted-foreground">Start typing medicine</p>
          ) : null}
        </div>
      </ConsultationSectionCard>
      </div>

      <ConsultationSearchAddDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        config={config}
        existingItems={items}
        onSelect={handleSelectFromDrawer}
        onAddNew={handleAddNewFromDrawer}
        selectExistingOnDuplicate={type === "medicines"}
        onDuplicate={() => {
          if (type === "medicines") return;
          toast({ title: "Item already exists", variant: "destructive" });
        }}
        onClosed={closeDrawer}
        initialValue={drawerInitialValue || undefined}
      />
    </>
  );
}

function Chip({
  label,
  selected,
  isIncomplete,
  tags,
  validationLines,
  onSelect,
  onRemove,
}: {
  label: string;
  selected: boolean;
  isIncomplete?: boolean;
  /** Small labels under the chip (e.g. Custom drug, Chronic for medicines). */
  tags?: { key: string; label: string }[];
  /** Inline validation (e.g. medicines); no blocking dialogs. */
  validationLines?: string[];
  onSelect: () => void;
  onRemove: () => void;
}) {
  const titleHint =
    validationLines && validationLines.length > 0
      ? validationLines.join("\n")
      : isIncomplete
        ? "Duration or severity not filled"
        : undefined;

  return (
    <span className="inline-flex max-w-full flex-col gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out",
          selected
            ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-600 animate-consultation-chip-pop font-medium"
            : "border border-border bg-muted/50 text-foreground hover:bg-muted hover:border-muted-foreground/40"
        )}
        title={titleHint}
      >
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 truncate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          {label}
        </button>
        {selected && (
          <ConsultationEditingBadge onDarkChip className="ml-1 shrink-0" />
        )}
        {isIncomplete && !(validationLines && validationLines.length > 0) && (
          <span
            className={cn(
              "shrink-0",
              selected ? "text-amber-200 dark:text-amber-100" : "text-amber-700 dark:text-amber-600"
            )}
            aria-hidden
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </span>
        )}
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
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      </span>
      {tags && tags.length > 0 && (
        <span className="flex flex-wrap gap-1 pl-1">
          {tags.map((t) => (
            <span
              key={t.key}
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                t.key === "custom"
                  ? "border-0 bg-[#FEF3C7] font-medium normal-case tracking-normal text-[#92400E] dark:bg-[#FEF3C7]/90 dark:text-[#92400E]"
                  : "border border-violet-500/35 bg-violet-500/10 text-violet-800 dark:text-violet-200"
              )}
            >
              {t.label}
            </span>
          ))}
        </span>
      )}
      {validationLines && validationLines.length > 0 && (
        <span className="pl-1 text-[11px] leading-snug text-amber-700 dark:text-amber-500 max-w-[220px]">
          {validationLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
