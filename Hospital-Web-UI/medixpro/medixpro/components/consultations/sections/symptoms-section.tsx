"use client";

import { useState, useId } from "react";
import { Thermometer, Plus } from "lucide-react";
import { ConsultationSectionCard } from "@/components/consultations/consultation-section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConsultationStore } from "@/store/consultationStore";
import { cn } from "@/lib/utils";

const SUGGESTED_SYMPTOMS = [
  "Cough",
  "Cold",
  "Vomiting",
  "Stomach",
  "Headache",
  "Abdominal Pain",
  "Running Nose",
  "Loose stools",
  "Loose Motion",
  "Throat pain",
];

function symptomId() {
  return `sym-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function SymptomsSection() {
  const { symptoms, addSymptom, removeSymptom, setSelectedSymptomId, selectedSymptomId } =
    useConsultationStore();
  const [customInput, setCustomInput] = useState("");
  const inputId = useId();

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || symptoms.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    addSymptom({ id: symptomId(), name: trimmed });
    setCustomInput("");
  };

  return (
    <ConsultationSectionCard
      title="Symptoms"
      icon={<Thermometer className="text-muted-foreground" />}
      defaultOpen
    >
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {symptoms.map((s) => (
            <span
              key={s.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                selectedSymptomId === s.id
                  ? "bg-blue-600 text-white shadow-sm dark:bg-blue-600"
                  : "border border-border bg-muted/50 text-foreground hover:bg-muted"
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedSymptomId(selectedSymptomId === s.id ? null : s.id)}
                className="focus:outline-none"
              >
                {s.name}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSymptom(s.id);
                }}
                className={cn(
                  "ml-0.5 rounded-full p-0.5 hover:opacity-80",
                  selectedSymptomId === s.id ? "hover:bg-blue-700 dark:hover:bg-blue-700" : "hover:bg-muted"
                )}
                aria-label={`Remove ${s.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_SYMPTOMS.filter(
            (name) => !symptoms.some((s) => s.name.toLowerCase() === name.toLowerCase())
          ).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => add(name)}
              className="rounded-full border border-muted-foreground/40 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/50 hover:text-foreground"
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            id={inputId}
            placeholder="Type and press Enter to add"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(customInput);
              }
            }}
            className="max-w-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => add(customInput)}
            className="gap-1.5 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </ConsultationSectionCard>
  );
}
