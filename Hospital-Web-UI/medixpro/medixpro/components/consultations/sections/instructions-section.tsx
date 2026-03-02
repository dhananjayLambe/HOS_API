"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { FileText, Lock, Loader2, Plus, Search, AlertTriangle } from "lucide-react";
import { ConsultationSectionCard } from "@/components/consultations/consultation-section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConsultationStore } from "@/store/consultationStore";
import type { InstructionsSectionSchema, InstructionItemSchema } from "@/lib/consultation-schema-types";
import { cn } from "@/lib/utils";

const INSTRUCTION_TEMPLATE_PREFIX = "tpl:";

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

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
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

  const specialty = "physician";

  useEffect(() => {
    if (encounterId) {
      setLoading(true);
      const headers = getAuthHeaders();
      Promise.all([
        fetch(`/api/consultation/encounter/${encounterId}/instructions/templates`, { headers }),
        fetch(`/api/consultation/encounter/${encounterId}/instructions`, { headers }),
      ])
        .then(async ([tRes, listRes]) => {
          if (!tRes.ok) {
            if (tRes.status === 403) setConsultationFinalized(true);
            return;
          }
          const tData = await tRes.json();
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
          if (listRes.ok) {
            const list = await listRes.json();
            setInstructionsList(Array.isArray(list) ? list : []);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      // No encounter: use module-level cached fetch (single request per session). Skip if store already has schema.
      if (instructionsSchema?.section === "instructions" && (instructionsSchema?.items?.length ?? 0) > 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      fetchInstructionsRenderSchema(specialty)
        .then((data) => {
          if (data) {
            setInstructionsSchema({
              ...data,
              categories: data.categories ?? [],
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [encounterId, instructionsSchema, setInstructionsSchema, setInstructionsList, setConsultationFinalized]);

  const allTemplates = instructionsSchema?.items ?? [];

  const filteredTemplates = useMemo(() => {
    const q = inlineSearchDebounced.trim().toLowerCase();
    if (!q) return allTemplates;
    return allTemplates.filter((t) => t.label.toLowerCase().includes(q));
  }, [allTemplates, inlineSearchDebounced]);

  const isSelected = (templateOrInstructionId: string) => {
    if (!selectedDetail || selectedDetail.section !== "instructions") return false;
    const id = selectedDetail.itemId;
    if (!id) return false;
    if (id.startsWith(INSTRUCTION_TEMPLATE_PREFIX)) {
      return id === INSTRUCTION_TEMPLATE_PREFIX + templateOrInstructionId;
    }
    return id === templateOrInstructionId;
  };

  const isAdded = (templateId: string) =>
    instructionsList.some((i) => i.instruction_template_id === templateId);

  /** Show ⚠ only when template requires input AND that input is missing or empty. */
  const isInstructionIncomplete = (inst: { instruction_template_id: string; input_data?: Record<string, unknown> | null }) => {
    const template = getInstructionTemplateByKeyOrId(inst.instruction_template_id);
    if (!template || template.requires_input !== true) return false;
    const data = inst.input_data;
    if (data == null || typeof data !== "object") return true;
    return Object.keys(data).length === 0;
  };

  const handleTemplateClick = async (template: InstructionItemSchema) => {
    if (consultationFinalized) return;
    setSelectedSymptomId(null);
    const templateId = (template as InstructionItemSchema & { id?: string }).id ?? template.key;

    if (!template.requires_input) {
      if (isAdded(templateId)) {
        const existing = instructionsList.find((i) => i.instruction_template_id === templateId);
        if (existing) setSelectedDetail({ section: "instructions", itemId: existing.id });
        return;
      }
      if (encounterId) {
        try {
          const res = await fetch(`/api/consultation/encounter/${encounterId}/instructions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({
              instruction_template_id: templateId,
              input_data: {},
              custom_note: "",
            }),
          });
          if (res.status === 403) setConsultationFinalized(true);
          if (res.ok) {
            const created = await res.json();
            setInstructionsList([...instructionsList, created]);
            setSelectedDetail({ section: "instructions", itemId: created.id });
          }
        } catch {
          // ignore
        }
      } else {
        const tempId = `inst-local-${templateId}-${Date.now()}`;
        setInstructionsList([
          ...instructionsList,
          {
            id: tempId,
            instruction_template_id: templateId,
            label: template.label,
            input_data: {},
            custom_note: null,
            is_active: true,
          },
        ]);
        setSelectedDetail({ section: "instructions", itemId: tempId });
      }
      return;
    }

    if (isAdded(templateId)) {
      const existing = instructionsList.find((i) => i.instruction_template_id === templateId);
      if (existing) setSelectedDetail({ section: "instructions", itemId: existing.id });
      return;
    }
    setSelectedDetail({ section: "instructions", itemId: INSTRUCTION_TEMPLATE_PREFIX + templateId });
  };

  const handleAddedInstructionClick = (instructionId: string) => {
    setSelectedSymptomId(null);
    setSelectedDetail({ section: "instructions", itemId: instructionId });
  };

  const handleRemoveInstruction = async (instructionId: string) => {
    if (consultationFinalized) return;
    if (!encounterId) {
      setInstructionsList(instructionsList.filter((i) => i.id !== instructionId));
      if (selectedDetail?.section === "instructions" && selectedDetail?.itemId === instructionId) {
        setSelectedDetail(null);
      }
      return;
    }
    try {
      const res = await fetch(`/api/consultation/instructions/${instructionId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.status === 403) setConsultationFinalized(true);
      if (res.ok) {
        setInstructionsList(instructionsList.filter((i) => i.id !== instructionId));
        if (selectedDetail?.section === "instructions" && selectedDetail?.itemId === instructionId) {
          setSelectedDetail(null);
        }
      }
    } catch {
      // ignore
    }
  };

  const locked = consultationFinalized;

  return (
    <ConsultationSectionCard
      title="Instructions"
      icon={<FileText className="text-muted-foreground" />}
      defaultOpen={false}
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

          {/* Row 1: Compact search (left) + Add New (right) – same as Diagnosis */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search instructions"
                value={inlineSearch}
                onChange={(e) => setInlineSearch(e.target.value)}
                className="h-10 pl-9 rounded-lg bg-muted/40 border-border/60 text-foreground placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-2"
                aria-label="Search instructions"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 h-10 rounded-lg"
              onClick={() => searchInputRef.current?.focus()}
            >
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>

          {/* Selected items: all blue chips with × (same as Diagnosis – clear distinction from grey suggested below) */}
          {instructionsList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {instructionsList.map((inst) => {
                const focused = isSelected(inst.id);
                const incomplete = isInstructionIncomplete(inst);
                return (
                  <span
                    key={inst.id}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors bg-blue-600 text-white shadow-sm dark:bg-blue-600",
                      focused && "ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-gray-900"
                    )}
                    title={incomplete ? "Input required – fill details in the right panel" : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => handleAddedInstructionClick(inst.id)}
                      disabled={locked}
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                    >
                      {inst.label}
                    </button>
                    {incomplete && (
                      <span className="shrink-0 text-amber-200 dark:text-amber-100" aria-hidden>
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
                        className="ml-0.5 rounded-full p-0.5 hover:opacity-80 hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

          {/* Separator line between selected and suggested – always show when there are selected items (same as Diagnosis) */}
          {instructionsList.length > 0 && <hr className="border-border my-2" />}

          {/* Suggested items: light grey chips only (no blue), click to add – same as Diagnosis */}
          {(() => {
            const suggested = filteredTemplates.filter((tpl) => {
              const tplId = (tpl as InstructionItemSchema & { id?: string }).id ?? tpl.key;
              return !isAdded(tplId);
            });
            const toShow = inlineSearchDebounced.trim() ? suggested : suggested.slice(0, 20);
            if (toShow.length > 0) {
              return (
                <div className="flex flex-wrap gap-2">
                  {toShow.map((tpl) => {
                    const tplId = (tpl as InstructionItemSchema & { id?: string }).id ?? tpl.key;
                    return (
                      <button
                        key={tplId}
                        type="button"
                        onClick={() => handleTemplateClick(tpl)}
                        disabled={locked}
                        className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground hover:bg-muted/60 hover:border-muted-foreground/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {tpl.label}
                      </button>
                    );
                  })}
                </div>
              );
            }
            return inlineSearchDebounced.trim() ? (
              <p className="text-sm text-muted-foreground">No results found. Press Enter or use Add New to add it.</p>
            ) : null;
          })()}
        </div>
      )}
    </ConsultationSectionCard>
  );
}
