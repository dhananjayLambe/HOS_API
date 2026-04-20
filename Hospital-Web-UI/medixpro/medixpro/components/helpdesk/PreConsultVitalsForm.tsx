"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Vitals } from "@/lib/helpdeskQueueStore";
import { emptyVitals } from "@/lib/helpdeskQueueStore";
import { useCallback, useEffect, useRef } from "react";

const fields: { key: keyof Vitals; label: string; placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }[] = [
  { key: "bp", label: "BP", placeholder: "120/80", inputMode: "decimal" },
  { key: "pulse", label: "Pulse", placeholder: "72", inputMode: "numeric" },
  { key: "temp", label: "Temp", placeholder: "98.6", inputMode: "decimal" },
  { key: "weight", label: "Weight (kg)", placeholder: "70", inputMode: "decimal" },
  { key: "height", label: "Height (cm)", placeholder: "170", inputMode: "numeric" },
];

interface PreConsultVitalsFormProps {
  initial?: Partial<Vitals>;
  onSave: (v: Vitals, sendToDoctor: boolean) => void;
  onSkip?: () => void;
  patientName?: string;
}

export function PreConsultVitalsForm({ initial, onSave, onSkip, patientName }: PreConsultVitalsFormProps) {
  const base = { ...emptyVitals(), ...initial };
  const refs = {
    bp: useRef<HTMLInputElement>(null),
    pulse: useRef<HTMLInputElement>(null),
    temp: useRef<HTMLInputElement>(null),
    weight: useRef<HTMLInputElement>(null),
    height: useRef<HTMLInputElement>(null),
    notes: useRef<HTMLTextAreaElement>(null),
  };

  useEffect(() => {
    refs.bp.current?.focus();
  }, []);

  const focusNext = useCallback((current: keyof Vitals) => {
    const order: (keyof Vitals)[] = ["bp", "pulse", "temp", "weight", "height", "notes"];
    const i = order.indexOf(current);
    const next = order[i + 1];
    if (next === "notes") refs.notes.current?.focus();
    else if (next) refs[next as "bp" | "pulse" | "temp" | "weight" | "height"]?.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v: Vitals = {
      bp: String(fd.get("bp") ?? ""),
      pulse: String(fd.get("pulse") ?? ""),
      temp: String(fd.get("temp") ?? ""),
      weight: String(fd.get("weight") ?? ""),
      height: String(fd.get("height") ?? ""),
      notes: String(fd.get("notes") ?? ""),
    };
    onSave(v, true);
  };

  const saveDraft = (sendToDoctor: boolean) => {
    const form = document.getElementById("helpdesk-vitals-form") as HTMLFormElement | null;
    if (!form) return;
    const fd = new FormData(form);
    const v: Vitals = {
      bp: String(fd.get("bp") ?? ""),
      pulse: String(fd.get("pulse") ?? ""),
      temp: String(fd.get("temp") ?? ""),
      weight: String(fd.get("weight") ?? ""),
      height: String(fd.get("height") ?? ""),
      notes: String(fd.get("notes") ?? ""),
    };
    onSave(v, sendToDoctor);
  };

  return (
    <div className="space-y-4">
      {patientName && <p className="text-sm font-medium text-foreground">{patientName}</p>}
      <form id="helpdesk-vitals-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key} className="text-xs font-medium">
                {f.label}
              </Label>
              <Input
                ref={refs[f.key]}
                id={f.key}
                name={f.key}
                defaultValue={base[f.key]}
                placeholder={f.placeholder}
                inputMode={f.inputMode}
                autoComplete="off"
                className="h-11 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    focusNext(f.key);
                  }
                }}
              />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs font-medium">
            Notes
          </Label>
          <Textarea
            ref={refs.notes}
            id="notes"
            name="notes"
            defaultValue={base.notes}
            rows={3}
            placeholder="Optional"
            className="min-h-[80px] resize-none text-base"
          />
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
          <Button type="submit" className="w-full sm:w-auto">
            Save &amp; Send to Doctor
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => saveDraft(false)}
          >
            Save draft
          </Button>
          {onSkip && (
            <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onSkip}>
              Skip
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
