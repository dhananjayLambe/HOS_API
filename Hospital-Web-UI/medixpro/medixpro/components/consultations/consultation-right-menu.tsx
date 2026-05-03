"use client";

import { useState } from "react";
import { History, Activity, Stethoscope, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConsultationSectionScroll } from "@/components/consultations/consultation-section-scroll-context";
import { useConsultationStore } from "@/store/consultationStore";
import { cn } from "@/lib/utils";
import { isUuidLike, loadPreConsultPreviewVitals } from "@/lib/loadPreConsultPreviewVitals";
import { formatCanonicalCelsiusAsFahrenheitString } from "@/lib/vitals-temperature-display";
import { useToastNotification } from "@/hooks/use-toast-notification";

/**
 * Left menu: Doctor Notes, Medical History, Vitals.
 * State in store for backend compatibility later.
 */
export function ConsultationRightMenu() {
  const {
    medicalHistory,
    vitals,
    doctorNotes,
    vitalsLoaded,
    setDoctorNotes,
    sectionValidationSoftWarnings,
    encounterId,
  } = useConsultationStore();
  const { registerSectionRef } = useConsultationSectionScroll();
  const notify = useToastNotification();
  const [vitalsRefreshBusy, setVitalsRefreshBusy] = useState(false);

  const handleRefreshVitalsFromServer = async () => {
    if (!encounterId || !isUuidLike(encounterId)) return;
    setVitalsRefreshBusy(true);
    try {
      await loadPreConsultPreviewVitals(encounterId, {
        onSoftError: (msg) => notify.error(msg),
      });
      notify.info("Vitals updated from server.");
    } finally {
      setVitalsRefreshBusy(false);
    }
  };

  const renderValue = (value: unknown) => {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
    // Simple, compact placeholder when no data is available
    return <span className="text-muted-foreground">-</span>;
  };

  /** Format height (stored in cm) as feet for display. */
  const renderHeightFeet = (value: unknown) => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return <span className="text-muted-foreground">-</span>;
    }
    const numCm = Number(value);
    if (!Number.isNaN(numCm)) {
      const feet = numCm / 30.48;
      return feet.toFixed(2);
    }
    return String(value);
  };

  /** Store holds canonical °C from pre-consult preview; consultation UI shows °F. */
  const renderTemperature = (value: unknown) => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return <span className="text-muted-foreground">-</span>;
    }
    const fStr = formatCanonicalCelsiusAsFahrenheitString(value);
    if (fStr !== "") return fStr;
    return String(value);
  };

  /** BMI category (WHO ranges). */
  const getBmiCategory = (bmi: number): { label: string; className: string } => {
    if (bmi < 18.5) return { label: "Underweight", className: "text-blue-600 dark:text-blue-400" };
    if (bmi <= 24.9) return { label: "Normal", className: "text-green-600 dark:text-green-400" };
    if (bmi <= 29.9) return { label: "Overweight", className: "text-amber-600 dark:text-amber-400" };
    return { label: "Obese", className: "text-red-600 dark:text-red-400" };
  };

  /** Display BMI value with category (Underweight / Normal / Overweight / Obese). */
  const renderBmi = (value: unknown) => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return <span className="text-muted-foreground">-</span>;
    }
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    const category = getBmiCategory(num);
    return (
      <span className="flex flex-wrap items-baseline gap-1.5">
        <span>{num.toFixed(2)}</span>
        <span className={`text-xs font-medium ${category.className}`}>{category.label}</span>
      </span>
    );
  };

  const allVitalsEmpty =
    (!vitals.weightKg || vitals.weightKg === "") &&
    (!vitals.heightCm || vitals.heightCm === "") &&
    (!vitals.bmi || vitals.bmi === "") &&
    (!vitals.temperatureF || vitals.temperatureF === "");

  const missingForBmi =
    !vitals.bmi &&
    (vitals.heightCm || vitals.weightKg)
      ? !vitals.heightCm
        ? "height"
        : !vitals.weightKg
          ? "weight"
          : null
      : null;

  return (
    <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-4 sm:gap-6 self-start pb-4">
      {/* Doctor Notes — placed first so always visible without scrolling */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md shrink-0">
        <CardHeader className="flex flex-row items-center gap-2 py-4 pb-3">
          <Stethoscope className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-bold text-sm">Doctor Notes</h3>
        </CardHeader>
        <CardContent className="pt-0 pb-5">
          <Textarea
            placeholder="Internal notes (not printed on prescription)."
            value={doctorNotes ?? ""}
            onChange={(e) => setDoctorNotes(e.target.value)}
            className="min-h-[100px] w-full resize-y rounded-md border border-input text-sm"
          />
        </CardContent>
      </Card>

      {/* Medical History — read-only; data loaded from backend later */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center gap-2 py-4 pb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-bold text-sm">Medical History</h3>
        </CardHeader>
        <CardContent className="pt-0 pb-5">
          <div
            className="min-h-[100px] w-full rounded-md border border-border/80 bg-muted/50 px-3 py-2.5 text-sm text-foreground cursor-default"
            aria-readonly="true"
          >
            {medicalHistory?.trim() ? medicalHistory : <span className="text-muted-foreground">No medical history loaded yet.</span>}
          </div>
        </CardContent>
      </Card>

      {/* Vitals — read-only; data loaded from backend later */}
      <div
        id="consultation-vitals-anchor"
        ref={(el) => registerSectionRef("vitals", el)}
        className="scroll-mt-24"
      >
      <Card
        className={cn(
          "rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md",
          sectionValidationSoftWarnings.vitals &&
            "border-amber-500/50 bg-amber-500/[0.04] dark:bg-amber-500/10"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2 py-4 pb-3">
          <div className="flex flex-row items-center gap-2 min-w-0">
            <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
            <h3 className="font-bold text-sm">Vitals</h3>
          </div>
          {encounterId && isUuidLike(encounterId) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs"
              disabled={vitalsRefreshBusy}
              onClick={() => void handleRefreshVitalsFromServer()}
              aria-label="Refresh vitals from server"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", vitalsRefreshBusy && "animate-spin")} />
              Refresh
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0 pb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Weight (kg)</Label>
              <div className="rounded-md h-10 min-h-10 flex items-center px-3 bg-muted/50 border border-border/80 text-sm text-foreground cursor-default" aria-readonly="true">
                {renderValue(vitals.weightKg)}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Height (ft)</Label>
              <div className="rounded-md h-10 min-h-10 flex items-center px-3 bg-muted/50 border border-border/80 text-sm text-foreground cursor-default" aria-readonly="true">
                {renderHeightFeet(vitals.heightCm)}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">BMI (kg/m²)</Label>
              <div className="rounded-md min-h-10 flex items-center px-3 py-2 bg-muted/50 border border-border/80 text-sm text-foreground cursor-default" aria-readonly="true">
                {renderBmi(vitals.bmi)}
              </div>
              {vitalsLoaded && missingForBmi && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  BMI cannot be calculated due to missing {missingForBmi}.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Temperature (°F)</Label>
              <div className="rounded-md h-10 min-h-10 flex items-center px-3 bg-muted/50 border border-border/80 text-sm text-foreground cursor-default" aria-readonly="true">
                {renderTemperature(vitals.temperatureF)}
              </div>
            </div>
          </div>
          {vitalsLoaded && allVitalsEmpty && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-900">
                Vitals not recorded in pre-consultation. Please ask helpdesk to complete vitals before proceeding.
              </p>
            </div>
          )}
          {sectionValidationSoftWarnings.vitals && (
            <div className="mt-2 rounded-lg border border-amber-300/80 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-950 dark:text-amber-100">
                {sectionValidationSoftWarnings.vitals}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
