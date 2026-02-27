"use client";

import { useState, useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
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
  EncounterInstructionRow,
} from "@/lib/consultation-schema-types";
import { cn } from "@/lib/utils";

const INSTRUCTION_TEMPLATE_PREFIX = "tpl:";

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function InstructionDetailPanel() {
  const {
    selectedDetail,
    setSelectedDetail,
    instructionsSchema,
    instructionsList,
    encounterId,
    consultationFinalized,
    setInstructionsList,
    getInstructionTemplateByKeyOrId,
  } = useConsultationStore();

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [customNote, setCustomNote] = useState("");
  const [saving, setSaving] = useState(false);
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
      ? getInstructionTemplateByKeyOrId(existingInstruction.instruction_template_id)
        ?? {
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
  }, [existingInstruction?.id, isNew]);

  const handleSave = async () => {
    if (consultationFinalized || !encounterId) return;
    setError(null);
    setSaving(true);
    try {
      const base = "/api/consultation";
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      };

      if (existingInstruction) {
        const res = await fetch(`${base}/instructions/${existingInstruction.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ input_data: formData, custom_note: customNote }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          if (res.status === 403) useConsultationStore.getState().setConsultationFinalized(true);
          throw new Error(d.error || d.detail || "Update failed");
        }
        const updated = await res.json();
        setInstructionsList(
          instructionsList.map((i) => (i.id === updated.id ? updated : i))
        );
        setSelectedDetail({ section: "instructions", itemId: updated.id });
      } else if (isNew && templateId && template) {
        const templateUuid = (template as InstructionItemSchema & { id?: string }).id ?? templateId;
        const res = await fetch(`${base}/encounter/${encounterId}/instructions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            instruction_template_id: templateUuid,
            input_data: formData,
            custom_note: customNote,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          if (res.status === 403) useConsultationStore.getState().setConsultationFinalized(true);
          throw new Error(d.error || d.detail || "Add failed");
        }
        const created = await res.json();
        setInstructionsList([...instructionsList, created]);
        setSelectedDetail({ section: "instructions", itemId: created.id });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (consultationFinalized || !existingInstruction) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/consultation/instructions/${existingInstruction.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 403) useConsultationStore.getState().setConsultationFinalized(true);
        throw new Error("Delete failed");
      }
      setInstructionsList(instructionsList.filter((i) => i.id !== existingInstruction.id));
      setSelectedDetail(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
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
  const canSave = !locked && encounterId && (isNew || existingInstruction);

  return (
    <Card className="h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-3">
        <h3 className="font-bold">{label}</h3>
        {locked && (
          <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
            <Lock className="h-4 w-4" />
            Consultation finalized
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-6 pb-6">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
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

        {isNew && !encounterId && (
          <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3">
            Start a consultation with an encounter to save this instruction.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {canSave && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {existingInstruction ? "Update" : "Add instruction"}
            </Button>
          )}
          {existingInstruction && !locked && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              Remove
            </Button>
          )}
        </div>
      </CardContent>
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
