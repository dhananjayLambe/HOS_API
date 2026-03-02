"use client";

import { History, Activity, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConsultationStore } from "@/store/consultationStore";

/**
 * Left menu: Doctor Notes, Medical History, Vitals.
 * State in store for backend compatibility later.
 */
export function ConsultationRightMenu() {
  const {
    medicalHistory,
    vitals,
    doctorNotes,
    setDoctorNotes,
  } = useConsultationStore();

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
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center gap-2 py-4 pb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-bold text-sm">Vitals</h3>
        </CardHeader>
        <CardContent className="pt-0 pb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Weight (kg)</Label>
              <div className="rounded-md h-10 min-h-10 flex items-center px-3 bg-muted/50 border border-border/80 text-sm text-foreground cursor-default" aria-readonly="true">
                {vitals.weightKg ?? <span className="text-muted-foreground">—</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Height (cm)</Label>
              <div className="rounded-md h-10 min-h-10 flex items-center px-3 bg-muted/50 border border-border/80 text-sm text-foreground cursor-default" aria-readonly="true">
                {vitals.heightCm ?? <span className="text-muted-foreground">—</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">BMI (kg/m²)</Label>
              <div className="rounded-md h-10 min-h-10 flex items-center px-3 bg-muted/50 border border-border/80 text-sm text-foreground cursor-default" aria-readonly="true">
                {vitals.bmi ?? <span className="text-muted-foreground">—</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Temperature (°F)</Label>
              <div className="rounded-md h-10 min-h-10 flex items-center px-3 bg-muted/50 border border-border/80 text-sm text-foreground cursor-default" aria-readonly="true">
                {vitals.temperatureF ?? <span className="text-muted-foreground">—</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
