"use client";

import { memo, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldConfig } from "@/store/preConsultationTemplateStore";

interface DynamicFieldRendererProps {
  field: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  sectionData: Record<string, any>;
  itemCode: string;
  error?: string;
  onUnitChange?: (unit: string) => void;
  currentUnit?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
  sectionCode?: string; // e.g. "vitals" for soft validation and sizing heuristics
}

// Calculate field value based on formula
const calculateFieldValue = (
  formula: string,
  sectionData: Record<string, any>,
  itemCode: string
): number | null => {
  try {
    // Replace field references with actual values
    let calculatedFormula = formula;
    
    // Find all field references (simple pattern: field names)
    // Match word boundaries to avoid partial matches
    const fieldPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const matches = [...new Set(formula.match(fieldPattern) || [])];
    
    // Known operators and constants to skip
    const skipList = ["Math", "sqrt", "pow", "abs", "round", "floor", "ceil", "max", "min"];
    
    for (const match of matches) {
      // Skip operators, constants, and JavaScript keywords
      if (skipList.includes(match) || /^\d+$/.test(match)) continue;
      
      // Look for the field value in sectionData (check current item first, then all items)
      let fieldValue = sectionData[itemCode]?.[match];
      
      // If not found in current item, search all items (for cross-item references like BMI)
      if (fieldValue === undefined || fieldValue === null) {
        for (const [key, data] of Object.entries(sectionData)) {
          if (data && typeof data === "object" && match in data) {
            fieldValue = (data as any)[match];
            break;
          }
        }
      }
      
      if (fieldValue !== undefined && fieldValue !== null && !isNaN(Number(fieldValue))) {
        // For BMI calculation: if height is in feet, convert to cm
        if (match === "height" && fieldValue < 10) {
          // Likely in feet, convert to cm (assuming feet if value < 10)
          fieldValue = fieldValue * 30.48;
        }
        
        calculatedFormula = calculatedFormula.replace(
          new RegExp(`\\b${match}\\b`, "g"),
          String(fieldValue)
        );
      } else {
        // If any dependency is missing, return null
        return null;
      }
    }
    
    // Replace ^ with ** for JavaScript exponentiation
    calculatedFormula = calculatedFormula.replace(/\^/g, "**");
    
    // Safe evaluation using Function (in production, consider using a math parser library)
    // Only allow basic math operations
    if (!/^[0-9+\-*/().\s**]+$/.test(calculatedFormula.replace(/\s/g, ""))) {
      console.warn("Formula contains invalid characters:", calculatedFormula);
      return null;
    }
    
    const result = new Function("return " + calculatedFormula)();
    const numResult = Number(result);
    
    return typeof numResult === "number" && !isNaN(numResult) && isFinite(numResult)
      ? numResult
      : null;
  } catch (error) {
    console.error("Error calculating field:", error);
    return null;
  }
};

// Unit conversion helpers
const convertUnit = (value: number, fromUnit: string, toUnit: string, field: FieldConfig): number => {
  if (!value || isNaN(value)) return value;
  
  // Height conversions
  if (field.key === "height") {
    if (fromUnit === "cm" && toUnit === "ft") {
      return value / 30.48; // cm to feet
    }
    if (fromUnit === "ft" && toUnit === "cm") {
      return value * 30.48; // feet to cm
    }
  }
  
  // Temperature conversions
  if (field.key === "temperature") {
    if (fromUnit === "c" && toUnit === "f") {
      return (value * 9/5) + 32; // Celsius to Fahrenheit
    }
    if (fromUnit === "f" && toUnit === "c") {
      return (value - 32) * 5/9; // Fahrenheit to Celsius
    }
  }
  
  // Weight conversions
  if (field.key === "weight") {
    if (fromUnit === "kg" && toUnit === "lb") {
      return value * 2.20462; // kg to pounds
    }
    if (fromUnit === "lb" && toUnit === "kg") {
      return value / 2.20462; // pounds to kg
    }
  }
  
  return value; // No conversion needed or unsupported
};

// Heuristic: is this a BMI-style calculated field (formula uses height + weight)?
const isBmiStyleFormula = (formula: string) =>
  formula && /\bweight\b/.test(formula) && /\bheight\b/.test(formula);

