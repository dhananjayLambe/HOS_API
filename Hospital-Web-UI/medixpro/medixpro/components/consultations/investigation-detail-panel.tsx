"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useConsultationStore } from "@/store/consultationStore";
import { INVESTIGATION_INSTRUCTION_CHIPS } from "@/data/consultation-section-data";

export function InvestigationDetailPanel() {
  const { sectionItems, selectedDetail, updateSectionItemDetail } = useConsultationStore();
  const itemId = selectedDetail?.section === "investigations" ? selectedDetail.itemId ?? null : null;
  const items = sectionItems.investigations ?? [];
  const item = itemId ? items.find((i) => i.id === itemId) : null;

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
  const urgency = detail.urgency ?? "routine";
  const instructions = detail.instructions ?? [];
  const notes = detail.notes ?? "";

  const setDetail = (patch: Record<string, unknown>) => {
    updateSectionItemDetail("investigations", item.id, patch);
  };

  return (
    <Card
      className={cn(
        "h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm"
      )}
    >
      <CardHeader className="space-y-2 border-b border-border/60 py-4 pb-3">
        <h3 className="font-bold leading-tight">{item.label}</h3>
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
          <Label>Urgency</Label>
          <RadioGroup
            value={urgency}
            onValueChange={(value) => setDetail({ urgency: value === "urgent" ? "urgent" : "routine" })}
            className="flex gap-5"
          >
            <label className="flex items-center gap-2">
              <RadioGroupItem value="routine" />
              <span>Routine</span>
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="urgent" />
              <span>Urgent</span>
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
