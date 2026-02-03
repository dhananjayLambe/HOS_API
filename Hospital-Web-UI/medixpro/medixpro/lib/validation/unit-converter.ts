/**
 * Unit Conversion Utilities for Validation
 * 
 * Converts validation ranges and values between different units
 * Used to ensure validation works correctly when users switch units
 */

export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  convert: (value: number) => number;
  reverse: (value: number) => number;
}

/**
 * Unit conversion definitions
 */
const UNIT_CONVERSIONS: Record<string, UnitConversion> = {
  // Height conversions
  "cm_to_ft": {
    fromUnit: "cm",
    toUnit: "ft",
    convert: (value: number) => value / 30.48, // cm to feet
    reverse: (value: number) => value * 30.48, // feet to cm
  },
  "ft_to_cm": {
    fromUnit: "ft",
    toUnit: "cm",
    convert: (value: number) => value * 30.48, // feet to cm
    reverse: (value: number) => value / 30.48, // cm to feet
  },

  // Weight conversions
  "kg_to_lb": {
    fromUnit: "kg",
    toUnit: "lb",
    convert: (value: number) => value * 2.20462, // kg to pounds
    reverse: (value: number) => value / 2.20462, // pounds to kg
  },
  "lb_to_kg": {
    fromUnit: "lb",
    toUnit: "kg",
    convert: (value: number) => value / 2.20462, // pounds to kg
    reverse: (value: number) => value * 2.20462, // kg to pounds
  },

  // Temperature conversions
  "c_to_f": {
    fromUnit: "c",
    toUnit: "f",
    convert: (value: number) => (value * 9/5) + 32, // Celsius to Fahrenheit
    reverse: (value: number) => (value - 32) * 5/9, // Fahrenheit to Celsius
  },
  "f_to_c": {
    fromUnit: "f",
    toUnit: "c",
    convert: (value: number) => (value - 32) * 5/9, // Fahrenheit to Celsius
    reverse: (value: number) => (value * 9/5) + 32, // Celsius to Fahrenheit
  },
};

/**
 * Get conversion function for a unit pair
 */
function getConversion(fromUnit: string, toUnit: string): ((value: number) => number) | null {
  if (fromUnit === toUnit) return (v: number) => v;
  
  const key = `${fromUnit}_to_${toUnit}`;
  const conversion = UNIT_CONVERSIONS[key];
  
  if (conversion) {
    return conversion.convert;
  }
  
  // Try reverse
  const reverseKey = `${toUnit}_to_${fromUnit}`;
  const reverseConversion = UNIT_CONVERSIONS[reverseKey];
  
  if (reverseConversion) {
    return reverseConversion.reverse;
  }
  
  return null;
}

/**
 * Convert a value from one unit to another
 */
export function convertValue(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;
  if (value === undefined || value === null || typeof value !== "number" || isNaN(value)) return value;
  
  const converter = getConversion(fromUnit, toUnit);
  if (!converter) {
    console.warn(`No conversion found from ${fromUnit} to ${toUnit}`);
    return value;
  }
  
  const result = converter(value);
  return typeof result === "number" && !isNaN(result) ? result : value;
}

/**
 * Convert validation range (min/max) from canonical unit to display unit
 */
export function convertValidationRange(
  min: number | undefined,
  max: number | undefined,
  canonicalUnit: string,
  displayUnit: string
): { min: number | undefined; max: number | undefined } {
  if (canonicalUnit === displayUnit) {
    return { min, max };
  }
  
  const converter = getConversion(canonicalUnit, displayUnit);
  if (!converter) {
    return { min, max };
  }
  
  return {
    min: min !== undefined ? converter(min) : undefined,
    max: max !== undefined ? converter(max) : undefined,
  };
}

/**
 * Convert a value for validation (from display unit to canonical unit)
 * This ensures validation always happens in canonical unit
 */
export function convertValueForValidation(
  value: number,
  displayUnit: string,
  canonicalUnit: string
): number {
  if (displayUnit === canonicalUnit) return value;
  if (value === undefined || value === null || typeof value !== "number" || isNaN(value)) return value;
  
  const converter = getConversion(displayUnit, canonicalUnit);
  if (!converter) {
    return value;
  }
  
  const result = converter(value);
  return typeof result === "number" && !isNaN(result) ? result : value;
}

/**
 * Get unit label for display
 */
export function getUnitLabel(unit: string): string {
  const labels: Record<string, string> = {
    cm: "cm",
    ft: "ft",
    kg: "kg",
    lb: "lb",
    c: "°C",
    f: "°F",
    "°C": "°C",
    "°F": "°F",
    mmHg: "mmHg",
    "/min": "/min",
    "%": "%",
  };
  
  return labels[unit] || unit;
}

/**
 * Format validation range for display
 */
export function formatValidationRange(
  min: number | undefined,
  max: number | undefined,
  unit: string
): string {
  if (min === undefined && max === undefined) return "";
  if (min === undefined) return `Max: ${max} ${getUnitLabel(unit)}`;
  if (max === undefined) return `Min: ${min} ${getUnitLabel(unit)}`;
  return `Range: ${min}–${max} ${getUnitLabel(unit)}`;
}
