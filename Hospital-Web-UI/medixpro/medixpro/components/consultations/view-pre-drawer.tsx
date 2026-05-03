"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { backendAxiosClient } from "@/lib/axiosClient";
import { Loader2 } from "lucide-react";
import { formatCanonicalCelsiusAsFahrenheitString } from "@/lib/vitals-temperature-display";

function isUuidLike(value: string) {
  // Accepts canonical UUID v1-v5 and generic UUID shape
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

const SECTION_LABELS: Record<string, string> = {
  chief_complaint: "Chief Complaint",
  vitals: "Vitals",
  allergies: "Allergies",
  medical_history: "Medical History",
};

const CLINICAL_ORDER: string[] = ["chief_complaint", "vitals", "allergies", "medical_history"];

interface ViewPreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
}

type PreviewPayload = Record<string, unknown> & {
  message?: string;
  meta?: {
    entry_mode?: string | null;
    filled_by?: string | null;
    last_updated?: string | null;
  };
};

export function ViewPreDrawer({ open, onOpenChange, encounterId }: ViewPreDrawerProps) {
  const [previewData, setPreviewData] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    if (!open || !encounterId) return;
    if (!isUuidLike(encounterId)) {
      setError("Invalid encounter id. Please reopen the visit and try again.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNoData(false);
    setPreviewData(null);

    backendAxiosClient
      .get<PreviewPayload>("/consultations/pre-consultation/preview/", {
        params: { encounter_id: encounterId },
      })
      .then((res) => {
        if (cancelled) return;
        const data = res.data || {};
        if (data.message === "NO_PRECONSULT_DATA") {
          setNoData(true);
          setPreviewData(null);
        } else {
          setPreviewData(data);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load pre-consultation preview.";
        setError(String(msg));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, encounterId]);

  const orderedSectionEntries = useMemo(() => {
    if (!previewData) return [] as [string, unknown][];
    const entries: [string, unknown][] = [];

    // First, the known clinical order
    for (const key of CLINICAL_ORDER) {
      if (key in previewData) {
        entries.push([key, previewData[key]]);
      }
    }

    // Then any other keys returned by backend (custom fields) in stable order
    Object.keys(previewData)
      .filter(
        (key) =>
          key !== "message" &&
          key !== "meta" &&
          !CLINICAL_ORDER.includes(key),
      )
      .forEach((key) => {
        entries.push([key, previewData[key]]);
      });

    return entries;
  }, [previewData]);

  const abnormalVitals = useMemo(() => {
    const v = previewData?.vitals;
    if (!v || typeof v !== "object") return null;
    const data = v as Record<string, any>;

    const pulse = typeof data.pulse?.pulse_rate === "number" ? data.pulse.pulse_rate : null;
    const temperature =
      typeof data.temperature?.temperature === "number" ? data.temperature.temperature : null;
    const systolic =
      typeof data.blood_pressure?.systolic === "number" ? data.blood_pressure.systolic : null;
    const diastolic =
      typeof data.blood_pressure?.diastolic === "number" ? data.blood_pressure.diastolic : null;

    const pulseAbnormal = pulse !== null && (pulse < 40 || pulse > 120);
    const tempAbnormal = temperature !== null && temperature > 38.3; // ~101°F
    const bpAbnormal =
      (systolic !== null && (systolic < 90 || systolic > 140)) ||
      (diastolic !== null && (diastolic < 60 || diastolic > 90));

    if (!(pulseAbnormal || tempAbnormal || bpAbnormal)) return null;
    return {
      pulseAbnormal,
      tempAbnormal,
      bpAbnormal,
    };
  }, [previewData]);

  const renderChiefComplaint = (value: unknown) => {
    // Support both legacy array shape and new template-driven object shape
    if (Array.isArray(value)) {
      const items = value;
      if (!items.length) return null;
      return (
        <ul className="list-disc list-inside space-y-1 text-sm">
          {items.map((item, idx) => {
            if (!item || typeof item !== "object") return null;
            const obj = item as Record<string, unknown>;
            const name = typeof obj.name === "string" ? obj.name : "";
            const duration = typeof obj.duration === "string" ? obj.duration : "";
            const description = typeof obj.description === "string" ? obj.description : "";

            const line =
              duration && name ? `${name} – ${duration}` : name || duration || description || null;
            if (!line) return null;

            return (
              <li key={idx} className="text-foreground">
                {line}
              </li>
            );
          })}
        </ul>
      );
    }

    if (!value || typeof value !== "object") return null;
    const data = value as Record<string, any>;

    const primaryText: string | null =
      typeof data.primary_complaint?.complaint_text === "string"
        ? data.primary_complaint.complaint_text
        : null;

    const durationValue = data.duration?.duration_value;
    const durationUnit =
      typeof data.duration?.duration_unit === "string" ? data.duration.duration_unit : null;
    const durationStr =
      (typeof durationValue === "number" || typeof durationValue === "string") && durationUnit
        ? `${durationValue} ${durationUnit}`
        : typeof durationValue === "number" || typeof durationValue === "string"
          ? String(durationValue)
          : null;

    const associatedSymptoms: string[] | null = Array.isArray(
      data.associated_symptoms?.symptoms,
    )
      ? (data.associated_symptoms.symptoms as string[])
      : null;

    if (!primaryText && !durationStr && !(associatedSymptoms && associatedSymptoms.length)) {
      return null;
    }

    return (
      <div className="space-y-2 text-sm">
        {primaryText && <p className="text-foreground">{primaryText}</p>}
        {durationStr && (
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Duration:</span> {durationStr}
          </p>
        )}
        {associatedSymptoms && associatedSymptoms.length > 0 && (
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Associated:</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              {associatedSymptoms.map((symptom, idx) => (
                <li key={idx}>{symptom}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderVitals = (value: unknown) => {
    if (!value || typeof value !== "object") return null;
    const v = value as Record<string, any>;

    const rows: { label: string; value: string; abnormal?: boolean }[] = [];

    const pulse = v.pulse?.pulse_rate;
    if (pulse !== null && pulse !== undefined && pulse !== "") {
      const num = Number(pulse);
      rows.push({
        label: "Pulse",
        value: `${pulse} /min`,
        abnormal: !Number.isNaN(num) && (num < 40 || num > 120),
      });
    }

    const temp = v.temperature?.temperature;
    if (temp !== null && temp !== undefined && temp !== "") {
      const num = Number(temp);
      const fDisplay = formatCanonicalCelsiusAsFahrenheitString(temp);
      rows.push({
        label: "Temperature",
        value: fDisplay !== "" ? `${fDisplay} °F` : `${temp} °F`,
        abnormal: !Number.isNaN(num) && num > 38.3,
      });
    }

    const sys = v.blood_pressure?.systolic;
    const dia = v.blood_pressure?.diastolic;
    if (
      (sys !== null && sys !== undefined && sys !== "") ||
      (dia !== null && dia !== undefined && dia !== "")
    ) {
      const sNum = Number(sys);
      const dNum = Number(dia);
      const value =
        sys !== null && sys !== undefined && dia !== null && dia !== undefined
          ? `${sys} / ${dia} mmHg`
          : sys !== null && sys !== undefined
            ? `${sys} mmHg (systolic)`
            : `${dia} mmHg (diastolic)`;
      rows.push({
        label: "Blood Pressure",
        value,
        abnormal:
          (!Number.isNaN(sNum) && (sNum < 90 || sNum > 140)) ||
          (!Number.isNaN(dNum) && (dNum < 60 || dNum > 90)),
      });
    }

    const height = v.height_weight?.height;
    if (height !== null && height !== undefined && height !== "") {
      rows.push({
        label: "Height",
        value: `${height} cm`,
      });
    }

    const weight = v.height_weight?.weight;
    if (weight !== null && weight !== undefined && weight !== "") {
      rows.push({
        label: "Weight",
        value: `${weight} kg`,
      });
    }

    const spo2 = v.spo2?.spo2_percent;
    if (spo2 !== null && spo2 !== undefined && spo2 !== "") {
      rows.push({
        label: "SpO₂",
        value: `${spo2} %`,
      });
    }

    const rr = v.respiratory_rate?.resp_rate;
    if (rr !== null && rr !== undefined && rr !== "") {
      rows.push({
        label: "Respiratory Rate",
        value: `${rr} /min`,
      });
    }

    const waist = v.waist_circumference?.waist;
    if (waist !== null && waist !== undefined && waist !== "") {
      rows.push({
        label: "Waist Circumference",
        value: `${waist} cm`,
      });
    }

    const painScore = v.pain_score?.pain_score;
    if (painScore !== null && painScore !== undefined && painScore !== "") {
      rows.push({
        label: "Pain Score",
        value: String(painScore),
      });
    }

    if (!rows.length) return null;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline gap-1.5">
            <span className="font-semibold text-foreground">{row.label}:</span>
            <span
              className={
                row.abnormal
                  ? "text-red-600 font-semibold"
                  : "text-muted-foreground font-normal"
              }
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderListSection = (value: unknown) => {
    const items = Array.isArray(value) ? value : [];
    if (!items.length) return null;

    return (
      <ul className="list-disc list-inside space-y-1 text-sm">
        {items.map((item, idx) => {
          if (item == null) return null;
          if (typeof item === "string" || typeof item === "number") {
            return (
              <li key={idx} className="text-foreground">
                {String(item)}
              </li>
            );
          }
          if (typeof item === "object") {
            const obj = item as Record<string, unknown>;
            const text =
              (typeof obj.label === "string" && obj.label) ||
              (typeof obj.name === "string" && obj.name) ||
              (typeof obj.note === "string" && obj.note) ||
              null;
            if (!text) return null;
            return (
              <li key={idx} className="text-foreground">
                {text}
              </li>
            );
          }
          return null;
        })}
      </ul>
    );
  };

  const renderAllergiesFromObject = (value: unknown) => {
    if (!value || typeof value !== "object") return null;
    const data = value as Record<string, any>;

    const type = typeof data.allergy_type?.type === "string" ? data.allergy_type.type : null;
    const allergen =
      typeof data.allergen?.allergen_name === "string" ? data.allergen.allergen_name : null;
    const reactions: string[] | null = Array.isArray(data.reaction?.reaction)
      ? (data.reaction.reaction as string[])
      : null;
    const severity =
      typeof data.severity?.severity === "string" ? data.severity.severity : null;
    const status = typeof data.status?.status === "string" ? data.status.status : null;
    const notes =
      typeof data.additional_notes?.notes === "string" ? data.additional_notes.notes : null;

    const main = [type, allergen].filter(Boolean).join(" – ");
    const metaParts: string[] = [];
    if (reactions && reactions.length) {
      metaParts.push(`Reaction: ${reactions.join(", ")}`);
    }
    if (severity) metaParts.push(`Severity: ${severity}`);
    if (status) metaParts.push(`Status: ${status}`);
    if (notes) metaParts.push(notes);

    const line = [main, metaParts.join(" | ")].filter(Boolean).join(" | ");
    if (!line) return null;

    return (
      <ul className="list-disc list-inside space-y-1 text-sm">
        <li className="text-foreground">{line}</li>
      </ul>
    );
  };

  const renderMedicalHistoryFromObject = (value: unknown) => {
    if (!value || typeof value !== "object") return null;
    const data = value as Record<string, any>;

    const chronicConditions: string[] | null = Array.isArray(
      data.chronic_conditions?.conditions,
    )
      ? (data.chronic_conditions.conditions as string[])
      : null;
    const surgeries =
      typeof data.past_surgeries?.surgery_details === "string"
        ? data.past_surgeries.surgery_details
        : null;
    const medications =
      typeof data.current_medications?.medications === "string"
        ? data.current_medications.medications
        : null;
    const familyHistory: string[] | null = Array.isArray(
      data.family_history?.family_conditions,
    )
      ? (data.family_history.family_conditions as string[])
      : null;
    const events =
      typeof data.past_medical_events?.events === "string"
        ? data.past_medical_events.events
        : null;
    const notes =
      typeof data.additional_notes?.notes === "string" ? data.additional_notes.notes : null;

    const lines: string[] = [];
    if (chronicConditions && chronicConditions.length) {
      lines.push(`Chronic: ${chronicConditions.join(", ")}`);
    }
    if (surgeries) {
      lines.push(`Surgeries: ${surgeries}`);
    }
    if (medications) {
      lines.push(`Medications: ${medications}`);
    }
    if (familyHistory && familyHistory.length) {
      lines.push(`Family: ${familyHistory.join(", ")}`);
    }
    if (events) {
      lines.push(`Events: ${events}`);
    }
    if (notes) {
      lines.push(notes);
    }

    if (!lines.length) return null;

    return (
      <ul className="list-disc list-inside space-y-1 text-sm">
        {lines.map((line, idx) => (
          <li key={idx} className="text-foreground">
            {line}
          </li>
        ))}
      </ul>
    );
  };

  const renderSectionBody = (code: string, value: unknown) => {
    if (code === "chief_complaint") {
      return renderChiefComplaint(value);
    }
    if (code === "vitals") {
      return renderVitals(value);
    }
    if (code === "allergies") {
      if (Array.isArray(value)) {
        return renderListSection(value);
      }
      return renderAllergiesFromObject(value);
    }
    if (code === "medical_history") {
      if (Array.isArray(value)) {
        return renderListSection(value);
      }
      return renderMedicalHistoryFromObject(value);
    }

    // Fallback: JSON view for any custom/unknown sections
    if (!value || typeof value !== "object") return null;
    if (Object.keys(value as Record<string, unknown>).length === 0) return null;

    return (
      <pre className="text-xs bg-muted/40 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto px-3 sm:px-5"
      >
        <SheetHeader>
          <SheetTitle className="text-base sm:text-lg text-foreground">
            Pre-Consultation Preview
          </SheetTitle>
        </SheetHeader>

        {abnormalVitals && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            ⚠ Abnormal vitals detected
          </div>
        )}

        <div className="mt-4 mb-3 text-xs text-muted-foreground">
          View a read-only snapshot of pre-consultation details for this visit.
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && error && (
          <div className="mt-4 rounded-md border border-amber-300/80 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
            {error}
          </div>
        )}

        {!loading && !error && noData && (
          <div className="mt-8 flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center">
              No pre-consultation data available.
            </p>
          </div>
        )}

        {!loading && !error && !noData && orderedSectionEntries.length > 0 && (
          <div className="mt-3 space-y-4 pb-4">
            {orderedSectionEntries.map(([code, value]) => {
              const body = renderSectionBody(code, value);
              if (!body) return null;

              const label = SECTION_LABELS[code] ?? code.replace(/_/g, " ");

              return (
                <section
                  key={code}
                  className="rounded-xl border bg-muted/20 px-3.5 py-3 sm:px-4 sm:py-3.5"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground mb-2">
                    {label}
                  </h3>
                  {body}
                </section>
              );
            })}

            {previewData?.meta && (
              <div className="pt-2 border-t border-border/60 mt-2 text-[11px] text-muted-foreground">
                <p>
                  Pre-consultation filled by:{" "}
                  {previewData.meta.filled_by || previewData.meta.entry_mode || "—"}
                </p>
                {previewData.meta.last_updated && (
                  <p>
                    Last updated:{" "}
                    {new Date(previewData.meta.last_updated).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
