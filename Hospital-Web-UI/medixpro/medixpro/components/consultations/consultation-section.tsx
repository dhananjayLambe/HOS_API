"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { ConsultationSectionCard } from "@/components/consultations/consultation-section-card";
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

/** True if item is missing mandatory fields: Duration (when applicable) or Severity. */
function isItemIncomplete(
  item: ConsultationSectionItem,
  config: ConsultationSectionConfig
): boolean {
  const d = item.detail;
  const needsDuration = config.durationOptions.length > 0;
  const missingDuration = needsDuration && !d?.duration;
  const missingSeverity = !d?.severity;
  return missingDuration || missingSeverity;
}
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
}

export function ConsultationSection({
  type,
  title,
  icon,
  defaultOpen = false,
}: ConsultationSectionProps) {
  const config = getSectionConfig(type);
  const {
    getSectionItems,
    addSectionItem,
    removeSectionItem,
    setSelectedDetail,
    selectedDetail,
  } = useConsultationStore();
  const { toast } = useToast();
  const items = getSectionItems(type);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialValue, setDrawerInitialValue] = useState("");
  const [inlineSearch, setInlineSearch] = useState("");
  const inlineSearchDebounced = useDebouncedValue(inlineSearch, 300);
  const sectionHeaderRef = useRef<HTMLDivElement>(null);

  const isSelected = selectedDetail?.section === type;
  const selectedId = isSelected ? selectedDetail.itemId : null;

  const allOptions = useMemo(
    () => [
      ...config.staticOptions,
      ...items.filter((i) => i.isCustom).map((i) => ({ id: i.id, label: i.label })),
    ],
    [config.staticOptions, items]
  );

  const filteredInline = useMemo(() => {
    const q = inlineSearchDebounced.trim().toLowerCase();
    if (!q) return allOptions.slice(0, 25);
    return allOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [inlineSearchDebounced, allOptions]);

  const hasInlineResults = filteredInline.length > 0;
  const canAddInline = inlineSearchDebounced.trim().length > 0;
  const showAddInline = canAddInline && !filteredInline.some(
    (o) => o.label.toLowerCase() === inlineSearchDebounced.trim().toLowerCase()
  );

  const incompleteCount = useMemo(
    () => items.filter((i) => isItemIncomplete(i, config)).length,
    [items, config]
  );

  const handleAddFromList = useCallback(
    (item: ConsultationSectionItem) => {
      const exists = items.some(
        (i) => i.label.toLowerCase() === item.label.toLowerCase()
      );
      if (exists) {
        toast({ title: "Item already exists", variant: "destructive" });
        return;
      }
      addSectionItem(type, item);
      setSelectedDetail({ section: type, itemId: item.id });
      setDrawerOpen(false);
    },
    [type, items, addSectionItem, setSelectedDetail, toast]
  );

  const handleAddNewFromDrawer = useCallback(
    (item: Omit<ConsultationSectionItem, "id">): ConsultationSectionItem => {
      const id = generateId(type.slice(0, 3));
      const newItem: ConsultationSectionItem = { ...item, id };
      addSectionItem(type, newItem);
      return newItem;
    },
    [type, addSectionItem]
  );

  const handleSelectFromDrawer = useCallback(
    (item: ConsultationSectionItem) => {
      const exists = items.some(
        (i) => i.label.toLowerCase() === item.label.toLowerCase()
      );
      if (exists) {
        const existing = items.find(
          (i) => i.label.toLowerCase() === item.label.toLowerCase()
        );
        if (existing) {
          setSelectedDetail({ section: type, itemId: existing.id });
        }
        setDrawerOpen(false);
        return;
      }
      addSectionItem(type, item);
      setSelectedDetail({ section: type, itemId: item.id });
      setDrawerOpen(false);
    },
    [type, items, addSectionItem, setSelectedDetail]
  );

  const handleInlineSelect = (item: ConsultationSectionItem) => {
    const exists = items.some((i) => i.id === item.id || i.label === item.label);
    if (exists) {
      setSelectedDetail({ section: type, itemId: item.id });
      setInlineSearch("");
      return;
    }
    addSectionItem(type, item);
    setSelectedDetail({ section: type, itemId: item.id });
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
      setSelectedDetail({ section: type, itemId: existing.id });
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
    setDrawerInitialValue(trimmed);
    setDrawerOpen(true);
    setInlineSearch("");
  };

  const openDrawer = () => {
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
      <ConsultationSectionCard
        title={title}
        icon={icon}
        defaultOpen={defaultOpen}
        incompleteCount={incompleteCount}
      >
        <div className="space-y-3">
          {/* Row 1: Optional left chip + Search bar (same design as Symptoms in reference) + Add New */}
          <div className="flex flex-wrap items-center gap-2">
            {config.searchLeftChip && (
              <span className="inline-flex rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {config.searchLeftChip}
              </span>
            )}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder={config.searchPlaceholder}
                value={inlineSearch}
                onChange={(e) => setInlineSearch(e.target.value)}
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

          {/* Selected items: blue chips with × (click to open detail, × to remove) */}
          {items.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {items.map((item, index) => (
                <Chip
                  key={`${item.id}-${index}`}
                  label={item.label}
                  selected={selectedId === item.id}
                  isIncomplete={isItemIncomplete(item, config)}
                  onSelect={() => setSelectedDetail({ section: type, itemId: item.id })}
                  onRemove={() => removeSectionItem(type, item.id)}
                />
              ))}
            </div>
          )}

          {/* Separator line when both selected and suggested areas exist */}
          {items.length > 0 && (hasInlineResults || canAddInline || (!inlineSearchDebounced && allOptions.length > 0)) && (
            <hr className="border-border my-2" />
          )}

          {/* Suggested items: light grey chips, click to add */}
          {hasInlineResults ? (
            <div className="flex flex-wrap gap-2">
              {filteredInline
                .filter((opt) => !items.some((i) => i.id === opt.id || i.label === opt.label))
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
            <p className="text-sm text-muted-foreground">No results found. Press Enter or use Add New to add it.</p>
          ) : !inlineSearchDebounced && allOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allOptions
                .filter((opt) => !items.some((i) => i.id === opt.id || i.label === opt.label))
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
          ) : null}
        </div>
      </ConsultationSectionCard>

      <ConsultationSearchAddDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        config={config}
        existingItems={items}
        onSelect={handleSelectFromDrawer}
        onAddNew={handleAddNewFromDrawer}
        onDuplicate={() =>
          toast({ title: "Item already exists", variant: "destructive" })
        }
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
  onSelect,
  onRemove,
}: {
  label: string;
  selected: boolean;
  isIncomplete?: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        selected
          ? "bg-blue-600 text-white shadow-sm dark:bg-blue-600"
          : "border border-border bg-muted/50 text-foreground hover:bg-muted"
      )}
      title={isIncomplete ? "Duration or severity not filled" : undefined}
    >
      <button
        type="button"
        onClick={onSelect}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
      >
        {label}
      </button>
      {isIncomplete && (
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
          "ml-0.5 rounded-full p-0.5 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected ? "hover:bg-blue-700 dark:hover:bg-blue-700" : "hover:bg-muted"
        )}
        aria-label={`Remove ${label}`}
      >
        ×
      </button>
    </span>
  );
}
