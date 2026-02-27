"use client";

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

export function SymptomDetailPanel() {
  const {
    symptoms,
    selectedSymptomId,
    updateSymptomDetail,
    setSelectedSymptomId,
    getSymptomSchemaForLabel,
  } = useConsultationStore();

  const symptom = symptoms.find((s) => s.id === selectedSymptomId);
  const schemaItem = symptom ? getSymptomSchemaForLabel(symptom.name) : undefined;

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
  const set = (patch: Partial<SymptomDetail>) => updateSymptomDetail(symptom.id, patch);

  return (
    <Card
      className={cn(
        "h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-3">
        <h3 className="font-bold">{symptom.name}</h3>
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
            No structured fields configured for this symptom. You can still add free-text notes.
          </p>
        )}

        {/* Always show a generic Notes field, independent of schema */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            placeholder="Enter note here..."
            value={detail.note ?? ""}
            onChange={(e) => set({ note: e.target.value })}
            className="min-h-[100px] resize-y rounded-md"
          />
        </div>

        {schemaItem?.fields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            detail={detail}
            set={set}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function FieldRenderer({
  field,
  detail,
  set,
}: {
  field: SymptomFieldSchema;
  detail: SymptomDetail;
  set: (patch: Partial<SymptomDetail>) => void;
}) {
  // Dependency handling: hide field if dependency not satisfied
  if (field.dependency) {
    const current = (detail as Record<string, unknown>)[field.dependency.field];
    const shouldShow =
      field.dependency.operator === "equals"
        ? current === field.dependency.value
        : true;
    if (!shouldShow) return null;
  }

  const baseLabel = field.label ?? field.key;
  const importanceClass =
    field.importance === "high"
      ? "border-blue-500"
      : "";

  // Map storage key directly by field.key
  const storeKey = field.key as keyof SymptomDetail;

  if (field.type === "number") {
    return (
      <div className="space-y-2">
        <Label>{baseLabel}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={field.placeholder}
            value={(detail as any)[storeKey] ?? ""}
            onChange={(e) => set({ [storeKey]: e.target.value } as Partial<SymptomDetail>)}
            className={cn("rounded-md max-w-[140px]", importanceClass)}
          />
          {field.suffix && <span className="text-sm text-muted-foreground">{field.suffix}</span>}
        </div>
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    const isMulti = field.is_multi;
    const currentValue = (detail as any)[storeKey];

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
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label>{baseLabel}</Label>
        <Select
          value={currentValue ?? ""}
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
      </div>
    );
  }

  if (field.type === "radio" && field.options) {
    return (
      <div className="space-y-2">
        <Label>{baseLabel}</Label>
        <RadioGroup
          value={(detail as any)[storeKey] ?? ""}
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
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <Label>{baseLabel}</Label>
        <Textarea
          placeholder={field.placeholder}
          value={(detail as any)[storeKey] ?? ""}
          onChange={(e) => set({ [storeKey]: e.target.value } as Partial<SymptomDetail>)}
          className={cn("min-h-[80px] resize-y rounded-md", importanceClass)}
        />
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
          value={(detail as any)[storeKey] ?? ""}
          onChange={(e) => set({ [storeKey]: e.target.value } as Partial<SymptomDetail>)}
          className={cn("rounded-md max-w-[180px]", importanceClass)}
        />
      </div>
    );
  }

  if (field.type === "toggle") {
    const current = (detail as any)[storeKey];
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
      </div>
    );
  }

  // Default: simple text input
  return (
    <div className="space-y-2">
      <Label>{baseLabel}</Label>
      <Input
        placeholder={field.placeholder}
        value={(detail as any)[storeKey] ?? ""}
        onChange={(e) => set({ [storeKey]: e.target.value } as Partial<SymptomDetail>)}
        className={cn("rounded-md", importanceClass)}
      />
    </div>
  );
}
