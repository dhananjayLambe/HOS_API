"use client";

import { MoreHorizontal, Star } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useConsultationStore } from "@/store/consultationStore";
import type { SectionItemDetail } from "@/lib/consultation-types";
import { cn } from "@/lib/utils";
import {
  evaluateSectionItemComplete,
  getSectionCompletionHints,
  normalizeItem,
} from "@/lib/consultation-completion";

type DiagnosisDetail = SectionItemDetail & {
  status?: "provisional" | "confirmed";
  primary?: boolean;
  chronic?: boolean;
};

export function DiagnosisDetailPanel() {
  const {
    sectionItems,
    selectedDetail,
    updateSectionItemDetail,
    getDiagnosisSchemaForLabel,
    setPrimaryDiagnosis,
  } = useConsultationStore();

  if (!selectedDetail || selectedDetail.section !== "diagnosis" || !selectedDetail.itemId) {
    return (
      <Card className="h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="py-4 pb-3">
          <h3 className="font-bold text-muted-foreground">Diagnosis details</h3>
        </CardHeader>
        <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select a diagnosis from the list to view or add details here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const items = sectionItems["diagnosis"] ?? [];
  const item = items.find((i) => i.id === selectedDetail.itemId);

  if (!item) return null;

  const schemaItem = getDiagnosisSchemaForLabel(item.label);
  const detail: DiagnosisDetail = (item.detail ?? {}) as DiagnosisDetail;
  const set = (patch: Partial<DiagnosisDetail>) =>
    updateSectionItemDetail("diagnosis", item.id, patch);

  const status: "provisional" | "confirmed" =
    detail.status ?? "provisional";
  const isPrimary = detail.primary === true;
  const chronicFromSchema = schemaItem?.chronic === true;
  const chronic = detail.chronic ?? chronicFromSchema ?? false;
  const completionStatus = evaluateSectionItemComplete("diagnosis", normalizeItem(item));
  const completionHints = getSectionCompletionHints("diagnosis", normalizeItem(item));

  return (
    <Card className="h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-3">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold truncate pr-2">{item.label}</h3>
            {isPrimary && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                Primary
              </span>
            )}
            {chronicFromSchema && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-400 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                Chronic
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2" aria-live="polite" aria-atomic="true">
            {completionStatus ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/[0.1] px-3 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-100">
                <span className="text-[10px]" aria-hidden>●</span>
                Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/45 bg-amber-500/12 px-3 py-1 text-xs font-medium text-amber-950 dark:text-amber-50">
                <span className="text-[10px]" aria-hidden>●</span>
                Incomplete
              </span>
            )}
            {(item.is_custom ?? item.isCustom) && (
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
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Options">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 pb-6">
        {/* Section 1 – Status & Primary */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <RadioGroup
              value={status}
              onValueChange={(v) =>
                set({
                  status: v === "confirmed" ? "confirmed" : "provisional",
                })
              }
              className="flex gap-4"
            >
              {["provisional", "confirmed"].map((opt) => (
                <label key={opt} className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value={opt} />
                  <span className="capitalize">{opt}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2 mt-2">
            <Label>Primary diagnosis</Label>
            <Button
              type="button"
              variant={isPrimary ? "default" : "outline"}
              size="sm"
              className={cn(
                "gap-1 mt-1.5",
                isPrimary &&
                  "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              )}
              onClick={() => setPrimaryDiagnosis(item.id)}
            >
              <Star className="h-4 w-4" />
              {isPrimary ? "Marked as primary" : "Mark as primary"}
            </Button>
          </div>

          {chronicFromSchema && (
            <div className="space-y-2 mt-1">
              <Label>Chronic condition</Label>
              <Button
                type="button"
                variant={chronic ? "default" : "outline"}
                size="sm"
                className="mt-1.5"
                onClick={() => set({ chronic: !chronic })}
              >
                {chronic ? "Chronic (on record)" : "Mark as chronic"}
              </Button>
            </div>
          )}
        </div>

        {/* Section 2 – Severity */}
        {schemaItem?.severity_supported && (
          <div className="space-y-2">
            <Label>Severity</Label>
            <RadioGroup
              value={detail.severity ?? ""}
              onValueChange={(v) =>
                set({ severity: v as "mild" | "moderate" | "severe" })
              }
              className="flex gap-4"
            >
              {["mild", "moderate", "severe"].map((opt) => (
                <label key={opt} className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value={opt} />
                  <span className="capitalize">{opt}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Section 3 – ICD Info (read-only) */}
        {schemaItem && (
          <div className="space-y-1 rounded-lg border border-dashed border-border/70 bg-muted/40 px-3 py-2.5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-muted-foreground">ICD10:</span>
              <span className="font-semibold">{schemaItem.icd10_code}</span>
            </div>
            {schemaItem.clinical_term && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-muted-foreground">Clinical term:</span>
                <span>{schemaItem.clinical_term}</span>
              </div>
            )}
          </div>
        )}

        {/* Section 4 – Notes */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            placeholder="Additional details, differentials, or plan..."
            value={detail.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value })}
            className="min-h-[100px] resize-y rounded-md"
          />
        </div>
      </CardContent>
    </Card>
  );
}

