/**
 * Dynamic Validation System
 * 
 * Validates form fields based on template metadata
 * Supports: required, min, max, pattern, custom validators
 * Supports unit conversion for multi-unit fields
 */

import { 
  convertValueForValidation, 
  convertValidationRange, 
  getUnitLabel 
} from "./unit-converter";
import { getValidationRange } from "./range-resolver";

export interface FieldValidation {
  required?: boolean;
  min?: number; // In canonical unit
  max?: number; // In canonical unit
  pattern?: string; // regex pattern
  custom_validator?: string; // reference to custom validator function
  error_messages?: {
    required?: string;
    min?: string;
    max?: string;
    pattern?: string;
    custom?: string;
    invalid?: string;
  };
}

export interface FieldConfig {
  key: string;
  type: string;
  label: string;
  validation?: FieldValidation;
  canonical_unit?: string; // Canonical unit for validation (e.g., "cm", "kg", "c")
  supported_units?: string[]; // Supported units for this field
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates a single field value against its validation rules
 * 
 * @param field - Field configuration with validation rules
 * @param value - Value to validate (in display unit if unit conversion is needed)
 * @param allFormData - All form data for cross-field validation
 * @param currentUnit - Current unit of the value (e.g., "ft", "cm", "f", "c")
 * @param specialtyRanges - Specialty-specific validation ranges (overrides field defaults)
 */
export function validateField(
  field: FieldConfig,
  value: any,
  allFormData?: Record<string, any>,
  currentUnit?: string,
  specialtyRanges?: Record<string, { min?: number; max?: number; canonical_unit?: string }>
): string | null {
  try {
    if (!field || typeof field !== "object") return null;
    // Resolve validation range (specialty override > field validation > field defaults)
    const { min: resolvedMin, max: resolvedMax, canonicalUnit } = getValidationRange(field, specialtyRanges);
  
  // Create effective validation object with resolved ranges
  const effectiveValidation = field.validation ? { ...field.validation } : {};
  if (resolvedMin !== undefined) effectiveValidation.min = resolvedMin;
  if (resolvedMax !== undefined) effectiveValidation.max = resolvedMax;
  
  if (!effectiveValidation || (effectiveValidation.min === undefined && effectiveValidation.max === undefined && !effectiveValidation.required)) {
    return null;
  }

  const errorMessages = effectiveValidation.error_messages || field.validation?.error_messages || {};

  // Required validation
  if (effectiveValidation.required) {
    if (value === null || value === undefined || value === "" || 
        (Array.isArray(value) && value.length === 0)) {
      return errorMessages.required || `${field.label} is required`;
    }
  }

  // Skip other validations if value is empty and not required
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Number validations with unit conversion support
  if (field.type === "number" && typeof value === "number") {
    // Convert value to canonical unit for validation if needed
    let valueToValidate = value;
    const minToCheck = effectiveValidation.min;
    const maxToCheck = effectiveValidation.max;
    const effectiveCanonicalUnit = canonicalUnit || field.canonical_unit || field.unit || "";
    
    // If field has unit conversion and current unit differs from canonical
    if (effectiveCanonicalUnit && currentUnit && currentUnit !== effectiveCanonicalUnit) {
      // Convert value to canonical unit for validation
      valueToValidate = convertValueForValidation(value, currentUnit, effectiveCanonicalUnit);
      // Min/max are already in canonical unit (from resolved range)
    }
    
    // Perform validation in canonical unit
    if (minToCheck !== undefined && valueToValidate < minToCheck) {
      // Convert min back to display unit for error message if needed
      if (currentUnit && effectiveCanonicalUnit && currentUnit !== effectiveCanonicalUnit) {
        const { min: displayMin } = convertValidationRange(minToCheck, undefined, effectiveCanonicalUnit, currentUnit);
        const unitLabel = getUnitLabel(currentUnit);
        // Use custom error message if available, otherwise generate one
        if (errorMessages.min) {
          return errorMessages.min.replace("{min}", displayMin?.toFixed(1) || minToCheck.toString())
                                  .replace("{unit}", unitLabel);
        }
        return `${field.label} must be at least ${displayMin?.toFixed(1)} ${unitLabel}`;
      }
      // Use custom error message or generate default
      if (errorMessages.min) {
        return errorMessages.min.replace("{min}", minToCheck.toString())
                                .replace("{unit}", effectiveCanonicalUnit || "");
      }
      return `${field.label} must be at least ${minToCheck}`;
    }
    
    if (maxToCheck !== undefined && valueToValidate > maxToCheck) {
      // Convert max back to display unit for error message if needed
      if (currentUnit && effectiveCanonicalUnit && currentUnit !== effectiveCanonicalUnit) {
        const { max: displayMax } = convertValidationRange(undefined, maxToCheck, effectiveCanonicalUnit, currentUnit);
        const unitLabel = getUnitLabel(currentUnit);
        // Use custom error message if available, otherwise generate one
        if (errorMessages.max) {
          return errorMessages.max.replace("{max}", displayMax?.toFixed(1) || maxToCheck.toString())
                                  .replace("{unit}", unitLabel);
        }
        return `${field.label} cannot exceed ${displayMax?.toFixed(1)} ${unitLabel}`;
      }
      // Use custom error message or generate default
      if (errorMessages.max) {
        return errorMessages.max.replace("{max}", maxToCheck.toString())
                                .replace("{unit}", effectiveCanonicalUnit || "");
      }
      return `${field.label} cannot exceed ${maxToCheck}`;
    }
  }

  // String validations
  if (field.type === "text" && typeof value === "string") {
    if (effectiveValidation.min !== undefined && value.length < effectiveValidation.min) {
      return errorMessages.min || `${field.label} must be at least ${effectiveValidation.min} characters`;
    }
    if (effectiveValidation.max !== undefined && value.length > effectiveValidation.max) {
      return errorMessages.max || `${field.label} cannot exceed ${effectiveValidation.max} characters`;
    }
    if (effectiveValidation.pattern) {
      const regex = new RegExp(effectiveValidation.pattern);
      if (!regex.test(value)) {
        return errorMessages.pattern || `${field.label} format is invalid`;
      }
    }
  }

  // Custom validators
  if (effectiveValidation.custom_validator && allFormData) {
    const customError = runCustomValidator(
      effectiveValidation.custom_validator,
      field,
      value,
      allFormData
    );
    if (customError) {
      return errorMessages.custom || customError;
    }
  }

    return null;
  } catch (_err) {
    return null;
  }
}

/**
 * Validates all fields in a form section
 */
export function validateSection(
  fields: FieldConfig[],
  formData: Record<string, any>
): ValidationResult {
  const errors: Record<string, string> = {};

  fields.forEach((field) => {
    const value = getNestedValue(formData, field.key);
    const error = validateField(field, value, formData);
    if (error) {
      errors[field.key] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Custom validator functions
 */
function runCustomValidator(
  validatorName: string,
  field: FieldConfig,
  value: any,
  allFormData: Record<string, any>
): string | null {
  switch (validatorName) {
    case "diastolic_must_be_less_than_systolic":
      const systolic = getNestedValue(allFormData, "systolic");
      if (systolic && value && value >= systolic) {
        return "Diastolic BP must be less than Systolic BP";
      }
      break;

    case "weight_height_ratio":
      const height = getNestedValue(allFormData, "height");
      const weight = getNestedValue(allFormData, "weight");
      if (height && weight) {
        const bmi = weight / ((height / 100) ** 2);
        if (bmi < 10 || bmi > 60) {
          return "BMI calculation results in an unrealistic value. Please check height and weight.";
        }
      }
      break;

    // Add more custom validators as needed
    default:
      console.warn(`Unknown custom validator: ${validatorName}`);
  }

  return null;
}

/**
 * Helper to get nested values from form data
 * Supports both flat keys (e.g., "height_cm") and nested paths (e.g., "height_weight.height_cm")
 */
function getNestedValue(obj: any, path: string): any {
  // First try direct key access (for flat structures)
  if (obj && typeof obj === "object" && path in obj) {
    return obj[path];
  }
  
  // Then try nested path
  const keys = path.split(".");
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

/**
 * Get required fields from specialty config
 */
export function getRequiredFields(
  specialtyConfig: any,
  section: string
): string[] {
  if (!specialtyConfig || !specialtyConfig[section]) {
    return [];
  }
  return specialtyConfig[section].required || [];
}

/**
 * Check if a field is required based on specialty config
 */
export function isFieldRequired(
  fieldKey: string,
  specialtyConfig: any,
  section: string
): boolean {
  const requiredFields = getRequiredFields(specialtyConfig, section);
  return requiredFields.includes(fieldKey);
}
