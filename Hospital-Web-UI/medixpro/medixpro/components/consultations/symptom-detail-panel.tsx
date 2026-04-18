"use client";

import { useEffect, useMemo } from "react";
import { MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConsultationStore } from "@/store/consultationStore";
import type { SymptomDetail } from "@/lib/consultation-types";
import type { SymptomFieldSchema } from "@/lib/consultation-schema-types";
import { cn } from "@/lib/utils";
import {
  evaluateSectionItemCompleteWithSchema,
  getSectionCompletionHints,
  normalizeItem,
} from "@/lib/consultation-completion";
import {
  clearHiddenFields,
  evaluateRules,
  evaluateVisibility,
  validateField,
  type FieldValidationResult,
} from "@/lib/consultation-template-engine";

export function SymptomDetailPanel() {
  const {
    symptoms,
    selectedSymptomId,
    updateSymptomDetail,
    setSelectedSymptomId,
    getSymptomSchemaForLabel,
    symptomsSchema,
  } = useConsultationStore();

  const symptom = symptoms.find((s) => s.id === selectedSymptomId);
  const schemaItem = symptom ? getSymptomSchemaForLabel(symptom.name) : undefined;

  const templateValues = useMemo((): Record<string, unknown> => {
    const d = symptom?.detail ?? {};
    return { ...(d as Record<string, unknown>) };
  }, [symptom?.detail]);

  useEffect(() => {
    if (!symptom || !schemaItem?.fields?.length) return;
    const cleared = clearHiddenFields(schemaItem.fields, { ...templateValues });
    const keys = new Set(schemaItem.fields.map((f) => f.key));
    const patch: Record<string, unknown> = {};
    for (const k of keys) {
      const before = templateValues[k];
      const after = cleared[k];
      if (before !== after) {
        if (after === undefined && k in templateValues) {
          patch[k] = undefined;
        } else if (after !== undefined) {
          patch[k] = after;
        }
      }
    }
    if (Object.keys(patch).length) {
      updateSymptomDetail(symptom.id, patch as Partial<SymptomDetail>);
    }
  }, [symptom, schemaItem, templateValues, symptomsSchema?.meta, updateSymptomDetail]);

  const fieldMessages = useMemo(() => {
    const map: Record<string, FieldValidationResult> = {};
    if (!schemaItem?.fields) return map;
    for (const f of schemaItem.fields) {
      if (!evaluateVisibility(f, templateValues)) continue;
      map[f.key] = validateField(
        f,
        templateValues[f.key],
        templateValues,
        symptomsSchema?.meta
      );
    }
    return map;
  }, [schemaItem, templateValues, symptomsSchema]);

  const ruleWarnings = useMemo(
    () =>
      evaluateRules(
        schemaItem?.rules as Parameters<typeof evaluateRules>[0],
        templateValues
      ),
    [schemaItem?.rules, templateValues]
  );

  if (!symptom) {
    return (
      <Card
        className={cn(
          "h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md"
        )}
      >
        <CardHeader className="py-4 pb-3">
          <h3 className="font-bold text-muted-foreground">Symptom details</h3>
        </CardHeader>
        <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select a symptom from the list to view or add details here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const detail = symptom.detail ?? {};
  const completionStatus = evaluateSectionItemCompleteWithSchema(
    "symptoms",
    normalizeItem({
      id: symptom.id,
      label: symptom.name,
      is_custom: Boolean(symptom.isCustom),
      isCustom: Boolean(symptom.isCustom),
      detail: symptom.detail ?? {},
    }),
    {
      fields: schemaItem?.fields,
      no_hard_required: Boolean(symptomsSchema?.meta?.rules?.no_hard_required),
    }
  );
  const completionHints = getSectionCompletionHints(
    "symptoms",
    normalizeItem({
      id: symptom.id,
      label: symptom.name,
      is_custom: Boolean(symptom.isCustom),
      isCustom: Boolean(symptom.isCustom),
      detail: symptom.detail ?? {},
    }),
    {
      fields: schemaItem?.fields,
      no_hard_required: Boolean(symptomsSchema?.meta?.rules?.no_hard_required),
    }
  );
  const set = (patch: Partial<SymptomDetail>) => updateSymptomDetail(symptom.id, patch);

  /** Template already renders `additional_notes`; do not duplicate with legacy free-text `note`. */
  const schemaHasAdditionalNotes = Boolean(
    schemaItem?.fields?.some((f) => f.key === "additional_notes")
  );

  return (
    <Card
      className={cn(
        "h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="font-bold">{symptom.name}</h3>
          <div className="flex flex-wrap items-center gap-2" aria-live="polite" aria-atomic="true">
            {completionStatus ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/[0.1] px-3 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-100">
                <span className="text-[10px]" aria-hidden>
                  ●
                </span>
                Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/45 bg-amber-500/12 px-3 py-1 text-xs font-medium text-amber-950 dark:text-amber-50">
                <span className="text-[10px]" aria-hidden>
                  ●
                </span>
                Incomplete
              </span>
            )}
            {symptom.isCustom && (
              <span className="rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                CUSTOM
              </span>
            )}
          </div>
          {!completionStatus && completionHints.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Fill next: {completionHints.join(" • ")}
            </p>
          )}
          {ruleWarnings.length > 0 && (
            <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc pl-4 space-y-0.5">
              {ruleWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Options">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedSymptomId(null)}>
              Close panel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-6 pb-6">
        {!schemaItem && (
          <p className="text-sm text-muted-foreground">
            No structured fields configured for this symptom. You can still add optional additional
            notes below.
          </p>
        )}

        {!schemaHasAdditionalNotes && (
          <div className="space-y-2">
            <Label>Additional notes</Label>
            <Textarea
              placeholder="Optional details..."
              value={String(
                (detail as Record<string, unknown>).additional_notes ??
                  detail.note ??
                  ""
              )}
              onChange={(e) =>
                set({
                  additional_notes: e.target.value,
                  note: undefined,
                })
              }
              className="min-h-[100px] resize-y rounded-md"
            />
          </div>
        )}

        {schemaItem?.fields.map((field) => (
          <SymptomFieldRenderer
            key={field.key}
            field={field}
            detail={detail}
            templateValues={templateValues}
            set={set}
            messages={fieldMessages[field.key]}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function SymptomFieldRenderer({
  field,
  detail,
  templateValues,
  set,
  messages,
}: {
  field: SymptomFieldSchema;
  detail: SymptomDetail;
  templateValues: Record<string, unknown>;
  set: (patch: Partial<SymptomDetail>) => void;
  messages?: FieldValidationResult;
}) {
  if (!evaluateVisibility(field as Parameters<typeof evaluateVisibility>[0], templateValues)) {
    return null;
  }

  const baseLabel = field.label ?? field.key;
  const importanceClass =
    field.importance === "high" ? "border-blue-500" : "";

  const storeKey = field.key as keyof SymptomDetail;

  const msgs = messages ?? { errors: [], warnings: [] };

  const footer = (
    <>
      {msgs.errors.map((e) => (
        <p key={e} className="text-sm text-amber-800 dark:text-amber-200">
          {e}
        </p>
      ))}
      {msgs.warnings.map((w) => (
        <p key={w} className="text-sm text-amber-600 dark:text-amber-500">
          {w}
        </p>
      ))}
    </>
  );

  if (field.type === "number") {
    return (
      <div className="space-y-2">
        <Label>{baseLabel}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={field.placeholder}
            value={String((detail as Record<string, unknown>)[storeKey as string] ?? "")}
            onChange={(e) => set({ [storeKey]: e.target.value } as Partial<SymptomDetail>)}
            className={cn("rounded-md max-w-[140px]", importanceClass)}
          />
          {field.suffix && <span className="text-sm text-muted-foreground">{field.suffix}</span>}
        </div>
        {footer}
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    const isMulti = field.is_multi;
    const currentValue = (detail as Record<string, unknown>)[storeKey as string];

    if (isMulti) {
      const currentArr: string[] = Array.isArray(currentValue) ? currentValue : [];
      return (
        <div className="space-y-2">
          <Label>{baseLabel}</Label>
          <div className="flex flex-wrap gap-2">
            {field.options.map((opt) => {
              const isOn = currentArr.includes(opt);
              return (
                <Button
                  key={opt}
                  type="button"
                  variant={isOn ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    isOn &&
                      "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700",
                    importanceClass
                  )}
                  onClick={() => {
                    const setVals = new Set(currentArr);
                    if (setVals.has(opt)) setVals.delete(opt);
                    else setVals.add(opt);
                    set({ [storeKey]: Array.from(setVals) } as Partial<SymptomDetail>);
                  }}
                >
                  {opt}
                </Button>
              );
            })}
          </div>
          {footer}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label>{baseLabel}</Label>
        <Select
          value={String((currentValue as string | number | undefined) ?? "")}
          onValueChange={(v) => set({ [storeKey]: v } as Partial<SymptomDetail>)}
        >
          <SelectTrigger className={cn("rounded-md", importanceClass)}>
            <SelectValue placeholder={field.placeholder ?? "Select"} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {footer}
      </div>
    );
  }

  if (field.type === "radio" && field.options) {
    return (
      <div className="space-y-2">
        <Label>{baseLabel}</Label>
        <RadioGroup
          value={String((detail as Record<string, unknown>)[storeKey as string] ?? "")}
          onValueChange={(v) => set({ [storeKey]: v } as Partial<SymptomDetail>)}
          className="flex flex-wrap gap-4"
        >
          {field.options.map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value={opt} />
              <span>{opt}</span>
            </label>
          ))}
        </RadioGroup>
        {footer}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <Label>{baseLabel}</Label>
        <Textarea
          placeholder={field.placeholder}
          value={String((detail as Record<string, unknown>)[storeKey as string] ?? "")}
            onChange={(e) => set({ [storeKey]: e.target.value } as Partial<SymptomDetail>)}
            className={cn("min-h-[80px] resize-y rounded-md", importanceClass)}
        />
        {footer}
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div className="space-y-2">
        <Label>{baseLabel}</Label>
        <Input
          type="date"
          placeholder={field.placeholder}
          value={String((detail as Record<string, unknown>)[storeKey as string] ?? "")}
            onChange={(e) => set({ [storeKey]: e.target.value } as Partial<SymptomDetail>)}
            className={cn("rounded-md max-w-[180px]", importanceClass)}
        />
        {footer}
      </div>
    );
  }

  if (field.type === "toggle") {
    const current = (detail as Record<string, unknown>)[storeKey as string];
    const isOn = Boolean(current);
    return (
      <div className="space-y-2">
        <Label>{baseLabel}</Label>
        <Button
          type="button"
          variant={isOn ? "default" : "outline"}
          size="sm"
          className={cn(
            isOn &&
              "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700",
            importanceClass
          )}
          onClick={() => set({ [storeKey]: !isOn } as Partial<SymptomDetail>)}
        >
          {isOn ? "Yes" : "No"}
        </Button>
        {footer}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{baseLabel}</Label>
      <Input
        placeholder={field.placeholder}
        value={String((detail as Record<string, unknown>)[storeKey as string] ?? "")}
        onChange={(e) => set({ [storeKey]: e.target.value } as Partial<SymptomDetail>)}
        className={cn("rounded-md", importanceClass)}
      />
      {footer}
    </div>
  );
}
