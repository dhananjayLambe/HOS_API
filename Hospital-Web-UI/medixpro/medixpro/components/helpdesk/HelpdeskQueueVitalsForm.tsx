"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HelpdeskVitalsPayload } from "@/lib/helpdeskQueueStore";
import { hasMeaningfulVitals } from "@/lib/helpdeskQueueStore";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

const BP_SYSTOLIC_MIN = 50;
const BP_SYSTOLIC_MAX = 300;
const BP_DIASTOLIC_MIN = 30;
const BP_DIASTOLIC_MAX = 200;
const WEIGHT_MIN_KG = 0.1;
const WEIGHT_MAX_KG = 500;
const HEIGHT_MIN_FT = 1.0;
const HEIGHT_MAX_FT = 8.2;
const TEMP_MIN_F = 90;
const TEMP_MAX_F = 115;
const CHILD_AGE_THRESHOLD = 12;

function parseNum(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export interface HelpdeskQueueVitalsFormProps {
  patientName: string;
  ageGenderLine?: string;
  visitLabel?: string | null;
  initial: HelpdeskVitalsPayload | null;
  onSave: (payload: HelpdeskVitalsPayload) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function HelpdeskQueueVitalsForm({
  patientName,
  ageGenderLine,
  visitLabel,
  initial,
  onSave,
  onCancel,
  isSubmitting = false,
}: HelpdeskQueueVitalsFormProps) {
  const [sys, setSys] = useState(initial?.bp_systolic != null ? String(initial.bp_systolic) : "");
  const [dia, setDia] = useState(initial?.bp_diastolic != null ? String(initial.bp_diastolic) : "");
  const [weight, setWeight] = useState(initial?.weight != null ? String(initial.weight) : "");
  const [height, setHeight] = useState(initial?.height != null ? String(initial.height) : "");
  const [temp, setTemp] = useState(initial?.temperature != null ? String(initial.temperature) : "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const hasExisting = useMemo(() => hasMeaningfulVitals(initial), [initial]);
  const parsedAgeYears = useMemo(() => {
    if (!ageGenderLine) return undefined;
    const m = /(\d+)\s*y/i.exec(ageGenderLine);
    return m ? Number(m[1]) : undefined;
  }, [ageGenderLine]);
  const showChildHeightNote = parsedAgeYears != null && parsedAgeYears < CHILD_AGE_THRESHOLD;

  const initialKey = useMemo(
    () =>
      [initial?.bp_systolic, initial?.bp_diastolic, initial?.weight, initial?.height, initial?.temperature]
        .map((v) => (v == null ? "" : String(v)))
        .join("|"),
    [initial]
  );

  /** Re-sync when opening the dialog for the same row after a save, or when server data loads. */
  useEffect(() => {
    setSys(initial?.bp_systolic != null ? String(initial.bp_systolic) : "");
    setDia(initial?.bp_diastolic != null ? String(initial.bp_diastolic) : "");
    setWeight(initial?.weight != null ? String(initial.weight) : "");
    setHeight(initial?.height != null ? String(initial.height) : "");
    setTemp(initial?.temperature != null ? String(initial.temperature) : "");
    setFieldErrors({});
    setTouched({});
  }, [initialKey]);

  const computeLiveErrors = useCallback(
    (next: { sys: string; dia: string; weight: string; height: string; temp: string }) => {
      const errors: Record<string, string> = {};
      const s = parseNum(next.sys);
      const d = parseNum(next.dia);
      const w = parseNum(next.weight);
      const h = parseNum(next.height);
      const t = parseNum(next.temp);
      const hasSys = next.sys.trim() !== "";
      const hasDia = next.dia.trim() !== "";

      if (hasSys && Number.isNaN(s!)) errors.bp_systolic = "Numbers only";
      if (hasDia && Number.isNaN(d!)) errors.bp_diastolic = "Numbers only";

      if (hasSys && !Number.isNaN(s!)) {
        if (s! < BP_SYSTOLIC_MIN || s! > BP_SYSTOLIC_MAX) {
          errors.bp_systolic = `Allowed range: ${BP_SYSTOLIC_MIN}-${BP_SYSTOLIC_MAX} mmHg`;
        }
      }
      if (hasDia && !Number.isNaN(d!)) {
        if (d! < BP_DIASTOLIC_MIN || d! > BP_DIASTOLIC_MAX) {
          errors.bp_diastolic = `Allowed range: ${BP_DIASTOLIC_MIN}-${BP_DIASTOLIC_MAX} mmHg`;
        }
      }
      if (hasSys && hasDia && !Number.isNaN(s!) && !Number.isNaN(d!)) {
        if (!errors.bp_systolic && !errors.bp_diastolic && d! >= s!) {
          errors.bp_diastolic = "Diastolic must be lower than systolic";
        }
      }

      if (next.weight.trim() !== "") {
        if (Number.isNaN(w!)) errors.weight = "Numbers only";
        else if (w! < WEIGHT_MIN_KG || w! > WEIGHT_MAX_KG)
          errors.weight = `Allowed range: ${WEIGHT_MIN_KG}-${WEIGHT_MAX_KG} kg`;
      }
      if (next.height.trim() !== "") {
        if (Number.isNaN(h!)) errors.height = "Numbers only";
        else if (h! < HEIGHT_MIN_FT || h! > HEIGHT_MAX_FT)
          errors.height = `Allowed range: ${HEIGHT_MIN_FT}-${HEIGHT_MAX_FT} ft`;
      }
      if (next.temp.trim() !== "") {
        if (Number.isNaN(t!)) errors.temperature = "Numbers only";
        else if (t! < TEMP_MIN_F || t! > TEMP_MAX_F) errors.temperature = `Allowed range: ${TEMP_MIN_F}-${TEMP_MAX_F} °F`;
      }
      return errors;
    },
    []
  );

  const handleLiveChange =
    (field: "sys" | "dia" | "weight" | "height" | "temp", setter: (v: string) => void) =>
    (value: string) => {
      setter(value);
      const next = { sys, dia, weight, height, temp, [field]: value };
      const live = computeLiveErrors(next);
      setFieldErrors((prev) => {
        const out = { ...prev };
        delete out._form;
        if (live.bp_systolic) out.bp_systolic = live.bp_systolic;
        else delete out.bp_systolic;
        if (live.bp_diastolic) out.bp_diastolic = live.bp_diastolic;
        else delete out.bp_diastolic;
        if (live.weight) out.weight = live.weight;
        else delete out.weight;
        if (live.height) out.height = live.height;
        else delete out.height;
        if (live.temperature) out.temperature = live.temperature;
        else delete out.temperature;
        return out;
      });
    };

  const markTouched = (name: "bp_systolic" | "bp_diastolic" | "weight" | "height" | "temperature") => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const validate = useCallback((): HelpdeskVitalsPayload | null => {
    const errors: Record<string, string> = {};
    const s = parseNum(sys);
    const d = parseNum(dia);
    const hasSys = sys.trim() !== "";
    const hasDia = dia.trim() !== "";
    if (hasSys !== hasDia) {
      if (!hasSys) errors.bp_systolic = "Enter both systolic and diastolic";
      if (!hasDia) errors.bp_diastolic = "Enter both systolic and diastolic";
    } else if (hasSys && hasDia) {
      if (Number.isNaN(s) || Number.isNaN(d)) {
        errors.bp_systolic = "Numbers only";
        errors.bp_diastolic = "Numbers only";
      } else {
        if (s! < BP_SYSTOLIC_MIN || s! > BP_SYSTOLIC_MAX) {
          errors.bp_systolic = `Allowed range: ${BP_SYSTOLIC_MIN}-${BP_SYSTOLIC_MAX} mmHg`;
        }
        if (d! < BP_DIASTOLIC_MIN || d! > BP_DIASTOLIC_MAX) {
          errors.bp_diastolic = `Allowed range: ${BP_DIASTOLIC_MIN}-${BP_DIASTOLIC_MAX} mmHg`;
        }
        if (!errors.bp_systolic && !errors.bp_diastolic && d! >= s!) {
          errors.bp_diastolic = "Diastolic must be lower than systolic";
        }
      }
    }

    const w = parseNum(weight);
    const h = parseNum(height);
    const t = parseNum(temp);
    if (weight.trim() !== "" && Number.isNaN(w!)) errors.weight = "Numbers only";
    else if (w != null && (w < WEIGHT_MIN_KG || w > WEIGHT_MAX_KG))
      errors.weight = `Allowed range: ${WEIGHT_MIN_KG}-${WEIGHT_MAX_KG} kg`;
    if (height.trim() !== "" && Number.isNaN(h!)) errors.height = "Numbers only";
    else if (h != null && (h < HEIGHT_MIN_FT || h > HEIGHT_MAX_FT))
      errors.height = `Allowed range: ${HEIGHT_MIN_FT}-${HEIGHT_MAX_FT} ft`;
    if (temp.trim() !== "" && Number.isNaN(t!)) errors.temperature = "Numbers only";
    else if (t != null && (t < TEMP_MIN_F || t > TEMP_MAX_F))
      errors.temperature = `Allowed range: ${TEMP_MIN_F}-${TEMP_MAX_F} °F`;

    setFieldErrors(errors);
    if (Object.keys(errors).length) return null;

    const payload: HelpdeskVitalsPayload = {};
    if (s != null && d != null) {
      payload.bp_systolic = s;
      payload.bp_diastolic = d;
    }
    if (w != null) payload.weight = w;
    if (h != null) payload.height = h;
    if (t != null) payload.temperature = t;

    if (Object.keys(payload).length === 0) {
      setFieldErrors({ _form: "Enter at least one vital to save or update." });
      return null;
    }

    return payload;
  }, [sys, dia, weight, height, temp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      bp_systolic: true,
      bp_diastolic: true,
      weight: true,
      height: true,
      temperature: true,
    });
    const payload = validate();
    if (!payload) return;
    await onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1 border-b border-border/60 pb-3">
        <p className="text-base font-semibold text-foreground">{patientName}</p>
        {ageGenderLine ? <p className="text-sm text-muted-foreground">{ageGenderLine}</p> : null}
        {visitLabel ? (
          <p className="font-mono text-xs text-muted-foreground tabular-nums">Visit {visitLabel}</p>
        ) : null}
      </div>

      {fieldErrors._form ? (
        <p className="text-sm text-destructive" role="alert">
          {fieldErrors._form}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bp-sys" className="text-xs font-medium">
            BP systolic (mmHg)
          </Label>
          <Input
            id="bp-sys"
            value={sys}
            onChange={(e) => handleLiveChange("sys", setSys)(e.target.value)}
            onBlur={() => markTouched("bp_systolic")}
            inputMode="numeric"
            autoComplete="off"
            className={cn(
              "h-11 text-base",
              touched.bp_systolic &&
                fieldErrors.bp_systolic &&
                "border-destructive bg-destructive/5 focus-visible:ring-destructive/40"
            )}
            aria-invalid={!!fieldErrors.bp_systolic}
          />
          {touched.bp_systolic && fieldErrors.bp_systolic ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.bp_systolic}</p>
          ) : null}
          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Allowed range: 50-300 mmHg</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-dia" className="text-xs font-medium">
            BP diastolic (mmHg)
          </Label>
          <Input
            id="bp-dia"
            value={dia}
            onChange={(e) => handleLiveChange("dia", setDia)(e.target.value)}
            onBlur={() => markTouched("bp_diastolic")}
            inputMode="numeric"
            autoComplete="off"
            className={cn(
              "h-11 text-base",
              touched.bp_diastolic &&
                fieldErrors.bp_diastolic &&
                "border-destructive bg-destructive/5 focus-visible:ring-destructive/40"
            )}
            aria-invalid={!!fieldErrors.bp_diastolic}
          />
          {touched.bp_diastolic && fieldErrors.bp_diastolic ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.bp_diastolic}</p>
          ) : null}
          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Allowed range: 30-200 mmHg</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="weight" className="text-xs font-medium">
            Weight (kg)
          </Label>
          <Input
            id="weight"
            value={weight}
            onChange={(e) => handleLiveChange("weight", setWeight)(e.target.value)}
            onBlur={() => markTouched("weight")}
            inputMode="decimal"
            autoComplete="off"
            className={cn(
              "h-11 text-base",
              touched.weight && fieldErrors.weight && "border-destructive bg-destructive/5 focus-visible:ring-destructive/40"
            )}
            aria-invalid={!!fieldErrors.weight}
          />
          {touched.weight && fieldErrors.weight ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.weight}</p>
          ) : null}
          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Allowed range: 0.1-500 kg</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="height" className="text-xs font-medium">
            Height (ft)
          </Label>
          <Input
            id="height"
            value={height}
            onChange={(e) => handleLiveChange("height", setHeight)(e.target.value)}
            onBlur={() => markTouched("height")}
            inputMode="decimal"
            autoComplete="off"
            className={cn(
              "h-11 text-base",
              touched.height && fieldErrors.height && "border-destructive bg-destructive/5 focus-visible:ring-destructive/40"
            )}
            aria-invalid={!!fieldErrors.height}
          />
          {touched.height && fieldErrors.height ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.height}</p>
          ) : null}
          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Allowed range: 1.0-8.2 ft</p>
          {showChildHeightNote ? (
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
              Child height note (&lt;12y): usually around 2.5-5.5 ft.
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="temp" className="text-xs font-medium">
          Temperature (optional, °F)
        </Label>
        <Input
          id="temp"
          value={temp}
          onChange={(e) => handleLiveChange("temp", setTemp)(e.target.value)}
          onBlur={() => markTouched("temperature")}
          inputMode="decimal"
          autoComplete="off"
          className={cn(
            "h-11 text-base",
            touched.temperature &&
              fieldErrors.temperature &&
              "border-destructive bg-destructive/5 focus-visible:ring-destructive/40"
          )}
          aria-invalid={!!fieldErrors.temperature}
        />
        {touched.temperature && fieldErrors.temperature ? (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.temperature}</p>
        ) : null}
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Allowed range: 90-115 °F</p>
      </div>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <Button type="submit" className="w-full sm:flex-1" disabled={isSubmitting}>
          {hasExisting ? "Update" : "Save"}
        </Button>
        <Button type="button" variant="outline" className="w-full sm:flex-1" disabled={isSubmitting} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
