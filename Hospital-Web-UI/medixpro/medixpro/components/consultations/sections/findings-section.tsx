"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Stethoscope, Search, Plus, AlertTriangle } from "lucide-react";
import {
  ConsultationSectionCard,
  type ConsultationSectionCardHandle,
} from "@/components/consultations/consultation-section-card";
import { useConsultationSectionScroll } from "@/components/consultations/consultation-section-scroll-context";
import { ConsultationEditingBadge } from "@/components/consultations/consultation-editing-badge";
import { ConsultationSearchAddDrawer } from "@/components/consultations/consultation-search-add-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ConsultationSectionConfig,
  ConsultationSectionItem,
  DraftConsultationFinding,
} from "@/lib/consultation-types";
import type { FindingsSectionSchema } from "@/lib/consultation-schema-types";
import { useConsultationStore } from "@/store/consultationStore";
import { useToastNotification } from "@/hooks/use-toast-notification";
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

function isDraftFindingIncomplete(
  d: DraftConsultationFinding,
  schemaFieldsEmpty: boolean
): boolean {
  const note = (d.note ?? "").trim();
  const hasSeverity = !!d.severity;
  const ext = d.extension_data ?? {};
  const hasExt = Object.keys(ext).some((k) => {
    const v = ext[k];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "boolean") return v;
    return v !== null && v !== undefined && String(v).trim() !== "";
  });
  if (schemaFieldsEmpty) {
    return !(note || hasSeverity || hasExt);
  }
  return !(note || hasSeverity || hasExt);
}

