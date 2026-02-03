/**
 * Dynamic Field Component
 * 
 * Renders form fields based on template metadata
 * Supports: number, text, single_select, multi_select, etc.
 */

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldConfig } from "@/lib/validation/dynamic-validator";
import { cn } from "@/lib/utils";

interface DynamicFieldProps {
  field: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  className?: string;
}

export function DynamicField({
  field,
  value,
  onChange,
  error,
  onBlur,
  className,
}: DynamicFieldProps) {
  const renderField = () => {
    switch (field.type) {
      case "number":
        return (
          <Input
            id={field.key}
            type="number"
            inputMode="decimal"
            placeholder={field.placeholder || `Enter ${field.label}`}
            value={value || ""}
            onChange={(e) => {
              const numValue = e.target.value === "" ? "" : Number(e.target.value);
              onChange(numValue);
            }}
            onBlur={onBlur}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.step || 1}
            className={cn("h-9 text-sm", error && "border-destructive", className)}
          />
        );

      case "text":
        if (field.multiline) {
          return (
            <Textarea
              id={field.key}
              placeholder={field.placeholder || `Enter ${field.label}`}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              className={cn(error && "border-destructive", className)}
              rows={3}
            />
          );
        }
        return (
          <Input
            id={field.key}
            type="text"
            placeholder={field.placeholder || `Enter ${field.label}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={cn("h-9 text-sm", error && "border-destructive", className)}
          />
        );

      case "single_select":
        return (
          <Select
            value={value || ""}
            onValueChange={onChange}
          >
            <SelectTrigger
              id={field.key}
              className={cn("h-9 text-sm", error && "border-destructive", className)}
            >
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi_select":
        // For multi-select, you might want to use a Checkbox group or custom component
        return (
          <div className="space-y-2">
            {field.options?.map((option: string) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      onChange([...currentValues, option]);
                    } else {
                      onChange(currentValues.filter((v: string) => v !== option));
                    }
                  }}
                  onBlur={onBlur}
                  className="rounded"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case "calculated":
        // Read-only display field
        return (
          <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium">
            {value || "—"}
          </div>
        );

      default:
        return (
          <Input
            id={field.key}
            type="text"
            placeholder={`Enter ${field.label}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={cn("h-9 text-sm", error && "border-destructive", className)}
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key} className="text-xs font-medium">
        {field.label}
        {field.validation?.required && <span className="text-destructive ml-1">*</span>}
        {field.unit && (
          <span className="text-muted-foreground ml-1">({field.unit})</span>
        )}
      </Label>
      {renderField()}
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
