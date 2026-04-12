"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useConsultationStore } from "@/store/consultationStore";
import { INVESTIGATION_INSTRUCTION_CHIPS } from "@/data/consultation-section-data";
import { CUSTOM_INVESTIGATION_TYPE_OPTIONS } from "@/components/consultations/custom-investigation-sheet";
import {
  evaluateSectionItemComplete,
  getSectionCompletionHints,
  shouldShowInvestigationCustomTag,
} from "@/lib/consultation-completion";
import { useToastNotification } from "@/hooks/use-toast-notification";

const EDIT_TOAST_DEBOUNCE_MS = 650;
const EDIT_TOAST_DEDUPE_MS = 2000;

export function InvestigationDetailPanel() {
  const toast = useToastNotification();
  const editDedupeRef = useRef<Map<string, number>>(new Map());
  const detailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { sectionItems, selectedDetail, updateSectionItemDetail } = useConsultationStore();
  const itemId = selectedDetail?.section === "investigations" ? selectedDetail.itemId ?? null : null;
  const items = sectionItems.investigations ?? [];
  const item = itemId ? items.find((i) => i.id === itemId) : null;

  useEffect(() => {
    return () => {
      if (detailDebounceRef.current) clearTimeout(detailDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (detailDebounceRef.current) {
      clearTimeout(detailDebounceRef.current);
      detailDebounceRef.current = null;
    }
  }, [itemId]);

  const setDetail = useCallback(
    (patch: Record<string, unknown>) => {
      if (!itemId) return;
      updateSectionItemDetail("investigations", itemId, patch);
      if (detailDebounceRef.current) clearTimeout(detailDebounceRef.current);
      detailDebounceRef.current = setTimeout(() => {
        const list = useConsultationStore.getState().sectionItems.investigations ?? [];
        const current = list.find((i) => i.id === itemId);
        const label = current?.label ?? current?.name ?? "Test";
        const now = Date.now();
        const dedupeKey = `edit:${itemId}`;
        const last = editDedupeRef.current.get(dedupeKey) ?? 0;
        if (now - last < EDIT_TOAST_DEDUPE_MS) return;
        editDedupeRef.current.set(dedupeKey, now);
        toast.success(`${label} updated successfully`);
      }, EDIT_TOAST_DEBOUNCE_MS);
    },
    [itemId, toast, updateSectionItemDetail]
  );

  const isComplete = useMemo(
    () => (item ? evaluateSectionItemComplete("investigations", item) : false),
    [item]
  );
  const completionHints = useMemo(
    () => (item ? getSectionCompletionHints("investigations", item) : []),
    [item]
  );

  if (!item) {
    return (
      <Card
        className={cn(
          "h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm"
        )}
      >
        <CardHeader className="py-4 pb-3">
          <h3 className="font-bold text-muted-foreground">Investigation details</h3>
        </CardHeader>
        <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select a test from the list to view or edit details here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const detail = item.detail ?? {};
  /** Only the custom-investigation sheet uses `custom-…` ids and category "Custom". */
  const isSheetCustomInvestigation =
    String(detail.service_id ?? "").startsWith("custom-") ||
    detail.investigation_category === "Custom";
  const urgency = detail.urgency ?? "routine";
  const instructions = detail.instructions ?? [];
  const notes = detail.notes ?? "";
  const customTypeLabel =
    detail.custom_investigation_type &&
    CUSTOM_INVESTIGATION_TYPE_OPTIONS.find((o) => o.id === detail.custom_investigation_type)?.label;

  return (
    <Card
      className={cn(
        "h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm"
      )}
    >
      <CardHeader className="space-y-2 border-b border-border/60 py-4 pb-3">
        <h3 className="font-bold leading-tight">{item.label}</h3>
        <div className="flex flex-wrap items-center gap-2" aria-live="polite" aria-atomic="true">
          {isComplete ? (
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
              <AlertTriangle
                className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              <span className="min-w-0 truncate">
                {completionHints[0] ?? "Incomplete"}
              </span>
            </div>
          )}
          {shouldShowInvestigationCustomTag(item) && (
            <span className="rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
              CUSTOM
            </span>
          )}
        </div>
        {isSheetCustomInvestigation ? (
          <div className="space-y-1 rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 text-sm">
            <p>
              <span className="font-medium text-muted-foreground">Custom test</span>
            </p>
            {detail.custom_investigation_type ? (
              <p>
                <span className="font-medium text-muted-foreground">Type:</span>{" "}
                {customTypeLabel ?? detail.custom_investigation_type}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1 rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 text-sm">
            <p>
              <span className="font-medium text-muted-foreground">Category:</span>{" "}
              {detail.investigation_category ?? "NA"}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Sample:</span>{" "}
              {detail.investigation_sample ?? "NA"}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">TAT:</span>{" "}
              {detail.investigation_tat ?? "NA"}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Preparation:</span>{" "}
              {detail.investigation_preparation ?? "NA"}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6 pb-6 pt-4">
        <div className="space-y-2">
          <Label>Instructions (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {INVESTIGATION_INSTRUCTION_CHIPS.map((chip) => {
              const selected = instructions.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    const next = selected
                      ? instructions.filter((value) => value !== chip)
                      : [...instructions, chip];
                    setDetail({ instructions: next });
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-border bg-muted/30 text-foreground hover:bg-muted/50"
                  )}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <RadioGroup
            value={urgency}
            onValueChange={(value) =>
              setDetail({
                urgency:
                  value === "urgent" ? "urgent" : value === "stat" ? "stat" : "routine",
              })
            }
            className="flex flex-wrap gap-5"
          >
            <label className="flex items-center gap-2">
              <RadioGroupItem value="routine" />
              <span>Routine</span>
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="urgent" />
              <span>Urgent</span>
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="stat" />
              <span>STAT</span>
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea
            placeholder="Enter note..."
            value={notes}
            onChange={(event) => setDetail({ notes: event.target.value })}
            onBlur={(event) => setDetail({ notes: event.target.value })}
            className="min-h-[88px] resize-y rounded-md"
          />
        </div>
      </CardContent>
    </Card>
  );
}
