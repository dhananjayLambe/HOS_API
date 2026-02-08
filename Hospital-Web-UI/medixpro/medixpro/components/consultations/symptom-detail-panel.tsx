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
import {
  getSymptomDetailSections,
  type SymptomDetailSection,
} from "@/lib/consultation-right-panel-config";
import type { SymptomDetail } from "@/lib/consultation-types";
import { cn } from "@/lib/utils";

function toggleMaxTemp(current: string[] | undefined, val: string): string[] {
  const set = new Set(current ?? []);
  if (set.has(val)) set.delete(val);
  else set.add(val);
  return Array.from(set);
}

export function SymptomDetailPanel() {
  const { symptoms, selectedSymptomId, updateSymptomDetail, setSelectedSymptomId } =
    useConsultationStore();

  const symptom = symptoms.find((s) => s.id === selectedSymptomId);
  // Right-panel menu: hardcoded now; later from backend (e.g. getSymptomDetailSections from API)
  const sections = getSymptomDetailSections(symptom?.name);

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
        {sections.map((section) => (
          <RightPanelSection
            key={section.id}
            section={section}
            detail={detail}
            set={set}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function RightPanelSection({
  section,
  detail,
  set,
}: {
  section: SymptomDetailSection;
  detail: SymptomDetail;
  set: (patch: Partial<SymptomDetail>) => void;
}) {
  const { id, label, fieldType, options, toggleGroups, maxTempLabels } = section;

  if (fieldType === "note") {
    return (
      <div className="space-y-2">
        <Label>{label ?? "Note"}</Label>
        <Textarea
          placeholder="Note"
          value={detail.note ?? ""}
          onChange={(e) => set({ note: e.target.value })}
          className="min-h-[100px] resize-y rounded-md"
        />
      </div>
    );
  }

  if (fieldType === "since" && options) {
    return (
      <div className="space-y-2">
        <Label>{label ?? "Since"}</Label>
        <Select value={detail.since ?? ""} onValueChange={(v) => set({ since: v })}>
          <SelectTrigger className="rounded-md">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (fieldType === "severity" && options) {
    const valueMap = { Mild: "mild", Moderate: "moderate", Severe: "severe" } as const;
    return (
      <div className="space-y-2">
        <Label>{label ?? "Severity"}</Label>
        <RadioGroup
          value={detail.severity ?? ""}
          onValueChange={(v) => set({ severity: v as "mild" | "moderate" | "severe" })}
          className="flex gap-4"
        >
          {options.map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value={valueMap[opt as keyof typeof valueMap] ?? opt.toLowerCase()} />
              <span>{opt}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  if (fieldType === "toggle_group" && toggleGroups) {
    return (
      <div className="space-y-3">
        {label && <Label className="text-sm font-medium">{label}</Label>}
        <div className="space-y-3">
          {toggleGroups.map((group) => (
            <div key={group.storeKey} className="flex flex-wrap gap-2">
              {group.options.map((opt) => {
                const val = opt.value === "true";
                const current = (detail as Record<string, unknown>)[group.storeKey];
                const isSelected =
                  typeof current === "boolean" ? current === val : current === opt.value;
                return (
                  <Button
                    key={opt.label}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      isSelected && "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                    )}
                    onClick={() => set({ [group.storeKey]: val } as Partial<SymptomDetail>)}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (fieldType === "grade") {
    return (
      <div className="space-y-2">
        <Label>{label ?? "Grade"}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="e.g. High"
            value={detail.grade ?? ""}
            onChange={(e) => set({ grade: e.target.value })}
            className="rounded-md flex-1 min-w-[120px]"
          />
          {detail.grade && (
            <span className="rounded-md border bg-muted px-2 py-1.5 text-sm">
              {detail.grade}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (fieldType === "max_temps" && maxTempLabels) {
    const maxTemps = detail.maxTemps ?? [];
    return (
      <div className="flex flex-wrap gap-2">
        {maxTempLabels.map((label) => {
          const val = label.replace("Max ", "");
          const isOn = maxTemps.includes(val);
          return (
            <Button
              key={label}
              type="button"
              variant={isOn ? "default" : "outline"}
              size="sm"
              className={cn(
                isOn && "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              )}
              onClick={() => set({ maxTemps: toggleMaxTemp(maxTemps, val) })}
            >
              {label}
            </Button>
          );
        })}
      </div>
    );
  }

  if (fieldType === "paracetamol") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={detail.respondsToParacetamol === true ? "default" : "outline"}
          size="sm"
          className={cn(
            detail.respondsToParacetamol === true &&
              "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          )}
          onClick={() => set({ respondsToParacetamol: true })}
        >
          Responds to Paracetamol
        </Button>
        <Button
          type="button"
          variant={detail.respondsToParacetamol === false ? "default" : "outline"}
          size="sm"
          className={cn(
            detail.respondsToParacetamol === false &&
              "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          )}
          onClick={() => set({ respondsToParacetamol: false })}
        >
          Not responding to Paracetamol
        </Button>
      </div>
    );
  }

  return null;
}
