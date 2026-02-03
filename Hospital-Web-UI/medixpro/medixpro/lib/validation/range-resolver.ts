/**
 * Range Resolver - Production-Ready Dynamic Range System
 * 
 * Resolves validation ranges based on:
 * 1. Specialty-specific overrides
 * 2. Field-level defaults
 * 3. Unit conversions
 * 
 * Provides fallback chain for production safety
 */

import { FieldConfig } from "./dynamic-validator";
import { convertValidationRange, getUnitLabel } from "./unit-converter";

export interface RangeConfig {
  min?: number;
  max?: number;
  canonical_unit?: string;
  notes?: string;
}

export interface SpecialtyRanges {
  [fieldKey: string]: RangeConfig;
}

/**
 * Resolves validation range for a field considering:
 * - Specialty-specific overrides
 * - Field defaults
 * - Current display unit
 */
export function resolveValidationRange(
  field: FieldConfig,
  specialtyRanges?: SpecialtyRanges,
  currentUnit?: string
): { min: number | undefined; max: number | undefined; displayMin: number | undefined; displayMax: number | undefined } {
  const fieldKey = field.key;
  const canonicalUnit = field.canonical_unit || field.unit || "";
  const displayUnit = currentUnit || canonicalUnit;

  // Priority 1: Specialty-specific range override
  let min: number | undefined;
  let max: number | undefined;
  let resolvedCanonicalUnit = canonicalUnit;

  if (specialtyRanges && specialtyRanges[fieldKey]) {
    const specialtyRange = specialtyRanges[fieldKey];
    min = specialtyRange.min;
    max = specialtyRange.max;
    if (specialtyRange.canonical_unit) {
      resolvedCanonicalUnit = specialtyRange.canonical_unit;
    }
  } else {
    // Priority 2: Field-level validation range
    if (field.validation) {
      min = field.validation.min;
      max = field.validation.max;
    }
    
    // Priority 3: Field-level min/max
    if (min === undefined) min = field.min;
    if (max === undefined) max = field.max;
    
    // Priority 4: Field-level range array
    if ((min === undefined || max === undefined) && field.range) {
      if (min === undefined) min = field.range[0];
      if (max === undefined) max = field.range[1];
    }
  }

  // Convert to display unit if needed
  let displayMin = min;
  let displayMax = max;
  
  if (min !== undefined || max !== undefined) {
    if (resolvedCanonicalUnit && displayUnit && resolvedCanonicalUnit !== displayUnit) {
      const converted = convertValidationRange(min, max, resolvedCanonicalUnit, displayUnit);
      displayMin = converted.min;
      displayMax = converted.max;
    }
  }

  return {
    min,
    max,
    displayMin,
    displayMax,
  };
}

/**
 * Get formatted range string for display
 */
export function getFormattedRange(
  field: FieldConfig,
  specialtyRanges?: SpecialtyRanges,
  currentUnit?: string
): string {
  const { displayMin, displayMax } = resolveValidationRange(field, specialtyRanges, currentUnit);
  
  if (displayMin === undefined && displayMax === undefined) {
    return "";
  }
  
  const displayUnit = currentUnit || field.canonical_unit || field.unit || "";
  const unitLabel = getUnitLabel(displayUnit);
  
  if (displayMin !== undefined && displayMax !== undefined) {
    const precision = displayUnit === "ft" || displayUnit === "lb" ? 1 : 0;
    return `Range: ${displayMin.toFixed(precision)}–${displayMax.toFixed(precision)} ${unitLabel}`;
  }
  
  if (displayMin !== undefined) {
    return `Min: ${displayMin.toFixed(1)} ${unitLabel}`;
  }
  
  if (displayMax !== undefined) {
    return `Max: ${displayMax.toFixed(1)} ${unitLabel}`;
  }
  
  return "";
}

/**
 * Get validation range for a field (for validation logic)
 * Always returns in canonical unit
 */
export function getValidationRange(
  field: FieldConfig,
  specialtyRanges?: SpecialtyRanges
): { min: number | undefined; max: number | undefined; canonicalUnit: string } {
  const { min, max } = resolveValidationRange(field, specialtyRanges);
  const canonicalUnit = field.canonical_unit || field.unit || "";
  
  return {
    min,
    max,
    canonicalUnit,
  };
}
