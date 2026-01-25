"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface VitalsFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export function VitalsForm({ initialData, onSave, onCancel }: VitalsFormProps) {
  const heightInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    height_weight: {
      height_cm: initialData?.height_weight?.height_cm || "",
      weight_kg: initialData?.height_weight?.weight_kg || "",
      bmi: initialData?.height_weight?.bmi || "",
    },
    blood_pressure: {
      systolic: initialData?.blood_pressure?.systolic || "",
      diastolic: initialData?.blood_pressure?.diastolic || "",
    },
    temperature: {
      value: initialData?.temperature?.value || "",
    },
  });

  // Auto-focus first field when modal opens
  useEffect(() => {
    if (heightInputRef.current) {
      setTimeout(() => heightInputRef.current?.focus(), 100);
    }
  }, []);

  // Calculate BMI when height or weight changes
  useEffect(() => {
    const height = formData.height_weight.height_cm;
    const weight = formData.height_weight.weight_kg;
    if (height && weight) {
      const heightInMeters = Number(height) / 100;
      const bmi = Number(weight) / (heightInMeters * heightInMeters);
      setFormData(prev => ({
        ...prev,
        height_weight: {
          ...prev.height_weight,
          bmi: bmi.toFixed(1),
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        height_weight: {
          ...prev.height_weight,
          bmi: "",
        },
      }));
    }
  }, [formData.height_weight.height_cm, formData.height_weight.weight_kg]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedData: any = {};
    
    // Only include sections that have at least one value
    if (formData.height_weight.height_cm || formData.height_weight.weight_kg) {
      cleanedData.height_weight = {
        ...formData.height_weight,
        height_cm: formData.height_weight.height_cm ? Number(formData.height_weight.height_cm) : undefined,
        weight_kg: formData.height_weight.weight_kg ? Number(formData.height_weight.weight_kg) : undefined,
        bmi: formData.height_weight.bmi ? Number(formData.height_weight.bmi) : undefined,
      };
    }
    
    if (formData.blood_pressure.systolic || formData.blood_pressure.diastolic) {
      cleanedData.blood_pressure = {
        systolic: formData.blood_pressure.systolic ? Number(formData.blood_pressure.systolic) : undefined,
        diastolic: formData.blood_pressure.diastolic ? Number(formData.blood_pressure.diastolic) : undefined,
      };
    }
    
    if (formData.temperature.value) {
      cleanedData.temperature = {
        value: Number(formData.temperature.value),
      };
    }

    onSave(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Compact Grid Layout - All fields in one view */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Height */}
        <div className="space-y-1.5">
          <Label htmlFor="height" className="text-xs font-medium">Height (cm)</Label>
          <Input
            ref={heightInputRef}
            id="height"
            type="number"
            inputMode="decimal"
            placeholder="170"
            value={formData.height_weight.height_cm}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                height_weight: {
                  ...prev.height_weight,
                  height_cm: e.target.value,
                },
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("weight")?.focus();
              }
            }}
            className="h-9 text-sm"
          />
        </div>

        {/* Weight */}
        <div className="space-y-1.5">
          <Label htmlFor="weight" className="text-xs font-medium">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            inputMode="decimal"
            placeholder="70"
            value={formData.height_weight.weight_kg}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                height_weight: {
                  ...prev.height_weight,
                  weight_kg: e.target.value,
                },
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("systolic")?.focus();
              }
            }}
            className="h-9 text-sm"
          />
        </div>

        {/* BMI Display */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">BMI</Label>
          <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium">
            {formData.height_weight.bmi || "—"}
          </div>
        </div>

        {/* Systolic BP */}
        <div className="space-y-1.5">
          <Label htmlFor="systolic" className="text-xs font-medium">Systolic (mmHg)</Label>
          <Input
            id="systolic"
            type="number"
            inputMode="numeric"
            placeholder="120"
            value={formData.blood_pressure.systolic}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                blood_pressure: {
                  ...prev.blood_pressure,
                  systolic: e.target.value,
                },
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("diastolic")?.focus();
              }
            }}
            className="h-9 text-sm"
          />
        </div>

        {/* Diastolic BP */}
        <div className="space-y-1.5">
          <Label htmlFor="diastolic" className="text-xs font-medium">Diastolic (mmHg)</Label>
          <Input
            id="diastolic"
            type="number"
            inputMode="numeric"
            placeholder="80"
            value={formData.blood_pressure.diastolic}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                blood_pressure: {
                  ...prev.blood_pressure,
                  diastolic: e.target.value,
                },
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("temperature")?.focus();
              }
            }}
            className="h-9 text-sm"
          />
        </div>

        {/* Temperature */}
        <div className="space-y-1.5">
          <Label htmlFor="temperature" className="text-xs font-medium">Temperature (°F)</Label>
          <Input
            id="temperature"
            type="number"
            inputMode="decimal"
            placeholder="98.6"
            value={formData.temperature.value}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                temperature: {
                  value: e.target.value,
                },
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const form = e.currentTarget.closest("form");
                form?.requestSubmit();
              }
            }}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="h-9 text-sm">
          Cancel
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 h-9 text-sm">
          Save Vitals
        </Button>
      </div>
    </form>
  );
}
