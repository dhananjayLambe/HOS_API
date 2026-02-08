"use client";

import { History, Activity, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
    setMedicalHistory,
    setVitals,
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

      {/* Medical History */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center gap-2 py-4 pb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-bold text-sm">Medical History</h3>
        </CardHeader>
        <CardContent className="pt-0 pb-5">
          <Textarea
            placeholder="Patient medical history (e.g. allergies, chronic conditions). Loaded from patient record when available."
            value={medicalHistory}
            onChange={(e) => setMedicalHistory(e.target.value)}
            className="min-h-[100px] resize-y rounded-md text-sm"
          />
        </CardContent>
      </Card>

      {/* Vitals */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center gap-2 py-4 pb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-bold text-sm">Vitals</h3>
        </CardHeader>
        <CardContent className="pt-0 pb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Weight (kg)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="kg"
                value={vitals.weightKg ?? ""}
                onChange={(e) => setVitals({ weightKg: e.target.value })}
                className="rounded-md h-10 min-h-10 touch-manipulation sm:h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Height (cm)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="cm"
                value={vitals.heightCm ?? ""}
                onChange={(e) => setVitals({ heightCm: e.target.value })}
                className="rounded-md h-10 min-h-10 touch-manipulation sm:h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">BMI (kg/m²)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="kg/m²"
                value={vitals.bmi ?? ""}
                onChange={(e) => setVitals({ bmi: e.target.value })}
                className="rounded-md h-10 min-h-10 touch-manipulation sm:h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Temperature (°F)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="°F"
                value={vitals.temperatureF ?? ""}
                onChange={(e) => setVitals({ temperatureF: e.target.value })}
                className="rounded-md h-10 min-h-10 touch-manipulation sm:h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
