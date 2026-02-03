/**
 * Example: Dynamic Vitals Form using Template-Based Validation
 * 
 * This demonstrates how to use the dynamic validation system
 * with template metadata
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useDynamicValidation } from "@/hooks/use-dynamic-validation";
import { DynamicField } from "./dynamic-field";
import { FieldConfig } from "@/lib/validation/dynamic-validator";

interface VitalsFormDynamicProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  templateFields?: FieldConfig[]; // From API: ConsultationEngine.get_pre_consultation_template()
  specialtyConfig?: any; // From API: specialty_config.json
}

export function VitalsFormDynamic({
  initialData,
  onSave,
  onCancel,
  templateFields = [],
  specialtyConfig,
}: VitalsFormDynamicProps) {
  const [formData, setFormData] = useState<any>(initialData || {});

  // Initialize validation hook with template fields
  const {
    validateFieldValue,
    validateForm,
    setFieldTouched,
    getFieldError,
    isFormValid,
  } = useDynamicValidation({
    fields: templateFields,
    specialtyConfig,
    section: "vitals",
    initialData,
  });

  // Handle field change with validation
  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldKey]: value,
    }));

    // Validate field on change (after it's been touched)
    const allFormData = { ...formData, [fieldKey]: value };
    validateFieldValue(fieldKey, value, allFormData);
  };

  // Handle field blur
  const handleFieldBlur = (fieldKey: string) => {
    setFieldTouched(fieldKey);
    validateFieldValue(fieldKey, formData[fieldKey], formData);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate entire form
    const result = validateForm(formData);
    if (!result.isValid) {
      // Mark all fields as touched to show errors
      templateFields.forEach((field) => {
        setFieldTouched(field.key);
      });
      return;
    }

    // Clean and format data before saving
    const cleanedData = cleanFormData(formData, templateFields);
    onSave(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {templateFields.map((field) => (
          <DynamicField
            key={field.key}
            field={field}
            value={formData[field.key]}
            onChange={(value) => handleFieldChange(field.key, value)}
            error={getFieldError(field.key)}
            onBlur={() => handleFieldBlur(field.key)}
          />
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="h-9 text-sm">
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 h-9 text-sm"
          disabled={!isFormValid}
        >
          Save Vitals
        </Button>
      </div>
    </form>
  );
}

/**
 * Clean form data based on field types
 */
function cleanFormData(formData: any, fields: FieldConfig[]): any {
  const cleaned: any = {};

  fields.forEach((field) => {
    const value = formData[field.key];
    if (value !== null && value !== undefined && value !== "") {
      if (field.type === "number") {
        cleaned[field.key] = Number(value);
      } else {
        cleaned[field.key] = value;
      }
    }
  });

  return cleaned;
}
