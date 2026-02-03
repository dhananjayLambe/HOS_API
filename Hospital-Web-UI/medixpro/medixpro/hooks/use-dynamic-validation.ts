/**
 * React Hook for Dynamic Form Validation
 * 
 * Uses template metadata to validate form fields dynamically
 */

import { useState, useCallback } from "react";
import {
  validateField,
  validateSection,
  FieldConfig,
  ValidationResult,
  isFieldRequired,
} from "@/lib/validation/dynamic-validator";

interface UseDynamicValidationOptions {
  fields: FieldConfig[];
  specialtyConfig?: any;
  section?: string;
  initialData?: Record<string, any>;
}

export function useDynamicValidation({
  fields,
  specialtyConfig,
  section,
  initialData = {},
}: UseDynamicValidationOptions) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /**
   * Validate a single field
   */
  const validateFieldValue = useCallback(
    (fieldKey: string, value: any, allFormData: Record<string, any>, currentUnit?: string, specialtyRanges?: any) => {
      const field = fields.find((f) => f.key === fieldKey);
      if (!field) return null;

      // Check if field is required based on specialty config
      const required = isFieldRequired(fieldKey, specialtyConfig, section || "");
      if (required && field.validation) {
        field.validation.required = true;
      }

      const error = validateField(field, value, allFormData, currentUnit, specialtyRanges);
      setErrors((prev) => {
        if (error) {
          return { ...prev, [fieldKey]: error };
        } else {
          const { [fieldKey]: _, ...rest } = prev;
          return rest;
        }
      });

      return error;
    },
    [fields, specialtyConfig, section]
  );

  /**
   * Validate entire form
   */
  const validateForm = useCallback(
    (formData: Record<string, any>): ValidationResult => {
      // Apply required fields from specialty config
      const fieldsWithRequired = fields.map((field) => {
        const required = isFieldRequired(field.key, specialtyConfig, section || "");
        return {
          ...field,
          validation: {
            ...field.validation,
            required: required || field.validation?.required || false,
          },
        };
      });

      const result = validateSection(fieldsWithRequired, formData);
      setErrors(result.errors);
      return result;
    },
    [fields, specialtyConfig, section]
  );

  /**
   * Mark field as touched
   */
  const setFieldTouched = useCallback((fieldKey: string) => {
    setTouched((prev) => ({ ...prev, [fieldKey]: true }));
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback((fieldKey: string) => {
    setErrors((prev) => {
      const { [fieldKey]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Check if field has error and is touched
   */
  const getFieldError = useCallback(
    (fieldKey: string): string | undefined => {
      if (touched[fieldKey] || errors[fieldKey]) {
        return errors[fieldKey];
      }
      return undefined;
    },
    [errors, touched]
  );

  /**
   * Check if form is valid
   */
  const isFormValid = Object.keys(errors).length === 0;

  return {
    errors,
    touched,
    validateFieldValue,
    validateForm,
    setFieldTouched,
    clearErrors,
    clearFieldError,
    getFieldError,
    isFormValid,
  };
}
