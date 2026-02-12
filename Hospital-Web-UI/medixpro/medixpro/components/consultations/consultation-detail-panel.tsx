"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FollowUpEditor } from "@/components/consultations/follow-up-editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { getSectionConfig } from "@/data/consultation-section-data";
import type { SectionItemDetail } from "@/lib/consultation-types";
import { cn } from "@/lib/utils";

function toggleAttribute(current: string[] | undefined, val: string): string[] {
  const set = new Set(current ?? []);
  if (set.has(val)) set.delete(val);
  else set.add(val);
  return Array.from(set);
}

export function ConsultationDetailPanel() {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const durationTriggerRef = useRef<HTMLButtonElement>(null);
  const severityFirstRef = useRef<HTMLButtonElement>(null);
  const {
    sectionItems,
    selectedDetail,
    setSelectedDetail,
    updateSectionItemDetail,
  } = useConsultationStore();

  const section = selectedDetail?.section;
  const itemId = selectedDetail?.itemId;
  const items = section != null ? sectionItems[section] ?? [] : [];
  const item = itemId != null ? items.find((i) => i.id === itemId) : null;
  const detail = item?.detail ?? {};
  const hasNoDetails =
    item != null &&
    !detail.notes &&
    !detail.duration &&
    !detail.severity &&
    !(detail.attributes?.length) &&
    !(detail.customTags?.length);

  const isIncomplete =
    item != null &&
    ((section != null && getSectionConfig(section).durationOptions.length > 0 && !detail.duration) || !detail.severity);

  useEffect(() => {
    if (!item || section == null) return;
    const config = getSectionConfig(section);
    const needsDuration = config.durationOptions.length > 0;
    const missingDuration = needsDuration && !detail.duration;
    const missingSeverity = !detail.severity;
    if (!missingDuration && !missingSeverity) return;
    const t = setTimeout(() => {
      if (missingDuration) {
        durationTriggerRef.current?.focus();
        return;
      }
      if (missingSeverity) {
        severityFirstRef.current?.focus();
        return;
      }
      notesRef.current?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [section, itemId, detail.duration, detail.severity, item]);

  if (!selectedDetail) {
    return (
      <Card className="h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="py-4 pb-3">
          <h3 className="font-bold text-muted-foreground">Details</h3>
        </CardHeader>
        <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select an item from any section to view or add details here.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (section === "follow_up") {
    return <FollowUpEditor />;
  }

  if (!item) {
    return (
      <Card className="h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Item not found.
        </CardContent>
      </Card>
    );
  }

  const sectionType = section ?? "symptoms";
  const config = getSectionConfig(sectionType);
  const set = (patch: Partial<SectionItemDetail>) =>
    updateSectionItemDetail(sectionType, item.id, patch);

  return (
    <Card className="h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-3">
        <h3 className="font-bold truncate pr-2">{item.label}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedDetail(null)}>
              Close panel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-6 pb-6">
        {hasNoDetails && (
          <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 px-3 py-2 border border-border/60">
            Add notes, duration, severity and attributes below so the entry is useful for the record.
          </p>
        )}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            ref={notesRef}
            placeholder="Enter note here..."
            value={detail.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value })}
            className="min-h-[100px] resize-y rounded-md"
          />
        </div>

        {config.durationOptions.length > 0 && (
          <div className="space-y-2">
            <Label>Duration / Since</Label>
            <Select
              value={detail.duration ?? ""}
              onValueChange={(v) => set({ duration: v })}
            >
              <SelectTrigger ref={durationTriggerRef} className="rounded-md">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {config.durationOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Severity</Label>
          <RadioGroup
            value={detail.severity ?? ""}
            onValueChange={(v) =>
              set({ severity: v as "mild" | "moderate" | "severe" })
            }
            className="flex gap-4"
          >
            {["Mild", "Moderate", "Severe"].map((opt, i) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2"
              >
                <RadioGroupItem
                  ref={i === 0 ? severityFirstRef : undefined}
                  value={opt.toLowerCase()}
                />
                <span>{opt}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        {config.attributeOptions.length > 0 && (
          <div className="space-y-2">
            <Label>Attributes / Characteristics</Label>
            <div className="flex flex-wrap gap-2">
              {config.attributeOptions.map((attr) => {
                const isOn = (detail.attributes ?? []).includes(attr);
                return (
                  <Button
                    key={attr}
                    type="button"
                    variant={isOn ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      isOn &&
                        "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                    )}
                    onClick={() =>
                      set({
                        attributes: toggleAttribute(
                          detail.attributes,
                          attr
                        ),
                      })
                    }
                  >
                    {attr}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <CustomTagsField
          tags={detail.customTags ?? []}
          onUpdate={(customTags) => set({ customTags })}
        />
      </CardContent>
    </Card>
  );
}

function CustomTagsField({
  tags,
  onUpdate,
}: {
  tags: string[];
  onUpdate: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);

  const addTag = () => {
    const t = input.trim();
    if (!t || tags.includes(t)) return;
    onUpdate([...tags, t]);
    setInput("");
    setAdding(false);
  };

  const removeTag = (tag: string) => {
    onUpdate(tags.filter((x) => x !== tag));
  };

  return (
    <div className="space-y-2">
      <Label>Custom tags</Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full p-0.5 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {adding ? (
          <div className="flex items-center gap-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTag();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Tag name"
              className="h-8 w-24"
              autoFocus
            />
            <Button type="button" size="sm" variant="ghost" onClick={addTag}>
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-4 w-4" />
            Add tag
          </Button>
        )}
      </div>
    </div>
  );
}
