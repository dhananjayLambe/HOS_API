"use client";

import type { EndConsultationReviewData } from "./EndConsultationReviewModal";
import { formatCanonicalCelsiusAsFahrenheitString } from "@/lib/vitals-temperature-display";

interface ClinicalSummarySectionProps {
  data: EndConsultationReviewData;
}

function toDisplayValue(value?: string, suffix = ""): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return suffix ? `${trimmed}${suffix}` : trimmed;
}

function formatVitalsSummary(data: EndConsultationReviewData): string {
  const parts = [
    toDisplayValue(data.vitals.bp) ? `BP: ${toDisplayValue(data.vitals.bp)}` : "",
    toDisplayValue(data.vitals.pulse) ? `Pulse: ${toDisplayValue(data.vitals.pulse)}` : "",
    toDisplayValue(data.vitals.temp)
      ? `Temp: ${formatCanonicalCelsiusAsFahrenheitString(data.vitals.temp)}°F`
      : "",
    toDisplayValue(data.vitals.weight) ? `Wt: ${toDisplayValue(data.vitals.weight, "kg")}` : "",
    toDisplayValue(data.vitals.height) ? `Ht: ${toDisplayValue(data.vitals.height, "cm")}` : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : "Vitals not recorded";
}

export function ClinicalSummarySection({ data }: ClinicalSummarySectionProps) {
  const diagnosisVisible = data.diagnosis.slice(0, 3);
  const medicinesVisible = data.medicines;
  const moreMedicinesCount = Math.max(0, data.medicines.length - 5);

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-sm font-semibold">
          {data.patient.name} {" | "} {data.patient.age}
          {data.patient.gender !== "-" ? data.patient.gender : ""}
        </p>
        <p className="text-xs text-muted-foreground">{formatVitalsSummary(data)}</p>
      </div>

      <section className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnosis</p>
        {diagnosisVisible.length > 0 ? (
          <ul className="list-disc space-y-0.5 pl-5 text-sm leading-tight">
            {diagnosisVisible.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-amber-600">No diagnosis added</p>
        )}
      </section>

      <section className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rx Summary</p>
        <div className="rounded-md border border-border/60 bg-background px-2 py-1.5 shadow-sm">
          <div className="grid grid-cols-[1fr_160px_120px] gap-3 border-b border-border pb-1 text-xs font-semibold text-foreground/80">
            <span>Medicine</span>
            <span>Dose</span>
            <span>Duration</span>
          </div>
          <div className="max-h-36 overflow-y-auto pt-1">
            {medicinesVisible.length > 0 ? (
              medicinesVisible.map((medicine, index) => (
                <div
                  key={`${medicine.name}-${index}`}
                  className="grid grid-cols-[1fr_160px_120px] gap-3 border-b border-border/40 py-1 text-sm last:border-b-0"
                >
                  <span>{medicine.name}</span>
                  <span className={medicine.dose_display ? "" : "text-amber-600 font-medium"}>
                    {medicine.dose_display || "Dose missing"}
                  </span>
                  <span className="text-muted-foreground">{medicine.duration_display || "-"}</span>
                </div>
              ))
            ) : (
              <p className="py-1 text-xs text-muted-foreground">No medicines added</p>
            )}
          </div>
        </div>
        {moreMedicinesCount > 0 ? (
          <p className="mt-1 pl-3 text-[10px] leading-tight text-muted-foreground">
            +{moreMedicinesCount} more medicines (scroll to view)
          </p>
        ) : null}
      </section>

      {data.tests.length > 0 ? (
        <section className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tests</p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs leading-tight">
            {data.tests.map((test, index) => (
              <li key={`${test}-${index}`}>{test}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow-up</p>
        <p className="text-sm">{data.follow_up.trim() || "As advised"}</p>
      </section>
    </div>
  );
}
