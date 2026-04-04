"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, ClipboardList, Plus, Search } from "lucide-react";
import {
  ConsultationSectionCard,
  type ConsultationSectionCardHandle,
} from "@/components/consultations/consultation-section-card";
import { useConsultationSectionScroll } from "@/components/consultations/consultation-section-scroll-context";
import { ConsultationEditingBadge } from "@/components/consultations/consultation-editing-badge";
import { ConsultationSearchAddDrawer } from "@/components/consultations/consultation-search-add-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ConsultationSectionConfig, ConsultationSectionItem } from "@/lib/consultation-types";
import type { DiagnosisSectionSchema } from "@/lib/consultation-schema-types";
import { useConsultationStore } from "@/store/consultationStore";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { backendAxiosClient } from "@/lib/axiosClient";
import { cn } from "@/lib/utils";
import {
  CONSULTATION_TAB_SECTION_DATA_ATTR,
  reorderItemsByActiveId,
} from "@/lib/consultation-chip-ux";
import { flushConsultationAutosave } from "@/lib/consultation-autosave";

function isDiagnosisIncomplete(item: ConsultationSectionItem): boolean {
  const d = item.detail ?? {};
  const hasStandardDetail =
    !!d.notes ||
    !!d.duration ||
    !!d.severity ||
    (Array.isArray(d.attributes) && d.attributes.length > 0) ||
    (Array.isArray(d.customTags) && d.customTags.length > 0);
  const hasCustomDetail = Object.keys(d).some((key) => {
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
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "boolean") return value;
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
  return !(hasStandardDetail || hasCustomDetail);
}

export function DiagnosisSection() {
  const toast = useToastNotification();
  const inputId = useId();
  const {
    diagnosisSchema,
    setDiagnosisSchema,
    sectionItems,
    replaceSectionItems,
    selectedDetail,
    setSelectedDetail,
    encounterId,
  } = useConsultationStore();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialValue, setDrawerInitialValue] = useState<string | undefined>(
    undefined
  );
  const sectionCardRef = useRef<ConsultationSectionCardHandle>(null);
  const { registerSectionRef, registerTabSectionExpander, activateSection, activeSectionKey } =
    useConsultationSectionScroll();

  useEffect(() => {
    return registerTabSectionExpander("diagnosis", () => sectionCardRef.current?.expand());
  }, [registerTabSectionExpander]);

  const diagnosisItems = sectionItems["diagnosis"] ?? [];

  useEffect(() => {
    if (diagnosisSchema) return;

    const controller = new AbortController();

    async function loadSchema() {
      try {
        const res = await fetch(
          `/api/consultation/render-schema?specialty=physician&section=diagnosis`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as DiagnosisSectionSchema;
        if (data.section === "diagnosis" && Array.isArray(data.items)) {
          setDiagnosisSchema(data);
        }
      } catch {
        // ignore network errors; do not block consultation.
      }
    }

    void loadSchema();
    return () => controller.abort();
  }, [diagnosisSchema, setDiagnosisSchema]);

  const drawerConfig: ConsultationSectionConfig = useMemo(() => {
    return {
      type: "diagnosis",
      itemLabel: "Diagnosis",
      searchPlaceholder: "Search diagnosis",
      staticOptions:
        diagnosisSchema?.items.map((item) => ({
          id: item.key,
          label: item.display_name,
        })) ?? [],
      durationOptions: [],
      attributeOptions: [],
    };
  }, [diagnosisSchema]);

  const filteredSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = diagnosisSchema?.items ?? [];
    const available = base.filter(
      (item) =>
        !diagnosisItems.some(
          (d) =>
            (d.diagnosisKey ?? "").toLowerCase() === item.key.toLowerCase() ||
            d.label.toLowerCase() === item.display_name.toLowerCase()
        )
    );
    if (!q) return available;
    return available.filter(
      (item) =>
        item.display_name.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q)
    );
  }, [diagnosisSchema, diagnosisItems, search]);

  const selectedId =
    selectedDetail?.section === "diagnosis"
      ? selectedDetail.itemId ?? null
      : null;

  const orderedDiagnosis = useMemo(
    () => reorderItemsByActiveId(diagnosisItems, selectedId ?? null),
    [diagnosisItems, selectedId]
  );

  const selectDiagnosisAndScroll = useCallback(
    (itemId: string) => {
      setSelectedDetail({ section: "diagnosis", itemId });
      sectionCardRef.current?.expand();
      activateSection("diagnosis");
    },
    [setSelectedDetail, activateSection]
  );

  const openDrawer = useCallback(() => {
    activateSection("diagnosis");
    sectionCardRef.current?.expand();
    setDrawerInitialValue(search.trim() || undefined);
    setDrawerOpen(true);
  }, [activateSection, search]);

  const incompleteCount = useMemo(
    () => diagnosisItems.filter((item) => isDiagnosisIncomplete(item)).length,
    [diagnosisItems]
  );

  const addMasterFromSchema = useCallback(
    (key: string, label: string, icdCode?: string) => {
      const exists = (useConsultationStore.getState().sectionItems["diagnosis"] ?? []).some(
        (d) => (d.diagnosisKey ?? "").toLowerCase() === key.toLowerCase()
      );
      if (exists) {
        toast.error("Diagnosis already added");
        return;
      }
      const item: ConsultationSectionItem = {
        id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        label,
        isCustom: false,
        diagnosisKey: key,
        diagnosisIcdCode: icdCode,
      };
      replaceSectionItems("diagnosis", [
        item,
        ...(useConsultationStore.getState().sectionItems["diagnosis"] ?? []),
      ]);
      selectDiagnosisAndScroll(item.id);
      setSearch("");
    },
    [replaceSectionItems, selectDiagnosisAndScroll, toast]
  );

  const addCustomDiagnosis = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const existing = (useConsultationStore.getState().sectionItems["diagnosis"] ?? []).find(
        (d) => d.isCustom && d.label.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) {
        selectDiagnosisAndScroll(existing.id);
        return;
      }
      if (!encounterId) {
        toast.error("Encounter missing. Refresh and try again.");
        return;
      }
      const res = await backendAxiosClient.post<{
        id: string;
        name: string;
      }>(`/consultations/encounter/${encounterId}/diagnoses/custom/`, {
        name: trimmed,
      });
      const item: ConsultationSectionItem = {
        id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        label: res.data?.name ?? trimmed,
        isCustom: true,
        customDiagnosisId: res.data?.id,
      };
      replaceSectionItems("diagnosis", [
        item,
        ...(useConsultationStore.getState().sectionItems["diagnosis"] ?? []),
      ]);
      selectDiagnosisAndScroll(item.id);
      setSearch("");
    },
    [encounterId, replaceSectionItems, selectDiagnosisAndScroll, toast]
  );

  return (
    <>
    <div
      ref={(el) => registerSectionRef("diagnosis", el)}
      id="diagnosis-section"
      className={cn(
        "ccp-mid-section scroll-mt-2 rounded-2xl",
        activeSectionKey === "diagnosis" && "ccp-mid-section--active"
      )}
    >
    <ConsultationSectionCard
      ref={sectionCardRef}
      title="Diagnosis"
      icon={<ClipboardList className="text-muted-foreground" />}
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
              {...{ [CONSULTATION_TAB_SECTION_DATA_ATTR]: "diagnosis" }}
              placeholder="Search diagnosis"
              value={search}
              onFocus={() => {
                activateSection("diagnosis");
                sectionCardRef.current?.expand();
              }}
              onChange={(e) => {
                activateSection("diagnosis", { scroll: false });
                setSearch(e.target.value);
              }}
              onBlur={() => void flushConsultationAutosave({ reason: "blur" })}
              onKeyDown={async (e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const trimmed = search.trim();
                if (!trimmed) return;
                const existing = diagnosisItems.find(
                  (d) => d.label.toLowerCase() === trimmed.toLowerCase()
                );
                if (existing) {
                  selectDiagnosisAndScroll(existing.id);
                  setSearch("");
                  return;
                }
                if (filteredSuggestions.length === 1) {
                  const s = filteredSuggestions[0];
                  addMasterFromSchema(s.key, s.display_name, s.icd10_code);
                  return;
                }
                try {
                  await addCustomDiagnosis(trimmed);
                } catch {
                  toast.error("Unable to add custom diagnosis.");
                }
              }}
              className="h-10 rounded-lg border-border/60 bg-muted/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-2"
              aria-label="Search diagnosis"
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

        {diagnosisItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {orderedDiagnosis.map((item) => {
              const selected = selectedId === item.id;
              const incomplete = isDiagnosisIncomplete(item);
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
                  onClick={() => selectDiagnosisAndScroll(item.id)}
                  className="min-w-0 truncate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  {item.label}
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
                  onClick={() =>
                    replaceSectionItems(
                      "diagnosis",
                      diagnosisItems.filter((d) => d.id !== item.id)
                    )
                  }
                  aria-label={`Remove ${item.label}`}
                  className={cn(
                    "ml-0.5 rounded-full p-0.5 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "hover:bg-indigo-700 dark:hover:bg-indigo-700"
                      : "hover:bg-muted"
                  )}
                >
                  ×
                </button>
              </span>
              );
            })}
          </div>
        )}

        {diagnosisItems.length > 0 && filteredSuggestions.length > 0 && (
          <hr className="my-2 border-border" />
        )}

        {diagnosisSchema && filteredSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filteredSuggestions.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() =>
                  addMasterFromSchema(s.key, s.display_name, s.icd10_code)
                }
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
      existingItems={diagnosisItems}
      onSelect={async (picked) => {
        const fromSchema = diagnosisSchema?.items.find(
          (s) => s.key === picked.id || s.display_name === picked.label
        );
        try {
          if (fromSchema) {
            addMasterFromSchema(
              fromSchema.key,
              fromSchema.display_name,
              fromSchema.icd10_code
            );
          } else await addCustomDiagnosis(picked.label);
        } catch {
          toast.error("Unable to add diagnosis.");
        }
      }}
      onAddNew={(partial) => ({
        id: `local-${Date.now()}`,
        label: partial.label.trim(),
        isCustom: true,
      })}
      onDuplicate={() => toast.error("Diagnosis already added")}
      onClosed={() => setDrawerInitialValue(undefined)}
      initialValue={drawerInitialValue}
    />
    </>
  );
}
