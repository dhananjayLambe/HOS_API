"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Lock, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
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
import { useConsultationStore } from "@/store/consultationStore";
import type {
  InstructionFieldSchema,
  InstructionItemSchema,
} from "@/lib/consultation-schema-types";
import { cn, isUuidLike } from "@/lib/utils";
import { useToastNotification } from "@/hooks/use-toast-notification";

const INSTRUCTION_TEMPLATE_PREFIX = "tpl:";
const TOAST_DEDUPE_MS = 2000;

export function InstructionDetailPanel() {
  const toast = useToastNotification();
  const toastDedupeRef = useRef<Map<string, number>>(new Map());
  const notify = useCallback(
    (key: string, emit: () => void) => {
      const now = Date.now();
      const last = toastDedupeRef.current.get(key) ?? 0;
      if (now - last < TOAST_DEDUPE_MS) return;
      toastDedupeRef.current.set(key, now);
      emit();
    },
    [toast]
  );

  const panelFocusRef = useRef<HTMLDivElement>(null);

  const {
    selectedDetail,
    setSelectedDetail,
    instructionsList,
    consultationFinalized,
    setInstructionsList,
    getInstructionTemplateByKeyOrId,
  } = useConsultationStore();

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [customNote, setCustomNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isInstructionSection = selectedDetail?.section === "instructions";
  const itemId = selectedDetail?.itemId;

  const isTemplateKey = itemId?.startsWith(INSTRUCTION_TEMPLATE_PREFIX);
  const templateId = isTemplateKey ? itemId?.slice(INSTRUCTION_TEMPLATE_PREFIX.length) : undefined;
  const existingInstruction = !isTemplateKey && itemId
    ? instructionsList.find((i) => i.id === itemId)
    : undefined;

  const template: InstructionItemSchema | undefined = templateId
    ? getInstructionTemplateByKeyOrId(templateId)
    : existingInstruction
      ? getInstructionTemplateByKeyOrId(existingInstruction.instruction_template_id) ?? {
          key: existingInstruction.instruction_template_id,
          label: existingInstruction.label,
          category_code: "",
          requires_input: true,
          input_schema: { fields: [] },
        }
      : undefined;

  const fields = template?.input_schema?.fields ?? [];
  const isNew = Boolean(isTemplateKey && templateId);

  useEffect(() => {
    if (existingInstruction) {
      setFormData((existingInstruction.input_data as Record<string, unknown>) ?? {});
      setCustomNote(existingInstruction.custom_note ?? "");
    } else if (isNew) {
      setFormData({});
      setCustomNote("");
    }
  }, [existingInstruction?.id, isNew, templateId]);

  useEffect(() => {
    if (!itemId) return;
    const t = window.requestAnimationFrame(() => {
      panelFocusRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(t);
  }, [itemId]);

  const handleDoneEditing = useCallback(() => {
    setSelectedDetail(null);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLInputElement>("#instructions-search-input")?.focus();
    });
  }, [setSelectedDetail]);

  useEffect(() => {
    if (!itemId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleDoneEditing();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [itemId, handleDoneEditing]);

  const isComplete = useMemo(() => {
    if (!template) return true;
    if (!template.requires_input) return true;
    return Object.keys(formData).length > 0;
  }, [template, formData]);

  const completionHint = useMemo(() => {
    if (isComplete || !template?.requires_input) return "";
    return "Add required details below";
  }, [isComplete, template?.requires_input]);

  const handleSave = () => {
    if (consultationFinalized) return;
    setError(null);

    if (existingInstruction) {
      setInstructionsList(
        instructionsList.map((i) =>
          i.id === existingInstruction.id
            ? {
                ...i,
                input_data: { ...formData },
                custom_note: customNote.trim() ? customNote : null,
              }
            : i
        )
      );
      notify(`inst-patch:${existingInstruction.id}`, () => toast.success("Instruction updated"));
      return;
    }

    if (isNew && templateId) {
      const fromTemplate =
        template?.id && isUuidLike(String(template.id)) ? String(template.id) : null;
      const fromSelection = isUuidLike(templateId) ? templateId : null;
      const instructionTemplateUuid = fromTemplate ?? fromSelection;
      if (!instructionTemplateUuid) {
        setError(
          template
            ? "Invalid instruction template id. Reload the page and try again."
            : "Instruction template not found. Select the instruction again from the list."
        );
        return;
      }
      const newId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `inst-draft-${crypto.randomUUID()}`
          : `inst-local-${instructionTemplateUuid}-${Date.now()}`;
      const row = {
        id: newId,
        instruction_template_id: instructionTemplateUuid,
        label: template?.label ?? "Instruction",
        input_data: { ...formData },
        custom_note: customNote.trim() ? customNote : null,
        is_active: true as const,
      };
      setInstructionsList([row, ...instructionsList]);
      setSelectedDetail({ section: "instructions", itemId: newId });
      notify(`inst-post:${newId}`, () => toast.success("Instruction added"));
    }
  };

  const handleDelete = () => {
    if (consultationFinalized || !existingInstruction) return;
    setError(null);
    const removedLabel = existingInstruction.label;
    setInstructionsList(instructionsList.filter((i) => i.id !== existingInstruction.id));
    setSelectedDetail(null);
    notify(`inst-del:${existingInstruction.id}`, () =>
      toast.success(`${removedLabel} removed`)
    );
  };

  if (!isInstructionSection || !itemId) {
    return (
      <Card className="h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="py-4 pb-3">
          <h3 className="font-bold text-muted-foreground">Instruction details</h3>
        </CardHeader>
        <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select an instruction from the list to view or edit details here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const label = existingInstruction?.label ?? template?.label ?? "Instruction";
  const locked = consultationFinalized;
  const canSave = !locked && (isNew || existingInstruction);

  const inner = (
    <>
      <div
        ref={panelFocusRef}
        tabIndex={-1}
        className="sticky top-0 z-[1] border-b border-border/60 bg-card px-6 pb-3 pt-4 outline-none"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 font-bold leading-tight">{label}</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 rounded-lg"
            onClick={handleDoneEditing}
          >
            Done editing
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2" aria-live="polite" aria-atomic="true">
          {locked ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Consultation finalized
            </span>
          ) : template?.requires_input ? (
            isComplete ? (
              <div
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/[0.1] px-3 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-100"
                role="status"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span>Complete</span>
              </div>
            ) : (
              <div
                className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-amber-500/45 bg-amber-500/12 px-3 py-1 text-xs font-medium text-amber-950 dark:text-amber-50"
                role="status"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <span className="min-w-0 truncate">{completionHint || "Incomplete"}</span>
              </div>
            )
          ) : (
            <div
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/[0.1] px-3 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-100"
              role="status"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span>Ready to add</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6 px-6 pb-6 pt-4">
        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0 dark:text-amber-400" />
            <p className="text-xs text-amber-900 dark:text-amber-100">{error}</p>
          </div>
        )}

        {fields.length > 0 && (
          <div className="space-y-4">
            {fields.map((field) => (
              <InstructionFieldRenderer
                key={field.key}
                field={field}
                value={formData[field.key]}
                onChange={(v) => setFormData((prev) => ({ ...prev, [field.key]: v }))}
                disabled={locked}
              />
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label>Note (optional)</Label>
          <Textarea
            placeholder="Additional note..."
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="min-h-[80px] resize-y rounded-md"
            disabled={locked}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {canSave && (
            <Button type="button" variant="default" onClick={handleSave} className="gap-2 rounded-lg">
              {existingInstruction ? "Update" : "Add instruction"}
            </Button>
          )}
          {existingInstruction && !locked && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="rounded-lg"
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <Card className="h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm">
      {inner}
    </Card>
  );
}

function InstructionFieldRenderer({
  field,
  value,
  onChange,
  disabled,
}: {
  field: InstructionFieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const label = field.label ?? field.key;
  const min = field.min;
  const max = field.max;

  if (field.type === "number") {
    const num = typeof value === "number" ? value : value != null && value !== "" ? Number(value) : "";
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={field.placeholder}
            min={min}
            max={max}
            value={num}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === "" ? "" : Number(v));
            }}
            className="rounded-md max-w-[140px]"
            disabled={disabled}
          />
          {field.suffix && (
            <span className="text-sm text-muted-foreground">{field.suffix}</span>
          )}
        </div>
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    const str = value != null ? String(value) : "";
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Select
          value={str}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger className="rounded-md">
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
      </div>
    );
  }

  if (field.type === "radio" && field.options) {
    const str = value != null ? String(value) : "";
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <RadioGroup
          value={str}
          onValueChange={(v) => onChange(v)}
          className="flex flex-wrap gap-4"
          disabled={disabled}
        >
          {field.options.map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value={opt} />
              <span>{opt}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="text"
        placeholder={field.placeholder}
        value={value != null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md"
        disabled={disabled}
      />
    </div>
  );
}