// Sanity check for BMI: height 50–250 cm, weight 2–300 kg
function areBmiInputsSane(sectionData: Record<string, any>, itemCode: string): boolean {
  let heightCm: number | null = null;
  let weightKg: number | null = null;
  for (const data of Object.values(sectionData)) {
    if (data && typeof data === "object") {
      if (heightCm == null && "height" in data) {
        const h = Number((data as any).height);
        if (!isNaN(h)) heightCm = h < 10 ? h * 30.48 : h;
      }
      if (weightKg == null && "weight" in data) {
        const w = Number((data as any).weight);
        if (!isNaN(w)) weightKg = w; // assume kg
      }
    }
  }
  if (heightCm == null || weightKg == null) return false;
  if (heightCm < 50 || heightCm > 250) return false;
  if (weightKg < 2 || weightKg > 300) return false;
  return true;
}

export const DynamicFieldRenderer = memo<DynamicFieldRendererProps>(
  ({ field, value, onChange, sectionData, itemCode, error, onUnitChange, currentUnit, onKeyDown, autoFocus, sectionCode }) => {
    const isMobile = useMediaQuery("(max-width: 768px)");
    // Normalize options so backend can send either ["A","B"] or [{ value, label }]
    const normalizedOptions = useMemo(
      () =>
        ((field.options as any[]) || []).map((opt) =>
          typeof opt === "string" ? { value: opt, label: opt } : opt
        ),
      [field.options]
    );

    const isCalculated = field.type === "calculated";
    const calculatedValue = useMemo(() => {
      if (isCalculated && field.formula) {
        return calculateFieldValue(field.formula, sectionData, itemCode);
      }
      return null;
    }, [isCalculated, field.formula, sectionData, itemCode]);

    const displayValue = isCalculated ? calculatedValue : value;
    const displayLabel = `${field.label}${field.unit ? ` (${field.unit})` : ""}`;

    // Render based on field type
    if (isCalculated) {
      const isBmiStyle = isBmiStyleFormula(field.formula || "");
      const sane = isBmiStyle ? areBmiInputsSane(sectionData, itemCode) : true;
      const showValue = calculatedValue !== null && (isBmiStyle ? sane : true);
      let bmiStatus = "";
      let bmiColor = "";
      if (isBmiStyle && showValue && calculatedValue !== null) {
        if (calculatedValue < 18.5) {
          bmiStatus = "Underweight";
          bmiColor = "text-blue-600 dark:text-blue-400";
        } else if (calculatedValue < 25) {
          bmiStatus = "Normal";
          bmiColor = "text-green-600 dark:text-green-400";
        } else if (calculatedValue < 30) {
          bmiStatus = "Overweight";
          bmiColor = "text-amber-600 dark:text-amber-400";
        } else {
          bmiStatus = "Obese";
          bmiColor = "text-red-600 dark:text-red-400";
        }
      }
      if (isBmiStyle) {
        return (
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              BMI:
            </Label>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50 ${bmiColor}`}>
              <span className="text-sm font-semibold">
                {showValue ? Number(calculatedValue).toFixed(1) : "—"}
              </span>
              {showValue && bmiStatus && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs font-medium">{bmiStatus}</span>
                </>
              )}
              {!showValue && (
                <span className="text-xs text-muted-foreground ml-1">(auto calculated)</span>
              )}
            </div>
          </div>
        );
      }
      
      // Default calculated field rendering
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">
            {displayLabel}
          </Label>
          <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center text-sm">
            {calculatedValue !== null
              ? calculatedValue.toFixed(2)
              : "—"}
          </div>
        </div>
      );
    }

    switch (field.type) {
      case "number":
        const activeUnit = currentUnit || field.unit || "";
        const step = field.step ?? (activeUnit === "c" || activeUnit === "f" ? 1 : 0.01);
        const min = field.min ?? field.range?.[0];
        const max = field.max ?? field.range?.[1];
        const hasUnitSwitcher = field.supported_units && field.supported_units.length > 1;
        // Sizing: small (~104px) for BP, Pulse, SpO₂; medium (~152px) for Height, Weight, Temp
        const rangeSpan = field.range?.[1] != null && field.range?.[0] != null ? field.range[1] - field.range[0] : null;
        const isSmallNumeric =
          field.unit === "mmHg" ||
          field.unit === "/min" ||
          field.unit === "%" ||
          (rangeSpan != null && rangeSpan <= 15);
        const inputWidthClass = isSmallNumeric ? "w-[6.5rem] min-w-[5.5rem]" : "w-[9.5rem] min-w-[6rem]";
        return (
          <div className="space-y-1.5">
            <Label htmlFor={field.key} className="text-sm font-medium">
              {field.label}
              {field.required && sectionCode !== "vitals" && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="relative flex items-center gap-2 w-fit max-w-full">
              <Input
                id={field.key}
                type="number"
                value={value ?? ""}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === "") {
                    onChange(null);
                    return;
                  }
                  const numValue = parseFloat(inputValue);
                  if (isNaN(numValue)) return;
                  const steppedValue = step === 1 ? Math.round(numValue) : Math.round(numValue / step) * step;
                  let finalValue = steppedValue;
                  if (min !== undefined && finalValue < min) finalValue = min;
                  if (max !== undefined && finalValue > max) finalValue = max;
                  onChange(finalValue);
                }}
                onKeyDown={onKeyDown}
                autoFocus={autoFocus}
                min={min}
                max={max}
                step={step}
                placeholder={field.placeholder}
                className={`${inputWidthClass} h-10 text-base focus:ring-2 focus:ring-offset-1 transition-all ${
                  error 
                    ? "border-destructive focus:ring-destructive focus:border-destructive" 
                    : "focus:ring-purple-500"
                } ${hasUnitSwitcher ? "pr-16" : ""}`}
                inputMode={step === 1 ? "numeric" : "decimal"}
                autoComplete="off"
              />
              {hasUnitSwitcher && (
                <>
                  {isMobile ? (
                    // Mobile: unit toggle below input
                    <div className="flex items-center gap-1 mt-2">
                      {field.supported_units.map((unit) => {
                        const unitLabels: Record<string, string> = {
                          cm: "cm",
                          ft: "ft",
                          kg: "kg",
                          lb: "lb",
                          c: "°C",
                          f: "°F",
                          inch: "in",
                        };
                        const isActive = unit === activeUnit;
                        return (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => {
                              if (onUnitChange && value !== null && value !== undefined) {
                                const convertedValue = convertUnit(value, activeUnit, unit, field);
                                onChange(convertedValue);
                              }
                              onUnitChange?.(unit);
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                              isActive
                                ? "bg-purple-600 text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                            }`}
                          >
                            {unitLabels[unit] || unit}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    // Desktop: unit toggle inline
                    <div className="absolute right-2 flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                      {field.supported_units.map((unit) => {
                        const unitLabels: Record<string, string> = {
                          cm: "cm",
                          ft: "ft",
                          kg: "kg",
                          lb: "lb",
                          c: "°C",
                          f: "°F",
                          inch: "in",
                        };
                        const isActive = unit === activeUnit;
                        return (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => {
                              if (onUnitChange && value !== null && value !== undefined) {
                                const convertedValue = convertUnit(value, activeUnit, unit, field);
                                onChange(convertedValue);
                              }
                              onUnitChange?.(unit);
                            }}
                            className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${
                              isActive
                                ? "bg-purple-600 text-white"
                                : "text-muted-foreground hover:bg-muted-foreground/20"
                            }`}
                          >
                            {unitLabels[unit] || unit}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
            {min !== undefined && max !== undefined && !error && (
              <p className="text-xs text-muted-foreground">Range: {min}–{max} {activeUnit}</p>
            )}
            {sectionCode === "vitals" && value != null && value !== "" && (min !== undefined || max !== undefined) &&
              ((min !== undefined && Number(value) < min) || (max !== undefined && Number(value) > max)) && (
                <p className="text-xs text-amber-600 dark:text-amber-400">Unusual value</p>
              )}
          </div>
        );

      case "text":
        const textValue = value ?? "";
        const textError = error || 
          (field.minLength && textValue.length > 0 && textValue.length < field.minLength 
            ? `${field.label} must be at least ${field.minLength} characters` 
            : undefined) ||
          (field.maxLength && textValue.length > field.maxLength 
            ? `${field.label} must be at most ${field.maxLength} characters` 
            : undefined) ||
          (field.validation?.pattern && textValue && !new RegExp(field.validation.pattern).test(textValue)
            ? field.validation.message || `${field.label} format is invalid`
            : undefined);
            
        if (field.multiline) {
          return (
            <div className="space-y-1.5">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {displayLabel}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Textarea
                id={field.key}
                value={textValue}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  // For textarea, only handle Enter+Ctrl/Cmd to move to next field
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    onKeyDown?.(e);
                  }
                }}
                autoFocus={autoFocus}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                className={`w-full min-h-[80px] text-sm focus:ring-2 focus:ring-offset-1 transition-all resize-y ${
                  textError 
                    ? "border-destructive focus:ring-destructive focus:border-destructive" 
                    : "focus:ring-purple-500"
                }`}
                rows={3}
              />
              {field.maxLength && (
                <p className="text-xs text-muted-foreground text-right">
                  {textValue.length}/{field.maxLength} characters
                </p>
              )}
            </div>
          );
        }
        return (
          <div className="space-y-1.5">
            <Label htmlFor={field.key} className="text-sm font-medium">
              {displayLabel}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.key}
              type="text"
              value={textValue}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              autoFocus={autoFocus}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              className={`w-full max-w-xs h-10 text-sm focus:ring-2 focus:ring-offset-1 transition-all ${
                textError 
                  ? "border-destructive focus:ring-destructive focus:border-destructive" 
                  : "focus:ring-purple-500"
              }`}
              autoComplete="off"
            />
            {field.maxLength && (
              <p className="text-xs text-muted-foreground text-right">
                {textValue.length}/{field.maxLength}
              </p>
            )}
          </div>
        );

      case "single_select":
        const selectedOption = normalizedOptions.find((opt) => opt.value === value);
        return (
          <div className="space-y-1.5">
            <Label htmlFor={field.key} className="text-sm font-medium">
              {displayLabel}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value ?? ""}
              onValueChange={onChange}
            >
              <SelectTrigger 
                id={field.key} 
                className={`w-full max-w-[12rem] min-w-[8rem] h-10 text-sm focus:ring-2 focus:ring-offset-1 transition-all ${
                  error 
                    ? "border-destructive focus:ring-destructive focus:border-destructive" 
                    : "focus:ring-purple-500"
                }`}
              >
                <SelectValue placeholder={field.placeholder || "Select an option..."}>
                  {selectedOption ? (
                    <span className="font-medium text-foreground">{selectedOption.label}</span>
                  ) : (
                    <span className="text-muted-foreground">{field.placeholder || "Select an option..."}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {normalizedOptions.map((option, index) => {
                  const isSelected = option.value === value;
                  return (
                    <SelectItem 
                      key={`${field.key}-${option.value}-${index}`} 
                      value={option.value}
                      className={`cursor-pointer focus:bg-purple-50 focus:text-purple-900 dark:focus:bg-purple-950 dark:focus:text-purple-100 ${
                        isSelected ? "bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-100 font-medium" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="text-purple-600 dark:text-purple-400">✓</span>
                        )}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );

      case "multi_select":
        return (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {displayLabel}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-md p-2 max-w-2xl bg-background focus-within:ring-2 focus-within:ring-purple-500/20 transition-all ${
              error 
                ? "border-destructive focus-within:border-destructive" 
                : "border-border focus-within:border-purple-500"
            }`}>
              {normalizedOptions.map((option, index) => {
                const isChecked = Array.isArray(value) && value.includes(option.value);
                return (
                  <label
                    key={`${field.key}-${option.value}-${index}`}
                    htmlFor={`${field.key}-${option.value}-${index}`}
                    className={`flex items-center space-x-2 py-1.5 px-2 rounded cursor-pointer transition-all hover:bg-muted/50 focus-within:bg-muted/50 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-1 ${
                      isChecked ? "bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800" : ""
                    }`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        const checkbox = document.getElementById(`${field.key}-${option.value}-${index}`) as HTMLButtonElement;
                        checkbox?.click();
                      }
                    }}
                  >
                    <Checkbox
                      id={`${field.key}-${option.value}-${index}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentValues = Array.isArray(value) ? value : [];
                        if (checked) {
                          onChange([...currentValues, option.value]);
                        } else {
                          onChange(currentValues.filter((v) => v !== option.value));
                        }
                      }}
                      className="h-4 w-4 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <span className={`text-sm flex-1 select-none ${
                      isChecked ? "font-medium text-purple-900 dark:text-purple-100" : "text-foreground"
                    }`}>
                      {option.label}
                    </span>
                    {isChecked && (
                      <span className="text-purple-600 dark:text-purple-400 text-sm font-medium">✓</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              {displayLabel} (Unsupported type: {field.type})
            </Label>
          </div>
        );
    }
  }
);

DynamicFieldRenderer.displayName = "DynamicFieldRenderer";
