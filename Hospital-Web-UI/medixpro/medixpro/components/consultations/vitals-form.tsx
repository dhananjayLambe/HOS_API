"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useDynamicValidation } from "@/hooks/use-dynamic-validation";
import { FieldConfig } from "@/lib/validation/dynamic-validator";

interface VitalsFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  templateFields?: FieldConfig[]; // Optional: from API template
  specialtyConfig?: any; // Optional: from specialty config
}

export function VitalsForm({ initialData, onSave, onCancel, templateFields = [], specialtyConfig }: VitalsFormProps) {
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

  // Initialize validation if template fields are provided
  const hasValidation = templateFields && templateFields.length > 0;
  const {
    validateFieldValue,
    validateForm,
    setFieldTouched,
    getFieldError,
    isFormValid: validationIsValid,
  } = useDynamicValidation({
    fields: templateFields,
    specialtyConfig,
    section: "vitals",
    initialData,
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

  // Helper to flatten form data for validation
  const flattenFormData = (data: typeof formData) => {
    return {
      height_cm: data.height_weight.height_cm,
      weight_kg: data.height_weight.weight_kg,
      systolic: data.blood_pressure.systolic,
      diastolic: data.blood_pressure.diastolic,
      temperature: data.temperature.value,
    };
  };

  // Handle field change with validation
  const handleFieldChange = (path: string[], value: any) => {
    setFormData((prev: any) => {
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]] = { ...current[path[i]] };
      }
      current[path[path.length - 1]] = value;
      
      // Validate if validation is enabled (using updated data)
      if (hasValidation) {
        const updatedData = flattenFormData(newData);
        const fieldKey = path[path.length - 1];
        // Use setTimeout to ensure state is updated
        setTimeout(() => {
          validateFieldValue(fieldKey, value, updatedData);
        }, 0);
      }
      
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate if validation is enabled
    if (hasValidation) {
      const flatData = flattenFormData(formData);
      const result = validateForm(flatData);
      if (!result.isValid) {
        // Mark all fields as touched to show errors
        ["height_cm", "weight_kg", "systolic", "diastolic", "temperature"].forEach((field) => {
          setFieldTouched(field);
        });
        return;
      }
    }

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
          <Label htmlFor="height" className="text-xs font-medium">
            Height (cm)
            {hasValidation && getFieldError("height_cm") && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Input
            ref={heightInputRef}
            id="height"
            type="number"
            inputMode="decimal"
            placeholder="170"
            value={formData.height_weight.height_cm}
            onChange={(e) => handleFieldChange(["height_weight", "height_cm"], e.target.value)}
            onBlur={() => {
              if (hasValidation) {
                setFieldTouched("height_cm");
                const flatData = flattenFormData(formData);
                validateFieldValue("height_cm", formData.height_weight.height_cm, flatData);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("weight")?.focus();
              }
            }}
            className={`h-9 text-sm ${hasValidation && getFieldError("height_cm") ? "border-destructive" : ""}`}
            min={hasValidation ? 30 : undefined}
            max={hasValidation ? 250 : undefined}
          />
          {hasValidation && getFieldError("height_cm") && (
            <p className="text-xs text-destructive mt-1">{getFieldError("height_cm")}</p>
          )}
        </div>

        {/* Weight */}
        <div className="space-y-1.5">
          <Label htmlFor="weight" className="text-xs font-medium">
            Weight (kg)
            {hasValidation && getFieldError("weight_kg") && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Input
            id="weight"
            type="number"
            inputMode="decimal"
            placeholder="70"
            value={formData.height_weight.weight_kg}
            onChange={(e) => handleFieldChange(["height_weight", "weight_kg"], e.target.value)}
            onBlur={() => {
              if (hasValidation) {
                setFieldTouched("weight_kg");
                const flatData = flattenFormData(formData);
                validateFieldValue("weight_kg", formData.height_weight.weight_kg, flatData);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("systolic")?.focus();
              }
            }}
            className={`h-9 text-sm ${hasValidation && getFieldError("weight_kg") ? "border-destructive" : ""}`}
            min={hasValidation ? 0.1 : undefined}
            max={hasValidation ? 500 : undefined}
          />
          {hasValidation && getFieldError("weight_kg") && (
            <p className="text-xs text-destructive mt-1">{getFieldError("weight_kg")}</p>
          )}
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
          <Label htmlFor="systolic" className="text-xs font-medium">
            Systolic (mmHg)
            {hasValidation && getFieldError("systolic") && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Input
            id="systolic"
            type="number"
            inputMode="numeric"
            placeholder="120"
            value={formData.blood_pressure.systolic}
            onChange={(e) => handleFieldChange(["blood_pressure", "systolic"], e.target.value)}
            onBlur={() => {
              if (hasValidation) {
                setFieldTouched("systolic");
                const flatData = flattenFormData(formData);
                validateFieldValue("systolic", formData.blood_pressure.systolic, flatData);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("diastolic")?.focus();
              }
            }}
            className={`h-9 text-sm ${hasValidation && getFieldError("systolic") ? "border-destructive" : ""}`}
            min={hasValidation ? 50 : undefined}
            max={hasValidation ? 300 : undefined}
          />
          {hasValidation && getFieldError("systolic") && (
            <p className="text-xs text-destructive mt-1">{getFieldError("systolic")}</p>
          )}
        </div>

        {/* Diastolic BP */}
        <div className="space-y-1.5">
          <Label htmlFor="diastolic" className="text-xs font-medium">
            Diastolic (mmHg)
            {hasValidation && getFieldError("diastolic") && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Input
            id="diastolic"
            type="number"
            inputMode="numeric"
            placeholder="80"
            value={formData.blood_pressure.diastolic}
            onChange={(e) => handleFieldChange(["blood_pressure", "diastolic"], e.target.value)}
            onBlur={() => {
              if (hasValidation) {
                setFieldTouched("diastolic");
                const flatData = flattenFormData(formData);
                validateFieldValue("diastolic", formData.blood_pressure.diastolic, flatData);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("temperature")?.focus();
              }
            }}
            className={`h-9 text-sm ${hasValidation && getFieldError("diastolic") ? "border-destructive" : ""}`}
            min={hasValidation ? 30 : undefined}
            max={hasValidation ? 200 : undefined}
          />
          {hasValidation && getFieldError("diastolic") && (
            <p className="text-xs text-destructive mt-1">{getFieldError("diastolic")}</p>
          )}
        </div>

        {/* Temperature */}
        <div className="space-y-1.5">
          <Label htmlFor="temperature" className="text-xs font-medium">
            Temperature (°F)
            {hasValidation && getFieldError("temperature") && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Input
            id="temperature"
            type="number"
            inputMode="decimal"
            placeholder="98.6"
            value={formData.temperature.value}
            onChange={(e) => handleFieldChange(["temperature", "value"], e.target.value)}
            onBlur={() => {
              if (hasValidation) {
                setFieldTouched("temperature");
                const flatData = flattenFormData(formData);
                validateFieldValue("temperature", formData.temperature.value, flatData);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const form = e.currentTarget.closest("form");
                form?.requestSubmit();
              }
            }}
            className={`h-9 text-sm ${hasValidation && getFieldError("temperature") ? "border-destructive" : ""}`}
            min={hasValidation ? 90 : undefined}
            max={hasValidation ? 115 : undefined}
          />
          {hasValidation && getFieldError("temperature") && (
            <p className="text-xs text-destructive mt-1">{getFieldError("temperature")}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="h-9 text-sm">
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="bg-purple-600 hover:bg-purple-700 h-9 text-sm"
          disabled={hasValidation && !validationIsValid}
        >
          Save Vitals
        </Button>
      </div>
    </form>
  );
}
