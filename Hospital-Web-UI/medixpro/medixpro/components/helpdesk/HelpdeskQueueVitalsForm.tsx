"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HelpdeskVitalsPayload } from "@/lib/helpdeskQueueStore";
import { hasMeaningfulVitals } from "@/lib/helpdeskQueueStore";
import { useCallback, useMemo, useState } from "react";

function parseNum(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export interface HelpdeskQueueVitalsFormProps {
  patientName: string;
  ageGenderLine?: string;
  visitId?: string | null;
  initial: HelpdeskVitalsPayload | null;
  onSave: (payload: HelpdeskVitalsPayload) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function HelpdeskQueueVitalsForm({
  patientName,
  ageGenderLine,
  visitId,
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

  const hasExisting = useMemo(() => hasMeaningfulVitals(initial), [initial]);

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
      }
    }

    const w = parseNum(weight);
    const h = parseNum(height);
    const t = parseNum(temp);
    if (weight.trim() !== "" && Number.isNaN(w!)) errors.weight = "Numbers only";
    if (height.trim() !== "" && Number.isNaN(h!)) errors.height = "Numbers only";
    if (temp.trim() !== "" && Number.isNaN(t!)) errors.temperature = "Numbers only";

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

    return payload;
  }, [sys, dia, weight, height, temp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = validate();
    if (!payload) return;
    await onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1 border-b border-border/60 pb-3">
        <p className="text-base font-semibold text-foreground">{patientName}</p>
        {ageGenderLine ? <p className="text-sm text-muted-foreground">{ageGenderLine}</p> : null}
        {visitId ? (
          <p className="font-mono text-xs text-muted-foreground tabular-nums">Visit {visitId}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bp-sys" className="text-xs font-medium">
            BP systolic (mmHg)
          </Label>
          <Input
            id="bp-sys"
            value={sys}
            onChange={(e) => setSys(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            className="h-11 text-base"
            aria-invalid={!!fieldErrors.bp_systolic}
          />
          {fieldErrors.bp_systolic ? <p className="text-xs text-destructive">{fieldErrors.bp_systolic}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-dia" className="text-xs font-medium">
            BP diastolic (mmHg)
          </Label>
          <Input
            id="bp-dia"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            className="h-11 text-base"
            aria-invalid={!!fieldErrors.bp_diastolic}
          />
          {fieldErrors.bp_diastolic ? <p className="text-xs text-destructive">{fieldErrors.bp_diastolic}</p> : null}
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
            onChange={(e) => setWeight(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            className="h-11 text-base"
            aria-invalid={!!fieldErrors.weight}
          />
          {fieldErrors.weight ? <p className="text-xs text-destructive">{fieldErrors.weight}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="height" className="text-xs font-medium">
            Height (ft)
          </Label>
          <Input
            id="height"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            className="h-11 text-base"
            aria-invalid={!!fieldErrors.height}
          />
          {fieldErrors.height ? <p className="text-xs text-destructive">{fieldErrors.height}</p> : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="temp" className="text-xs font-medium">
          Temperature (optional, °C)
        </Label>
        <Input
          id="temp"
          value={temp}
          onChange={(e) => setTemp(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          className="h-11 text-base"
          aria-invalid={!!fieldErrors.temperature}
        />
        {fieldErrors.temperature ? <p className="text-xs text-destructive">{fieldErrors.temperature}</p> : null}
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
