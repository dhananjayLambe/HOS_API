"use client";

import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ToastAction } from "@/components/ui/toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConsultationStore } from "@/store/consultationStore";
import type {
  MedicineDurationSpecial,
  MedicinePrescriptionDetail,
  MedicineTiming,
} from "@/lib/consultation-types";
import {
  DOSE_UNIT_OPTIONS,
  DURATION_QUICK_CHIPS,
  DURATION_SPECIAL_CHIPS,
  DURATION_UNIT_OPTIONS,
  deriveFrequencyIdFromPatternSlots,
  formatDoseDisplay,
  FREQUENCY_MORE_OPTIONS,
  FREQUENCY_PRIMARY_CHIPS,
  FREQUENCY_SPECIAL_CHIPS,
  getActiveFrequencySummary,
  getDosePresetChips,
  isMoreFrequencyId,
  isPatternSectionDisabled,
  primaryFrequencyChipSelected,
  patchMedicineAfterUnitChange,
  patternStringFromSlots,
  getRouteBodySiteSuggestionChips,
  routeShowsBodySite,
  ROUTE_OPTIONS,
  slotsFromPrimaryChipId,
  TIMING_OPTIONS,
  buildDefaultMedicinePrescription,
  getDurationDisplaySummary,
  getMedicineCompletionStatus,
} from "@/lib/medicine-prescription-utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</Label>;
}

function doseChipSelected(medicine: MedicinePrescriptionDetail, v: number): boolean {
  if (medicine.dose_is_custom) return false;
  const dv = medicine.dose_value;
  if (dv === undefined || dv === null) return false;
  return Math.abs(Number(dv) - v) < 1e-6;
}

/** Highlight chip when preset matches stored value or typed custom text. */
function dosePresetMatchesDisplay(medicine: MedicinePrescriptionDetail, v: number): boolean {
  if (!medicine.dose_is_custom) return doseChipSelected(medicine, v);
  const t = String(medicine.dose_custom_text ?? "").trim();
  if (!t) return false;
  const n = parseFloat(t.replace(/,/g, "."));
  if (Number.isNaN(n)) return false;
  return Math.abs(n - v) < 1e-6;
}

function DosePresetChip({
  selected,
  children,
  onSelect,
}: {
  selected?: boolean;
  children: React.ReactNode;
  onSelect: (el: HTMLButtonElement) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        onSelect(e.currentTarget);
      }}
      className={cn(
        "h-8 shrink-0 cursor-pointer rounded-2xl border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-transparent bg-blue-600 text-white shadow-sm dark:bg-blue-600"
          : "border border-gray-200 bg-background text-foreground hover:bg-muted/60 dark:border-border"
      )}
    >
      {children}
    </button>
  );
}

function getDoseInputDisplay(m: MedicinePrescriptionDetail): string {
  if (m.dose_is_custom) return m.dose_custom_text ?? "";
  return formatDoseDisplay(m.dose_value);
}

function Chip({
  selected,
  disabled,
  children,
  onClick,
  className,
}: {
  selected?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        disabled && "cursor-not-allowed opacity-40 hover:bg-muted/40",
        selected
          ? "border-blue-600 bg-blue-600 text-white shadow-sm dark:border-blue-600 dark:bg-blue-600"
          : "border-border bg-muted/40 text-foreground hover:bg-muted/70",
        className
      )}
    >
      {children}
    </button>
  );
}