export function FindingsSection() {
  const toast = useToastNotification();
  const inputId = useId();
  const {
    findingsSchema,
    setFindingsSchema,
    draftFindings,
    addDraftFindingMaster,
    addDraftFindingCustom,
    markDraftFindingDeleted,
    replaceSectionItems,
    setSelectedDetail,
    selectedDetail,
  } = useConsultationStore();

  const visible = useMemo(
    () => draftFindings.filter((d) => !d.is_deleted),
    [draftFindings]
  );

  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialValue, setDrawerInitialValue] = useState<string | undefined>(undefined);
  const sectionCardRef = useRef<ConsultationSectionCardHandle>(null);
  const { registerSectionRef, registerTabSectionExpander, activateSection, activeSectionKey } =
    useConsultationSectionScroll();

  useEffect(() => {
    return registerTabSectionExpander("findings", () => sectionCardRef.current?.expand());
  }, [registerTabSectionExpander]);

  const searchDebounced = useDebouncedValue(search, 300);

  useEffect(() => {
    if (findingsSchema) return;
    const controller = new AbortController();
    async function loadSchema() {
      try {
        const res = await fetch(
          `/api/consultation/render-schema?specialty=physician&section=findings`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as FindingsSectionSchema;
        if (data.section === "findings" && Array.isArray(data.items)) {
          setFindingsSchema(data);
        }
      } catch {
        // ignore
      }
    }
    void loadSchema();
    return () => controller.abort();
  }, [findingsSchema, setFindingsSchema]);

  const drawerConfig: ConsultationSectionConfig = useMemo(
    () => ({
      type: "findings",
      itemLabel: "Finding",
      searchPlaceholder: "Search findings",
      staticOptions:
        findingsSchema?.items.map((item) => ({
          id: item.key,
          label: item.display_name,
        })) ?? [],
      durationOptions: [
        "Few hours",
        "1 Day",
        "2 Days",
        "3 Days",
        "1 Week",
        "2 Weeks",
        "1 Month",
        "2 Months",
      ],
      attributeOptions: ["Left", "Right", "Bilateral", "Localized", "Generalized"],
    }),
    [findingsSchema]
  );

  const filteredSuggestions = useMemo(() => {
    if (!findingsSchema) return [];
    const q = searchDebounced.trim().toLowerCase();
    const base = findingsSchema.items.filter(
      (item) =>
        !visible.some(
          (d) =>
            (!d.is_custom && d.finding_code === item.key) ||
            d.display_label.toLowerCase() === item.display_name.toLowerCase()
        )
    );
    if (!q) return base;
    return base.filter(
      (item) =>
        item.display_name.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q)
    );
  }, [findingsSchema, visible, searchDebounced]);

  const existingItems: ConsultationSectionItem[] = useMemo(
    () =>
      visible.map((d) => ({
        id: d.id,
        label: d.display_label,
        isCustom: d.is_custom,
        findingKey: d.finding_code ?? undefined,
      })),
    [visible]
  );

  // Keep sectionItems.findings in sync for debug visibility and legacy readers.
  useEffect(() => {
    const mirror: ConsultationSectionItem[] = visible.map((d) => ({
      id: d.id,
      label: d.display_label,
      isCustom: d.is_custom,
      findingKey: d.finding_code ?? undefined,
      detail: {
        notes: d.note ?? "",
        severity: d.severity ?? undefined,
        ...(d.extension_data ?? {}),
      },
    }));
    replaceSectionItems("findings", mirror);
  }, [visible, replaceSectionItems]);

  const selectedId =
    selectedDetail?.section === "findings"
      ? selectedDetail.itemId ?? null
      : null;

  const orderedVisible = useMemo(
    () => reorderItemsByActiveId(visible, selectedId),
    [visible, selectedId]
  );

  const selectFindingAndScroll = useCallback(
    (itemId: string) => {
      setSelectedDetail({ section: "findings", itemId });
      sectionCardRef.current?.expand();
      activateSection("findings");
    },
    [setSelectedDetail, activateSection]
  );

  const addMasterFromSchema = useCallback(
    (key: string, displayName: string) => {
      const active = useConsultationStore
        .getState()
        .draftFindings.filter((d) => !d.is_deleted);
      if (
        active.some(
          (d) => !d.is_custom && (d.finding_code ?? "").toLowerCase() === key.toLowerCase()
        )
      ) {
        toast.error("Finding already added");
        return;
      }
      addDraftFindingMaster(key, displayName);
      const created = useConsultationStore
        .getState()
        .draftFindings.filter((d) => !d.is_deleted)
        .find(
          (d) =>
            !d.is_custom &&
            (d.finding_code ?? "").toLowerCase() === key.toLowerCase()
        );
      if (created) selectFindingAndScroll(created.id);
      setSearch("");
      toast.success(`${displayName} added`);
    },
    [addDraftFindingMaster, selectFindingAndScroll, toast]
  );

  const addCustomByName = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const active = useConsultationStore
        .getState()
        .draftFindings.filter((d) => !d.is_deleted);
      const existing = active.find(
        (d) =>
          d.is_custom &&
          (d.custom_name ?? "").trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) {
        selectFindingAndScroll(existing.id);
        setSearch("");
        return;
      }
      addDraftFindingCustom(trimmed);
      const created = useConsultationStore
        .getState()
        .draftFindings.filter((d) => !d.is_deleted)
        .find(
          (d) =>
            d.is_custom &&
            (d.custom_name ?? "").trim().toLowerCase() === trimmed.toLowerCase()
        );
      if (created) selectFindingAndScroll(created.id);
      setSearch("");
      toast.success("Finding added");
    },
    [addDraftFindingCustom, selectFindingAndScroll, toast]
  );

  const removeFinding = useCallback(
    (id: string) => {
      markDraftFindingDeleted(id);
    },
    [markDraftFindingDeleted]
  );

  const incompleteCount = useMemo(() => {
    return visible.filter((d) => {
      const schemaItem = findingsSchema?.items.find(
        (s) => s.key === d.finding_code || s.display_name === d.display_label
      );
      const schemaFieldsEmpty = !schemaItem?.fields?.length;
      return isDraftFindingIncomplete(d, schemaFieldsEmpty);
    }).length;
  }, [visible, findingsSchema]);

  const openDrawer = () => {
    activateSection("findings");
    sectionCardRef.current?.expand();
    const trimmed = searchDebounced.trim();
    setDrawerInitialValue(trimmed || undefined);
    setDrawerOpen(true);
  };

  return (
    <>
    <div
      ref={(el) => registerSectionRef("findings", el)}
      id="findings-section"
      className={cn(
        "ccp-mid-section scroll-mt-2 rounded-2xl",
        activeSectionKey === "findings" && "ccp-mid-section--active"
      )}
    >
    <ConsultationSectionCard
      ref={sectionCardRef}
      title="Findings"
      icon={<Stethoscope className="text-muted-foreground" />}
      defaultOpen={false}
      incompleteCount={incompleteCount}
    >
      <div className="space-y-3">
        <div className="consultation-section-search-row sticky top-0 z-[5] -mx-1 px-1 bg-card/95 dark:bg-card/95 backdrop-blur-sm pb-2 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={inputId}
              type="search"
              {...{ [CONSULTATION_TAB_SECTION_DATA_ATTR]: "findings" }}
              placeholder={drawerConfig.searchPlaceholder}
              value={search}
              onFocus={() => {
                activateSection("findings");
                sectionCardRef.current?.expand();
              }}
              onChange={(e) => {
                activateSection("findings", { scroll: false });
                setSearch(e.target.value);
              }}
              onBlur={() => void flushConsultationAutosave({ reason: "blur" })}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const trimmed = search.trim();
                if (!trimmed) return;
                const existing = visible.find(
                  (d) => d.display_label.toLowerCase() === trimmed.toLowerCase()
                );
                if (existing) {
                  selectFindingAndScroll(existing.id);
                  setSearch("");
                  return;
                }
                if (filteredSuggestions.length === 1) {
                  const s = filteredSuggestions[0];
                  addMasterFromSchema(s.key, s.display_name);
                  return;
                }
                activateSection("findings");
                sectionCardRef.current?.expand();
                setDrawerInitialValue(trimmed);
                setDrawerOpen(true);
                setSearch("");
              }}
              className="h-10 rounded-lg border-border/60 bg-muted/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-2"
              aria-label="Search findings"
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

        {visible.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {orderedVisible.map((item) => {
              const schemaItem = findingsSchema?.items.find(
                (s) => s.key === item.finding_code || s.display_name === item.display_label
              );
              const schemaFieldsEmpty = !schemaItem?.fields?.length;
              const incomplete = isDraftFindingIncomplete(item, schemaFieldsEmpty);
              const selected = selectedId === item.id;
              return (
                <span
                  key={item.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out",
                    selected
                      ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-600 animate-consultation-chip-pop font-medium"
                      : "border border-border bg-muted/50 text-foreground hover:bg-muted hover:border-muted-foreground/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectFindingAndScroll(item.id)}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded min-w-0 truncate text-left"
                  >
                    {item.display_label}
                  </button>
                  {selected && (
                    <ConsultationEditingBadge onDarkChip className="ml-1 shrink-0" />
                  )}
                  {incomplete && (
                    <span
                      className={cn(
                        "shrink-0",
                        selected
                          ? "text-amber-200 dark:text-amber-100"
                          : "text-amber-700 dark:text-amber-600"
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
                      removeFinding(item.id);
                    }}
                    className={cn(
                      "ml-0.5 rounded-full p-0.5 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "hover:bg-indigo-700 dark:hover:bg-indigo-700"
                        : "hover:bg-muted"
                    )}
                    aria-label={`Remove ${item.display_label}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {visible.length > 0 && filteredSuggestions.length > 0 && (
          <hr className="my-2 border-border" />
        )}

        {findingsSchema && filteredSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filteredSuggestions.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => addMasterFromSchema(s.key, s.display_name)}
                className="rounded-full border border-muted-foreground/40 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/50 hover:text-foreground"
              >
                {s.display_name}
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
      onSelect={(picked) => {
        if (picked.id.startsWith("local-")) {
          addCustomByName(picked.label);
          return;
        }
        const fromSchema = findingsSchema?.items.find(
          (s) => s.key === picked.id || s.display_name === picked.label
        );
        if (fromSchema) {
          addMasterFromSchema(fromSchema.key, fromSchema.display_name);
        } else {
          addCustomByName(picked.label);
        }
      }}
      onAddNew={(partial) => ({
        id: `local-${Date.now()}`,
        label: partial.label.trim(),
        isCustom: true,
      })}
      onDuplicate={() => {
        const trimmed = (drawerInitialValue ?? "").trim();
        if (trimmed) {
          const existing = visible.find(
            (d) => d.display_label.toLowerCase() === trimmed.toLowerCase()
          );
          if (existing) {
            selectFindingAndScroll(existing.id);
            return;
          }
        }
        toast.error("Finding already added");
      }}
      onClosed={() => setDrawerInitialValue(undefined)}
      initialValue={drawerInitialValue}
    />
    </>
  );
}