export function MedicineDetailPanel() {
  const { toast } = useToast();
  const {
    selectedDetail,
    updateSectionItemDetail,
    removeSectionItem,
    addSectionItem,
    setSelectedDetail,
    requestMedicinesSearchFocus,
  } = useConsultationStore();

  const itemId = selectedDetail?.section === "medicines" ? selectedDetail.itemId : null;

  /** Subscribe to the medicines list so updates re-render (getSectionItems() alone is stable and would stale-memo). */
  const medicinesItems = useConsultationStore((s) => s.sectionItems.medicines ?? []);

  const item = useMemo(() => {
    if (!itemId) return null;
    return medicinesItems.find((i) => i.id === itemId) ?? null;
  }, [itemId, medicinesItems]);

  const doseInputRef = useRef<HTMLInputElement>(null);
  const frequencySectionRef = useRef<HTMLDivElement>(null);

  /** When doctor picks a medicine, move focus to dose for fastest entry. */
  useEffect(() => {
    if (!itemId || !item) return;
    const id = requestAnimationFrame(() => {
      doseInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [itemId, item?.id]);

  useEffect(() => {
    if (!item || item.detail?.medicine) return;
    updateSectionItemDetail("medicines", item.id, {
      medicine: buildDefaultMedicinePrescription(item.id, item.label),
    });
  }, [item, updateSectionItemDetail]);

  const medicine = useMemo(() => {
    if (!item) return null;
    return item.detail?.medicine ?? buildDefaultMedicinePrescription(item.id, item.label);
  }, [item]);

  const completion = useMemo(
    () => getMedicineCompletionStatus(medicine ?? undefined),
    [medicine]
  );

  const focusFirstIncompleteField = () => {
    const c = getMedicineCompletionStatus(medicine ?? undefined);
    if (c.level === "complete") return;
    if (c.missing[0] === "Dose") {
      doseInputRef.current?.focus();
      return;
    }
    frequencySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    window.setTimeout(() => frequencySectionRef.current?.focus(), 200);
  };

  if (!item || !medicine) {
    return (
      <Card
        className={cn(
          "h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm"
        )}
      >
        <CardHeader className="py-4 pb-3">
          <h3 className="font-bold text-muted-foreground">Medicine</h3>
        </CardHeader>
        <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select a medicine from the list to set dose, frequency, and route.
          </p>
        </CardContent>
      </Card>
    );
  }

  const setMedicine = (updates: Partial<MedicinePrescriptionDetail>) => {
    const base = item.detail?.medicine ?? buildDefaultMedicinePrescription(item.id, item.label);
    const next: MedicinePrescriptionDetail = { ...base, ...updates };

    if (updates.frequency_id !== undefined) {
      const id = next.frequency_id ?? "";
      if (id === "SOS") {
        next.is_prn = true;
        next.is_stat = false;
      } else if (id === "STAT") {
        next.is_stat = true;
        next.is_prn = false;
      } else {
        next.is_prn = false;
        next.is_stat = false;
      }

      if (id === "SOS" || id === "STAT") {
        next.frequency_pattern_morning = false;
        next.frequency_pattern_afternoon = false;
        next.frequency_pattern_night = false;
        next.frequency_custom_text = "";
        next.frequency_ui_mode = undefined;
      } else if (isMoreFrequencyId(id)) {
        next.frequency_pattern_morning = false;
        next.frequency_pattern_afternoon = false;
        next.frequency_pattern_night = false;
        if (id !== "CUSTOM_INTERVAL") {
          next.frequency_custom_text = "";
        }
        next.frequency_ui_mode = undefined;
      } else if (id === "OD" || id === "BD" || id === "TDS") {
        const slots = slotsFromPrimaryChipId(id);
        next.frequency_pattern_morning = slots.morning;
        next.frequency_pattern_afternoon = slots.afternoon;
        next.frequency_pattern_night = slots.night;
        next.frequency_custom_text = patternStringFromSlots(
          slots.morning,
          slots.afternoon,
          slots.night
        );
        next.frequency_ui_mode = undefined;
      }
    }

    const patternKeysTouched =
      updates.frequency_pattern_morning !== undefined ||
      updates.frequency_pattern_afternoon !== undefined ||
      updates.frequency_pattern_night !== undefined;

    if (patternKeysTouched && !isPatternSectionDisabled(next.frequency_id)) {
      const m = next.frequency_pattern_morning ?? false;
      const a = next.frequency_pattern_afternoon ?? false;
      const n = next.frequency_pattern_night ?? false;
      next.frequency_custom_text = patternStringFromSlots(m, a, n);
      next.frequency_id = deriveFrequencyIdFromPatternSlots(m, a, n);
      next.is_prn = false;
      next.is_stat = false;
    }

    updateSectionItemDetail("medicines", item.id, { medicine: next });
  };

  const toggleTiming = (id: MedicineTiming) => {
    const cur = medicine.timing ?? [];
    const has = cur.includes(id);
    const timing = has ? cur.filter((x) => x !== id) : [...cur, id];
    setMedicine({ timing });
  };

  const doseUnitRaw = medicine.dose_unit_id ?? "tablet";
  const isKnownDoseUnit = DOSE_UNIT_OPTIONS.some((u) => u.id === doseUnitRaw);
  const durationUnit = medicine.duration_unit ?? "days";
  const dosePresets = getDosePresetChips(doseUnitRaw);
  const hideDosePresets =
    item.isCustom === true || medicine.route_id === "topical";
  const doseSectionLabel =
    medicine.route_id === "topical" ? "Dose (optional)" : "Dose";

  const doseFieldIncomplete = completion.missing.includes("Dose");
  const frequencyFieldIncomplete = completion.missing.includes("Frequency");

  const moreFrequencyValue = isMoreFrequencyId(medicine.frequency_id)
    ? medicine.frequency_id
    : undefined;
  const sosOrStat =
    medicine.frequency_id === "SOS" || medicine.frequency_id === "STAT";
  /** Hidden for SOS/STAT; shown for OD/BD/TDS/PATTERN/empty and for interval ids (Every 6h, etc.). */
  const showIntervalDropdown = !sosOrStat;
  /** Remount interval Select when leaving/entering interval ids so Radix state matches frequency_id. */
  const intervalSelectKey = isMoreFrequencyId(medicine.frequency_id)
    ? `interval-${medicine.frequency_id}`
    : "frequency-chips";
  const patternSectionDisabled = isPatternSectionDisabled(medicine.frequency_id);

  const patternMorning = medicine.frequency_pattern_morning ?? false;
  const patternAfternoon = medicine.frequency_pattern_afternoon ?? false;
  const patternNight = medicine.frequency_pattern_night ?? false;

  const durationNumericLocked = medicine.duration_special !== undefined;

  const applyDurationSpecial = (id: MedicineDurationSpecial) => {
    if (medicine.duration_special === id) {
      setMedicine({
        duration_special: undefined,
        duration_value: 5,
        duration_unit: "days",
        duration_is_custom: false,
        duration_custom_text: "",
      });
    } else {
      setMedicine({
        duration_special: id,
        duration_is_custom: false,
        duration_custom_text: "",
      });
    }
  };

  const applyRoute = (routeId: string) => {
    const patch: Partial<MedicinePrescriptionDetail> = { route_id: routeId };
    if (!routeShowsBodySite(routeId)) {
      patch.route_body_site = "";
    }
    setMedicine(patch);
  };

  const bodySiteChips = getRouteBodySiteSuggestionChips(medicine.dose_unit_id);
  const showBodySite = routeShowsBodySite(medicine.route_id);

  const togglePatternSlot = (slot: "morning" | "afternoon" | "night") => {
    if (patternSectionDisabled) return;
    const m = medicine.frequency_pattern_morning ?? false;
    const a = medicine.frequency_pattern_afternoon ?? false;
    const n = medicine.frequency_pattern_night ?? false;
    const cur = { morning: m, afternoon: a, night: n };
    cur[slot] = !cur[slot];
    setMedicine({
      frequency_pattern_morning: cur.morning,
      frequency_pattern_afternoon: cur.afternoon,
      frequency_pattern_night: cur.night,
    });
  };

  const removeMedicineWithUndo = () => {
    const snapshot = { ...item };
    removeSectionItem("medicines", item.id);
    toast({
      title: "Medicine removed",
      action: (
        <ToastAction
          altText="Undo remove medicine"
          onClick={() => {
            addSectionItem("medicines", snapshot);
            setSelectedDetail({ section: "medicines", itemId: snapshot.id });
          }}
        >
          Undo
        </ToastAction>
      ),
    });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Card
        className={cn(
          "flex max-h-[min(100vh,56rem)] w-full max-w-full min-w-0 max-w-md flex-col rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md min-h-0"
        )}
      >
        <CardHeader className="flex shrink-0 flex-col gap-3 space-y-0 border-b border-border/60 py-3 pb-2.5">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedDetail(null);
                requestMedicinesSearchFocus();
              }}
              className="min-w-0 flex-1 rounded-md text-left font-bold leading-tight break-words hover:text-primary hover:underline underline-offset-2"
            >
              {item.label}
            </button>
            <button
              type="button"
              onClick={removeMedicineWithUndo}
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 text-muted-foreground",
                "hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              aria-label="Remove medicine"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status pill + optional custom badge + info (i) */}
          <div
            className="flex flex-wrap items-center gap-2"
            aria-live="polite"
            aria-atomic="true"
          >
            {completion.level === "complete" ? (
              <div
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/[0.1] px-3 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-100"
                role="status"
              >
                <span className="text-[10px]" aria-hidden>
                  🟢
                </span>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span>Complete</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={focusFirstIncompleteField}
                className={cn(
                  "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border px-3 py-1 text-left text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  completion.level === "partial" &&
                    "border-amber-500/45 bg-amber-500/12 text-amber-950 hover:bg-amber-500/18 dark:text-amber-50",
                  completion.level === "critical" &&
                    "border-red-500/50 bg-red-500/12 text-red-950 hover:bg-red-500/18 dark:text-red-50"
                )}
                aria-label={`Incomplete: ${completion.message}. Click to fix.`}
              >
                <span className="text-[10px]" aria-hidden>
                  {completion.level === "critical" ? "🔴" : "🟡"}
                </span>
                <AlertTriangle
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    completion.level === "partial" && "text-amber-600 dark:text-amber-400",
                    completion.level === "critical" && "text-red-600 dark:text-red-400"
                  )}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{completion.message}</span>
              </button>
            )}
            {(item.is_custom ?? item.isCustom) && (
              <span className="rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                CUSTOM
              </span>
            )}
            {(medicine.generic_name || medicine.composition) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    aria-label="Generic and composition"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-left">
                  {medicine.generic_name ? (
                    <p>
                      <span className="font-medium">Generic:</span> {medicine.generic_name}
                    </p>
                  ) : null}
                  {medicine.composition ? (
                    <p className={medicine.generic_name ? "mt-1" : ""}>
                      <span className="font-medium">Composition:</span> {medicine.composition}
                    </p>
                  ) : null}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {completion.level !== "complete" && completion.missing.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Fill next: {completion.missing.join(" • ")}
            </p>
          )}
        </CardHeader>

        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-3 pt-3">
          {/* Dose: input + unit first, dynamic preset chips below */}
          <div className="space-y-2">
            <SectionLabel>{doseSectionLabel}</SectionLabel>
            <div className="flex flex-nowrap items-center gap-2">
              <Input
                ref={doseInputRef}
                type="text"
                inputMode="decimal"
                placeholder="Enter dose (e.g., 1 tablet)"
                value={getDoseInputDisplay(medicine)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d.]/g, "");
                  setMedicine({
                    dose_is_custom: true,
                    dose_custom_text: raw,
                  });
                }}
                className={cn(
                  "h-10 min-w-[140px] flex-1 rounded-lg",
                  doseFieldIncomplete &&
                    "border-amber-500 focus-visible:ring-amber-500/40"
                )}
                aria-label="Dose amount"
                aria-invalid={doseFieldIncomplete}
              />
              <Select
                value={doseUnitRaw}
                onValueChange={(v) => {
                  const patch = patchMedicineAfterUnitChange(medicine, v);
                  setMedicine(patch);
                }}
              >
                <SelectTrigger className="h-10 min-w-[140px] max-w-[220px] shrink-0 rounded-lg">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(70vh,320px)]">
                  {!isKnownDoseUnit && (
                    <SelectItem value={doseUnitRaw}>{doseUnitRaw}</SelectItem>
                  )}
                  {DOSE_UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!hideDosePresets && dosePresets.length > 0 && (
              <div
                className={cn(
                  "flex flex-nowrap gap-2 overflow-x-auto pb-1 pt-1",
                  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                )}
              >
                {dosePresets.map((v, idx) => (
                  <DosePresetChip
                    key={`${doseUnitRaw}-${v}-${idx}`}
                    selected={dosePresetMatchesDisplay(medicine, v)}
                    onSelect={(el) => {
                      setMedicine({
                        dose_is_custom: false,
                        dose_value: v,
                        dose_custom_text: "",
                      });
                      requestAnimationFrame(() => {
                        el.scrollIntoView({
                          behavior: "smooth",
                          inline: "center",
                          block: "nearest",
                        });
                      });
                    }}
                  >
                    {formatDoseDisplay(v)}
                  </DosePresetChip>
                ))}
              </div>
            )}
          </div>

          {/* Frequency: OD/BD/… + More, always paired with M/A/N pattern (no mode toggle) */}
          <div
            ref={frequencySectionRef}
            tabIndex={-1}
            className={cn(
              "space-y-2.5 border-t border-border/60 pt-3 outline-none",
              frequencyFieldIncomplete &&
                "rounded-lg ring-2 ring-amber-500/45 ring-offset-2 ring-offset-background"
            )}
          >
            <SectionLabel>Frequency</SectionLabel>

            <div className="flex min-w-0 items-center gap-2">
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto pb-0.5",
                  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                )}
              >
                {FREQUENCY_PRIMARY_CHIPS.map((f) => (
                  <Chip
                    key={f.id}
                    selected={primaryFrequencyChipSelected(medicine, f.id)}
                    onClick={() => setMedicine({ frequency_id: f.id })}
                    className="h-7 shrink-0 px-2 py-0.5 text-xs"
                  >
                    {f.label}
                  </Chip>
                ))}
                {FREQUENCY_SPECIAL_CHIPS.map((f) => (
                  <Chip
                    key={f.id}
                    selected={medicine.frequency_id === f.id}
                    onClick={() => setMedicine({ frequency_id: f.id })}
                    className="h-7 shrink-0 px-2 py-0.5 text-xs"
                  >
                    {f.label}
                  </Chip>
                ))}
              </div>
              {showIntervalDropdown && (
                <Select
                  key={intervalSelectKey}
                  value={moreFrequencyValue}
                  onValueChange={(v) => setMedicine({ frequency_id: v })}
                >
                  <SelectTrigger
                    className={cn(
                      "h-6 w-auto min-w-[5.25rem] max-w-[7.5rem] shrink-0 gap-0.5 rounded-md border border-border/40 bg-muted/25 px-1.5 py-0 text-[11px] font-normal text-muted-foreground shadow-none",
                      "hover:bg-muted/45 hover:text-foreground/90",
                      "focus:ring-1 focus:ring-ring/40 data-[placeholder]:text-muted-foreground/80",
                      "[&>svg]:size-3 [&>svg]:opacity-60"
                    )}
                  >
                    <SelectValue placeholder="Interval" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,320px)]">
                    {FREQUENCY_MORE_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.id}
                        value={o.id}
                        title={o.label}
                        className="text-xs"
                      >
                        {o.shortLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {!patternSectionDisabled && (
              <div className="space-y-2.5 rounded-xl border border-border/80 bg-muted/20 p-2.5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(
                    [
                      ["morning", "Morning"],
                      ["afternoon", "Afternoon"],
                      ["night", "Night"],
                    ] as const
                  ).map(([key, label]) => {
                    const on =
                      key === "morning"
                        ? patternMorning
                        : key === "afternoon"
                          ? patternAfternoon
                          : patternNight;
                    return (
                      <div key={key} className="flex flex-col gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {label}
                        </span>
                        <Chip
                          selected={on}
                          onClick={() => togglePatternSlot(key)}
                          className="inline-flex min-h-10 w-full items-center justify-center py-2.5 text-sm leading-none"
                        >
                          {on ? "✓" : "—"}
                        </Chip>
                      </div>
                    );
                  })}
                </div>

                <p className="text-sm font-medium text-foreground">
                  Result:{" "}
                  <span className="font-mono tabular-nums">
                    {patternStringFromSlots(
                      patternMorning,
                      patternAfternoon,
                      patternNight
                    )}
                  </span>
                </p>
              </div>
            )}

            {medicine.frequency_id === "CUSTOM" && (
              <Input
                type="text"
                placeholder="Legacy custom frequency text (e.g. alternate days)"
                value={medicine.frequency_custom_text ?? ""}
                onChange={(e) =>
                  setMedicine({ frequency_custom_text: e.target.value })
                }
                className="h-10 rounded-lg text-sm"
                aria-label="Legacy custom frequency"
              />
            )}

            {medicine.frequency_id === "CUSTOM_INTERVAL" && (
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Describe interval</span>
                <Input
                  type="text"
                  placeholder="e.g. every 72 hours, 2× weekly"
                  value={medicine.frequency_custom_text ?? ""}
                  onChange={(e) =>
                    setMedicine({ frequency_custom_text: e.target.value })
                  }
                  className="h-10 rounded-lg text-sm"
                  aria-label="Custom interval description"
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Active:</span>{" "}
              {getActiveFrequencySummary(medicine) || "—"}
            </p>
          </div>

          {/* Timing */}
          <div className="space-y-2 border-t border-border/60 pt-3">
            <SectionLabel>Timing (optional)</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {TIMING_OPTIONS.map((t) => {
                const on = (medicine.timing ?? []).includes(t.id);
                return (
                  <Chip key={t.id} selected={on} onClick={() => toggleTiming(t.id)}>
                    {t.label}
                  </Chip>
                );
              })}
            </div>
          </div>

          {/* Duration: numeric + unit first, quick chips, then special modes (mutually exclusive) */}
          <div className="space-y-3 border-t border-border/60 pt-3">
            <SectionLabel>Duration</SectionLabel>
            <div className="flex flex-nowrap items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder={durationNumericLocked ? "—" : "e.g. 5"}
                value={
                  durationNumericLocked
                    ? ""
                    : String(Math.max(1, Math.floor(Number(medicine.duration_value ?? 5))))
                }
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  const n =
                    raw === "" ? 1 : Math.max(1, parseInt(raw, 10) || 1);
                  setMedicine({
                    duration_special: undefined,
                    duration_value: n,
                    duration_unit: durationUnit,
                    duration_is_custom: false,
                    duration_custom_text: "",
                  });
                }}
                className="h-10 w-16 shrink-0 rounded-lg text-center tabular-nums sm:w-20"
                aria-label="Duration amount"
              />
              <div className="min-w-0 flex-1">
                <Select
                  value={durationUnit}
                  onValueChange={(v) =>
                    setMedicine({
                      duration_special: undefined,
                      duration_unit: v as MedicinePrescriptionDetail["duration_unit"],
                      duration_is_custom: false,
                      duration_custom_text: "",
                    })
                  }
                >
                  <SelectTrigger className="h-10 w-full min-w-[100px] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {DURATION_QUICK_CHIPS.map((c) => {
                const selected =
                  !durationNumericLocked &&
                  !medicine.duration_is_custom &&
                  Math.floor(Number(medicine.duration_value ?? 0)) === c.value &&
                  (medicine.duration_unit ?? "days") === c.unit;
                return (
                  <Chip
                    key={`${c.label}-${c.unit}`}
                    selected={selected}
                    className="shrink-0 px-2.5 py-1 text-xs"
                    onClick={() =>
                      setMedicine({
                        duration_special: undefined,
                        duration_value: c.value,
                        duration_unit: c.unit,
                        duration_is_custom: false,
                        duration_custom_text: "",
                      })
                    }
                  >
                    {c.label}
                  </Chip>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
              {DURATION_SPECIAL_CHIPS.map((c) => (
                <Chip
                  key={c.id}
                  selected={medicine.duration_special === c.id}
                  onClick={() => applyDurationSpecial(c.id)}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Active:</span>{" "}
              {getDurationDisplaySummary(medicine)}
            </p>
          </div>

          {/* Route + conditional body site (Topical / Other only) */}
          <div className="space-y-3 border-t border-border/60 pt-3">
            <SectionLabel>Route</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {ROUTE_OPTIONS.map((r) => (
                <Chip
                  key={r.id}
                  selected={medicine.route_id === r.id}
                  onClick={() => applyRoute(r.id)}
                >
                  {r.label}
                </Chip>
              ))}
            </div>
            {showBodySite && (
              <div className="space-y-2 border-t border-border/50 pt-3">
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    Body Site <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Search or type when route is Other
                  </p>
                </div>
                <Input
                  type="text"
                  placeholder="Enter body part (e.g. left eye, nasal cavity)"
                  value={medicine.route_body_site ?? ""}
                  onChange={(e) =>
                    setMedicine({ route_body_site: e.target.value })
                  }
                  className="h-10 rounded-lg text-sm"
                  aria-label="Body site"
                />
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                    Suggestions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {bodySiteChips.map((label) => (
                      <Chip
                        key={label}
                        selected={(medicine.route_body_site ?? "").trim() === label}
                        className="px-2.5 py-1 text-xs"
                        onClick={() => setMedicine({ route_body_site: label })}
                      >
                        {label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-2 border-t border-border/60 pt-3">
            <SectionLabel>Instructions (optional)</SectionLabel>
            <Textarea
              placeholder="e.g. Take after meals, avoid driving"
              value={medicine.instructions ?? ""}
              onChange={(e) => setMedicine({ instructions: e.target.value })}
              className="min-h-[72px] resize-y rounded-lg text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
