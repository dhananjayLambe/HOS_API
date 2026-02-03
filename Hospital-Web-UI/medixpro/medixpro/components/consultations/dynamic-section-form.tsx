"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DynamicFieldRenderer } from "./dynamic-field-renderer";
import { usePreConsultationTemplateStore } from "@/store/preConsultationTemplateStore";
import { Separator } from "@/components/ui/separator";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface DynamicSectionFormProps {
  sectionCode: string;
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  saveButtonText?: string;
}

export function DynamicSectionForm({
  sectionCode,
  initialData,
  onSave,
  onCancel,
  saveButtonText = "Save",
}: DynamicSectionFormProps) {
  const toast = useToastNotification();
  const {
    template,
    fetchTemplate,
    clearTemplate,
    getSectionConfig,
    getDefaultRequiredFields,
    getDefaultOptionalFields,
  } = usePreConsultationTemplateStore();

  // Get section from template
  const section = useMemo(() => {
    if (!template?.template?.sections) return null;
    return template.template.sections.find((s) => s.section === sectionCode);
  }, [template, sectionCode]);

  const [hasRetriedTemplateFetch, setHasRetriedTemplateFetch] = useState(false);

  // Fetch template if not loaded; if loaded but this section missing, clear cache and refetch once
  useEffect(() => {
    if (!template) {
      fetchTemplate();
      return;
    }

    if (!section && !hasRetriedTemplateFetch) {
      setHasRetriedTemplateFetch(true);
      clearTemplate();
      fetchTemplate();
    }
  }, [template, section, fetchTemplate, clearTemplate, hasRetriedTemplateFetch]);

  const sectionConfig = getSectionConfig(sectionCode);
  const defaultRequired = getDefaultRequiredFields(sectionCode);
  const defaultOptional = getDefaultOptionalFields(sectionCode);

  // Normalize initial data to flat structure: { [itemCode]: { [fieldKey]: value } }
  const [sectionData, setSectionData] = useState<Record<string, Record<string, any>>>({});

  // Update sectionData when section or initialData changes
  useEffect(() => {
    if (!section) {
      // If section not loaded yet, set empty state
      setSectionData({});
      return;
    }

    if (!initialData) {
      setSectionData({});
      return;
    }
    
    try {
      // Transform initialData to normalized structure
      const normalized: Record<string, Record<string, any>> = {};
      
      if (!section.items || !Array.isArray(section.items)) {
        console.warn(`Section ${sectionCode} has no items array`);
        setSectionData({});
        return;
      }
      
      section.items.forEach((item) => {
        if (!item.code || !item.fields) {
          console.warn(`Invalid item in section ${sectionCode}:`, item);
          return;
        }
        
        normalized[item.code] = {};
        item.fields.forEach((field) => {
          if (!field.key) {
            console.warn(`Invalid field in item ${item.code}:`, field);
            return;
          }
          
          // Try multiple strategies to find the value:
          // 1. Check if item code matches a top-level key (e.g., initialData.height_weight)
          const itemData = initialData[item.code];
          if (itemData && typeof itemData === "object" && itemData[field.key] !== undefined) {
            normalized[item.code][field.key] = itemData[field.key];
          }
          // 2. Check if field key is directly at top level (e.g., initialData.complaint)
          else if (initialData[field.key] !== undefined) {
            normalized[item.code][field.key] = initialData[field.key];
          }
          // 3. For legacy structures, try matching field key in nested objects
          // (e.g., initialData.height_weight.height_cm where item.code might be "height_weight")
          else {
            // Check all top-level keys that might contain this field
            for (const key in initialData) {
              if (initialData[key] && typeof initialData[key] === "object" && initialData[key][field.key] !== undefined) {
                normalized[item.code][field.key] = initialData[key][field.key];
                break;
              }
            }
          }
        });
      });
      
      setSectionData(normalized);
    } catch (error) {
      console.error(`Error normalizing section data for ${sectionCode}:`, error);
      setSectionData({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, section]);

  // Separate items into required, optional, and hidden
  const [showHiddenFields, setShowHiddenFields] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const VITALS_OPTIONAL_STORAGE_KEY = "vitals_optional_selection";
  const [selectedHiddenItems, setSelectedHiddenItems] = useState<Set<string>>(() => {
    if (sectionCode !== "vitals") return new Set();
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(VITALS_OPTIONAL_STORAGE_KEY) : null;
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        return new Set(Array.isArray(arr) ? arr : []);
      }
    } catch (_) {}
    return new Set();
  });
  const [fieldUnits, setFieldUnits] = useState<Record<string, string>>({}); // Track unit per field
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Persist last-used optional vitals when selection changes
  useEffect(() => {
    if (sectionCode !== "vitals") return;
    try {
      localStorage.setItem(VITALS_OPTIONAL_STORAGE_KEY, JSON.stringify([...selectedHiddenItems]));
    } catch (_) {}
  }, [sectionCode, selectedHiddenItems]);

  // Sort fields by tab_order and group by ui_group
  const processFields = useCallback((items: Array<{ code: string; label?: string; fields: any[] }>) => {
    return items.map((item) => {
      // Sort fields by tab_order (if present), otherwise maintain order
      const sortedFields = [...item.fields].sort((a, b) => {
        const orderA = a.tab_order ?? 999;
        const orderB = b.tab_order ?? 999;
        return orderA - orderB;
      });

      // Group fields by ui_group
      const groups: Record<string, any[]> = {};
      const ungrouped: any[] = [];

      sortedFields.forEach((field) => {
        if (field.ui_group) {
          if (!groups[field.ui_group]) {
            groups[field.ui_group] = [];
          }
          groups[field.ui_group].push(field);
        } else {
          ungrouped.push(field);
        }
      });

      // Process groups
      const processedFields: Array<any> = [];

      // Process ui_group: layout from metadata only (no field-name hardcoding)
      // Body group: all fields in one row (max 3), order by tab_order
      if (groups["body"]) {
        const bodyFields = groups["body"];
        processedFields.push({
          type: "row",
          fields: bodyFields.slice(0, 3),
          group: "body",
          itemCode: item.code,
        });
        delete groups["body"];
      }

      // BP group: exactly two fields → clinical BP row [ sys ] / [ dia ] mmHg
      if (groups["bp"]) {
        const bpFields = groups["bp"];
        if (bpFields.length >= 2) {
          processedFields.push({
            type: "bp_pair",
            fields: [bpFields[0], bpFields[1]],
            group: "bp",
            itemCode: item.code,
          });
        } else {
          processedFields.push(...bpFields);
        }
        delete groups["bp"];
      }

      // Basic/quick vitals: max 3 per row
      if (groups["basic"]) {
        const basicFields = groups["basic"];
        for (let i = 0; i < basicFields.length; i += 3) {
          const chunk = basicFields.slice(i, i + 3);
          if (chunk.length === 1) {
            processedFields.push(chunk[0]);
          } else {
            processedFields.push({
              type: "row",
              fields: chunk,
              group: "basic",
              itemCode: item.code,
            });
          }
        }
        delete groups["basic"];
      }

      // Generic "row" group (chief_complaint duration, severity, location, etc.): all fields in one row
      if (groups["row"]) {
        const rowFields = groups["row"];
        processedFields.push({
          type: "row",
          fields: rowFields.slice(0, 4),
          group: "row",
          itemCode: item.code,
        });
        delete groups["row"];
      }

      // Process remaining groups
      Object.values(groups).forEach((groupFields) => {
        processedFields.push(...groupFields);
      });

      // Add ungrouped fields (also check for pair_with for backward compatibility)
      const processedUngrouped = new Set<string>();
      const ungroupedList: any[] = [];
      ungrouped.forEach((field) => {
        if (processedUngrouped.has(field.key)) return;
        if (field.pair_with) {
          const pairedField = ungrouped.find((f) => f.key === field.pair_with && !processedUngrouped.has(f.key));
          if (pairedField) {
            processedFields.push([field, pairedField]);
            processedUngrouped.add(field.key);
            processedUngrouped.add(pairedField.key);
          } else {
            ungroupedList.push(field);
            processedUngrouped.add(field.key);
          }
        } else {
          ungroupedList.push(field);
          processedUngrouped.add(field.key);
        }
      });

      // Fallback: 2–4 ungrouped non-multiline fields → one row (Chief Complaint duration/severity, etc.)
      const canRow = ungroupedList.length >= 2 && ungroupedList.length <= 4 &&
        ungroupedList.every((f) => !f.multiline);
      if (canRow && ungroupedList.length > 0) {
        processedFields.push({
          type: "row",
          fields: ungroupedList,
          group: "row",
          itemCode: item.code,
        });
      } else {
        ungroupedList.forEach((f) => processedFields.push(f));
      }

      return { ...item, processedFields };
    });
  }, []);

  const { requiredItems, optionalItems, hiddenItems } = useMemo(() => {
    if (!section) return { requiredItems: [], optionalItems: [], hiddenItems: [] };

    const required: typeof section.items = [];
    const optional: typeof section.items = [];
    const hidden: typeof section.items = [];

    section.items.forEach((item) => {
      if (defaultRequired.includes(item.code)) {
        required.push(item);
      } else if (defaultOptional.includes(item.code)) {
        optional.push(item);
      } else {
        hidden.push(item);
      }
    });

    let req = processFields(required);
    let opt = processFields(optional);
    const hid = processFields(hidden);

    // Vitals: merge items that are single-field with ui_group "basic" into one row (Temp + Pulse + SpO₂)
    if (sectionCode === "vitals") {
      const extractBasic = (items: any[]) => {
        const basic: { field: any; itemCode: string }[] = [];
        const rest: any[] = [];
        items.forEach((item: any) => {
          const processed = item.processedFields || item.fields || [];
          const single = processed.length === 1 && processed[0] && processed[0].key;
          const isBasic = single && processed[0].ui_group === "basic";
          if (isBasic) basic.push({ field: processed[0], itemCode: item.code });
          else rest.push(item);
        });
        return { basic, rest };
      };
      const fromReq = extractBasic(req);
      const fromOpt = extractBasic(opt);
      const allBasic = [...fromReq.basic, ...fromOpt.basic];
      if (allBasic.length > 0) {
        const basicRow = { code: "_basic_", label: "", processedFields: [{ type: "basic_row", fields: allBasic }] };
        req = fromReq.rest.length ? fromReq.rest : [basicRow];
        opt = fromOpt.rest;
        if (fromReq.basic.length > 0) req = [...fromReq.rest, basicRow];
        if (fromOpt.basic.length > 0) opt = [basicRow, ...fromOpt.rest];
      }
    }

    // Allergies: merge allergy_type + allergen into one row
    if (sectionCode === "allergies") {
      const aType = req.find((i: any) => i.code === "allergy_type");
      const aGen = req.find((i: any) => i.code === "allergen");
      const getFirstField = (it: any) => (it?.processedFields?.[0]?.key ? it.processedFields[0] : it?.fields?.[0]);
      const f1 = getFirstField(aType);
      const f2 = getFirstField(aGen);
      if (f1 && f2) {
        const topRow = {
          code: "_allergies_top_",
          label: "",
          processedFields: [{
            type: "basic_row",
            fields: [
              { field: f1, itemCode: "allergy_type" },
              { field: f2, itemCode: "allergen" },
            ],
          }],
        };
        req = [topRow, ...req.filter((i: any) => i.code !== "allergy_type" && i.code !== "allergen")];
      }
    }

    return { requiredItems: req, optionalItems: opt, hiddenItems: hid };
  }, [section, defaultRequired, defaultOptional, processFields, sectionCode]);

  // Vitals: build rows directly from section.items by item code (no dependency on ui_group / processFields)
  const vitalsFlatRows = useMemo(() => {
    if (sectionCode !== "vitals" || !section?.items?.length) return [];
    const itemByCode: Record<string, any> = {};
    section.items.forEach((it: any) => {
      if (it.code && it.fields?.length) itemByCode[it.code] = it;
    });
    const order = [...defaultRequired, ...defaultOptional];
    const rows: Array<{ type: string; itemCode?: string; fields?: any[]; field?: any }> = [];
    const basicCollect: { field: any; itemCode: string }[] = [];

    order.forEach((code) => {
      const item = itemByCode[code];
      if (!item) return;
      const fields = item.fields || [];
      if (code === "height_weight" && fields.length >= 1) {
        rows.push({ type: "row", itemCode: code, fields: fields.slice(0, 4) });
      } else if (code === "blood_pressure" && fields.length >= 2) {
        rows.push({ type: "bp_pair", itemCode: code, fields: [fields[0], fields[1]] });
      } else if (["temperature", "pulse", "spo2"].includes(code) && fields.length >= 1) {
        basicCollect.push({ field: fields[0], itemCode: code });
      } else if (code === "additional_notes" && fields.length >= 1) {
        rows.push({ type: "single", itemCode: code, field: fields[0] });
      } else if (!["height_weight", "blood_pressure", "temperature", "pulse", "spo2", "additional_notes"].includes(code)) {
        if (fields.length === 1) rows.push({ type: "single", itemCode: code, field: fields[0] });
        else if (fields.length >= 2) rows.push({ type: "row", itemCode: code, fields });
      }
    });

    if (basicCollect.length > 0) {
      rows.push({ type: "basic_row", fields: basicCollect });
    }
    return rows;
  }, [sectionCode, section, defaultRequired, defaultOptional]);

  // Get all field IDs in tab order for keyboard navigation
  const allFieldIds = useMemo(() => {
    const ids: string[] = [];
    // Vitals: use vitalsFlatRows order so tab order matches visual order
    if (sectionCode === "vitals" && vitalsFlatRows.length > 0) {
      vitalsFlatRows.forEach((row: any) => {
        if (row.type === "row" && row.fields) row.fields.forEach((f: any) => { if (f?.key) ids.push(f.key); });
        else if (row.type === "bp_pair" && row.fields) row.fields.forEach((f: any) => { if (f?.key) ids.push(f.key); });
        else if (row.type === "basic_row" && row.fields) row.fields.forEach((f: any) => { if (f?.field?.key) ids.push(f.field.key); });
        else if (row.type === "single" && row.field?.key) ids.push(row.field.key);
      });
      return ids;
    }
    [...requiredItems, ...optionalItems, ...(showHiddenFields ? hiddenItems.filter(item => selectedHiddenItems.has(item.code)) : [])].forEach((item: any) => {
      const fields = (item as any).processedFields || item.fields || [];
      fields.forEach((fieldOrGroup: any) => {
        // Handle grouped fields (row, bp_pair)
        if (fieldOrGroup.type === "row" || fieldOrGroup.type === "bp_pair") {
          fieldOrGroup.fields.forEach((f: any) => {
            if (f && f.key) ids.push(f.key);
          });
        } else if (fieldOrGroup.type === "basic_row") {
          fieldOrGroup.fields.forEach((f: any) => {
            if (f && f.field && f.field.key) ids.push(f.field.key);
          });
        }
        // Handle array pairs (legacy)
        else if (Array.isArray(fieldOrGroup)) {
          fieldOrGroup.forEach((f: any) => {
            if (f && f.key) ids.push(f.key);
          });
        }
        // Handle single fields
        else if (fieldOrGroup && fieldOrGroup.key) {
          ids.push(fieldOrGroup.key);
        }
      });
    });
    return ids;
  }, [sectionCode, vitalsFlatRows, requiredItems, optionalItems, hiddenItems, showHiddenFields, selectedHiddenItems]);

  // Auto-focus first field on mount
  useEffect(() => {
    if (allFieldIds.length > 0 && firstFieldRef.current === null) {
      const firstFieldId = allFieldIds[0];
      const firstFieldElement = document.getElementById(firstFieldId);
      if (firstFieldElement) {
        firstFieldElement.focus();
        firstFieldRef.current = firstFieldElement as HTMLInputElement;
      }
    }
  }, [allFieldIds]);

  
  // Real-time validation helper
  const validateField = useCallback((itemCode: string, field: any, value: any): string | undefined => {
    const fieldKey = `${itemCode}.${field.key}`;
    
    // Required validation
    if (field.required && (value === undefined || value === null || value === "")) {
      return `${field.label} is required`;
    }
    
    // Skip other validations if field is empty and not required
    if ((value === undefined || value === null || value === "") && !field.required) {
      return undefined;
    }
    
    // Number validation
    if (field.type === "number" && value !== null && value !== undefined && value !== "") {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `${field.label} must be a valid number`;
      }
      if (field.min !== undefined && numValue < field.min) {
        return `${field.label} must be at least ${field.min}${field.unit ? ` ${field.unit}` : ""}`;
      }
      if (field.max !== undefined && numValue > field.max) {
        return `${field.label} must be at most ${field.max}${field.unit ? ` ${field.unit}` : ""}`;
      }
      if (field.range && (numValue < field.range[0] || numValue > field.range[1])) {
        return `${field.label} must be between ${field.range[0]} and ${field.range[1]}${field.unit ? ` ${field.unit}` : ""}`;
      }
    }
    
    // Text validation
    if (field.type === "text" && value !== null && value !== undefined && value !== "") {
      const textValue = String(value);
      if (field.minLength && textValue.length < field.minLength) {
        return `${field.label} must be at least ${field.minLength} characters`;
      }
      if (field.maxLength && textValue.length > field.maxLength) {
        return `${field.label} must be at most ${field.maxLength} characters`;
      }
      if (field.validation?.pattern) {
        const pattern = new RegExp(field.validation.pattern);
        if (!pattern.test(textValue)) {
          return field.validation.message || `${field.label} format is invalid`;
        }
      }
    }
    
    // Select validation
    if (field.type === "single_select" && field.required && (!value || value === "")) {
      return `${field.label} must be selected`;
    }
    
    // Multi-select validation
    if (field.type === "multi_select" && field.required) {
      const arrayValue = Array.isArray(value) ? value : [];
      if (arrayValue.length === 0) {
        return `At least one ${field.label} must be selected`;
      }
    }
    
    return undefined;
  }, []);

  const handleFieldChange = useCallback((itemCode: string, fieldKey: string, value: any) => {
    setSectionData((prev) => ({
      ...prev,
      [itemCode]: {
        ...(prev[itemCode] || {}),
        [fieldKey]: value,
      },
    }));
    
    // Real-time validation (vitals: never block or show hard errors)
    if (section && sectionCode !== "vitals") {
      const item = section.items.find((i) => i.code === itemCode);
      const field = item?.fields.find((f) => f.key === fieldKey);
      if (field) {
        const fieldKeyFull = `${itemCode}.${fieldKey}`;
        setTouchedFields((prev) => new Set(prev).add(fieldKeyFull));
        const error = validateField(itemCode, field, value);
        setValidationErrors((prev) => {
          if (error) return { ...prev, [fieldKeyFull]: error };
          const newErrors = { ...prev };
          delete newErrors[fieldKeyFull];
          return newErrors;
        });
      }
    }
  }, [section, sectionCode, validateField]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vitals: never block save; no hard validation (rule 10)
    const isVitals = sectionCode === "vitals";
    const errors: string[] = [];
    const fieldErrors: Record<string, string> = {};
    
    if (section && !isVitals) {
      const defaultRequired = getDefaultRequiredFields(sectionCode);
      
      defaultRequired.forEach((itemCode) => {
        const item = section.items.find((i) => i.code === itemCode);
        if (item) {
          const itemData = sectionData[itemCode] || {};
          const hasAnyValue = item.fields.some((field) => {
            const value = itemData[field.key];
            return value !== undefined && value !== null && value !== "";
          });
          if (!hasAnyValue) {
            const errorMsg = `${item.label} is required`;
            errors.push(errorMsg);
            item.fields.forEach((field) => {
              fieldErrors[`${itemCode}.${field.key}`] = errorMsg;
            });
          }
          item.fields.forEach((field) => {
            const fieldKey = `${itemCode}.${field.key}`;
            const value = itemData[field.key];
            if ((value === undefined || value === null || value === "") && !field.required) return;
            if (field.required && (value === undefined || value === null || value === "")) {
              if (!fieldErrors[fieldKey]) {
                errors.push(`${field.label} is required`);
                fieldErrors[fieldKey] = `${field.label} is required`;
              }
              return;
            }
            if (field.type === "number" && value !== null && value !== undefined && value !== "") {
              const numValue = Number(value);
              if (isNaN(numValue)) {
                errors.push(`${field.label} must be a valid number`);
                fieldErrors[fieldKey] = `${field.label} must be a valid number`;
              } else {
                if (field.min !== undefined && numValue < field.min) {
                  errors.push(`${field.label} must be at least ${field.min}`);
                  fieldErrors[fieldKey] = `${field.label} must be at least ${field.min}`;
                }
                if (field.max !== undefined && numValue > field.max) {
                  errors.push(`${field.label} must be at most ${field.max}`);
                  fieldErrors[fieldKey] = `${field.label} must be at most ${field.max}`;
                }
                if (field.range && (numValue < field.range[0] || numValue > field.range[1])) {
                  errors.push(`${field.label} must be between ${field.range[0]} and ${field.range[1]}`);
                  fieldErrors[fieldKey] = `${field.label} must be between ${field.range[0]} and ${field.range[1]}`;
                }
              }
            }
            if (field.type === "text" && value !== null && value !== undefined && value !== "") {
              const textValue = String(value);
              if (field.minLength && textValue.length < field.minLength) {
                errors.push(`${field.label} must be at least ${field.minLength} characters`);
                fieldErrors[fieldKey] = `${field.label} must be at least ${field.minLength} characters`;
              }
              if (field.maxLength && textValue.length > field.maxLength) {
                errors.push(`${field.label} must be at most ${field.maxLength} characters`);
                fieldErrors[fieldKey] = `${field.label} must be at most ${field.maxLength} characters`;
              }
              if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(textValue)) {
                const errorMsg = field.validation.message || `${field.label} format is invalid`;
                errors.push(errorMsg);
                fieldErrors[fieldKey] = errorMsg;
              }
            }
            if (field.type === "single_select" && field.required && (!value || value === "")) {
              errors.push(`${field.label} must be selected`);
              fieldErrors[fieldKey] = `${field.label} must be selected`;
            }
            if (field.type === "multi_select" && field.required) {
              const arrayValue = Array.isArray(value) ? value : [];
              if (arrayValue.length === 0) {
                errors.push(`At least one ${field.label} must be selected`);
                fieldErrors[fieldKey] = `At least one ${field.label} must be selected`;
              }
            }
          });
        }
      });
    }

    if (section) {
      const allFieldKeys = new Set<string>();
      section.items.forEach((item) => {
        item.fields.forEach((field) => {
          allFieldKeys.add(`${item.code}.${field.key}`);
        });
      });
      setTouchedFields(allFieldKeys);
    }
    
    setValidationErrors(fieldErrors);

    if (!isVitals && errors.length > 0) {
      // Show validation errors using toast
      const errorSummary = errors.slice(0, 3).join(", ") + (errors.length > 3 ? ` and ${errors.length - 3} more` : "");
      toast.error(`Please fix the following: ${errorSummary}`);
      
      // Scroll to first error
      const firstErrorKey = Object.keys(fieldErrors)[0];
      if (firstErrorKey) {
        const [itemCode, fieldKey] = firstErrorKey.split(".");
        const element = document.getElementById(fieldKey);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.focus();
        }
      }
      return;
    }
    
    setValidationErrors({});
    
    // Transform normalized data back to expected format
    // The backend expects: { [itemCode]: { [fieldKey]: value } }
    const transformedData: any = {};
    
    Object.keys(sectionData).forEach((itemCode) => {
      const itemData = sectionData[itemCode];
      if (Object.keys(itemData).length > 0) {
        // Always nest by item code for consistency
        transformedData[itemCode] = { ...itemData };
      }
    });

    // Clean empty values but keep structure
    const cleanedData: any = {};
    Object.keys(transformedData).forEach((key) => {
      const value = transformedData[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const cleaned = Object.fromEntries(
          Object.entries(value).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
        );
        if (Object.keys(cleaned).length > 0) {
          cleanedData[key] = cleaned;
        }
      } else if (value !== "" && value !== null && value !== undefined) {
        cleanedData[key] = value;
      }
    });

    // Special handling for chief_complaint: ensure primary_complaint.complaint_text is preserved
    if (sectionCode === "chief_complaint" && cleanedData.primary_complaint) {
      // Ensure the structure is correct
      if (!cleanedData.primary_complaint.complaint_text && cleanedData.primary_complaint.complaint) {
        // Legacy format support
        cleanedData.primary_complaint.complaint_text = cleanedData.primary_complaint.complaint;
        delete cleanedData.primary_complaint.complaint;
      }
    }

    onSave(cleanedData);
  };

  if (!template) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Loading template...</p>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onCancel} className="h-9 text-sm">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (!section) {
    // In production, fail silently in the dialog if section is missing
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This section is not available in the current template.
        </p>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onCancel} className="h-9 text-sm">
            Close
          </Button>
        </div>
      </div>
    );
  }

  // Handle keyboard navigation with proper auto-scrolling
  const handleKeyDown = useCallback((e: React.KeyboardEvent, currentFieldKey: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Don't submit on Enter for textarea fields (allow multiline)
      const isTextarea = (e.target as HTMLElement).tagName === "TEXTAREA";
      if (isTextarea) {
        return; // Let textarea handle Enter naturally
      }

      const currentIndex = allFieldIds.indexOf(currentFieldKey);
      if (currentIndex === -1) return;

      // If last field, submit form
      if (currentIndex === allFieldIds.length - 1) {
        e.preventDefault();
        const form = e.currentTarget.closest("form");
        if (form) {
          const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
        return;
      }

      // Otherwise, focus next field and auto-scroll it into view
      const nextFieldId = allFieldIds[currentIndex + 1];
      const nextFieldElement = document.getElementById(nextFieldId);
      if (nextFieldElement) {
        e.preventDefault();
        
        // Find the scrollable container (DialogContent with overflow-y-auto)
        const formElement = e.currentTarget.closest("form");
        let scrollContainer: HTMLElement | null = null;
        
        // Method 1: Find DialogContent directly (most reliable for Chief Complaint)
        const dialog = formElement?.closest("[role='dialog']");
        if (dialog) {
          // Check DialogContent element directly (it has overflow-y-auto class)
          const dialogContent = Array.from(dialog.querySelectorAll("*")).find((el) => {
            const htmlEl = el as HTMLElement;
            const style = window.getComputedStyle(htmlEl);
            return style.overflowY === "auto" || style.overflowY === "scroll" ||
                   htmlEl.classList.contains("overflow-y-auto") ||
                   htmlEl.classList.toString().includes("overflow-y-auto");
          }) as HTMLElement;
          
          if (dialogContent) {
            scrollContainer = dialogContent;
          } else {
            // Fallback: check if dialog itself is scrollable
            const dialogStyle = window.getComputedStyle(dialog as HTMLElement);
            if (dialogStyle.overflowY === "auto" || dialogStyle.overflowY === "scroll") {
              scrollContainer = dialog as HTMLElement;
            }
          }
        }
        
        // Method 2: Traverse up from form to find scrollable parent
        if (!scrollContainer) {
          let parent = formElement?.parentElement;
          let depth = 0;
          while (parent && depth < 5) {
            const style = window.getComputedStyle(parent);
            if (style.overflowY === "auto" || style.overflowY === "scroll" ||
                parent.classList.contains("overflow-y-auto")) {
              scrollContainer = parent;
              break;
            }
            parent = parent.parentElement;
            depth++;
          }
        }
        
        // Focus first
        nextFieldElement.focus();
        
        // Use double requestAnimationFrame for better timing
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollContainer && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
              // Get positions relative to scroll container
              const containerRect = scrollContainer.getBoundingClientRect();
              const elementRect = nextFieldElement.getBoundingClientRect();
              
              // Calculate element position relative to container
              const elementTopRelative = elementRect.top - containerRect.top + scrollContainer.scrollTop;
              
              // Calculate target scroll position to center the element
              const elementHeight = nextFieldElement.offsetHeight || elementRect.height;
              const containerHeight = scrollContainer.clientHeight;
              const targetScroll = elementTopRelative - (containerHeight / 2) + (elementHeight / 2);
              
              // Ensure scroll is within bounds
              const maxScroll = scrollContainer.scrollHeight - containerHeight;
              const finalScroll = Math.max(0, Math.min(targetScroll, maxScroll));
              
              scrollContainer.scrollTo({
                top: finalScroll,
                behavior: "smooth",
              });
            } else {
              // Fallback: scroll element into view (works for window scroll)
              nextFieldElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
              });
            }
          });
        });
        
        // For select elements, open the dropdown after a small delay
        if (nextFieldElement.tagName === "BUTTON") {
          setTimeout(() => {
            (nextFieldElement as HTMLButtonElement).click();
          }, 200);
        }
      }
    }
  }, [allFieldIds]);

  const renderField = useCallback((field: any, itemCode: string, itemData: any, isFirst: boolean, isCompact = false) => {
    const fieldKey = `${itemCode}.${field.key}`;
    const hasError = validationErrors[fieldKey];
    const isTouched = touchedFields.has(fieldKey);
    const showError = hasError && isTouched;
    const currentUnit = fieldUnits[fieldKey] || field.unit || "";
    
    return (
      <div key={field.key} className={showError ? "space-y-1" : isCompact ? "flex-1" : ""}>
        <DynamicFieldRenderer
          field={field}
          value={itemData[field.key]}
          onChange={(value) => handleFieldChange(itemCode, field.key, value)}
          sectionData={sectionData}
          itemCode={itemCode}
          error={showError ? hasError : undefined}
          currentUnit={currentUnit}
          onUnitChange={(unit) => {
            setFieldUnits((prev) => ({ ...prev, [fieldKey]: unit }));
          }}
          onKeyDown={(e) => handleKeyDown(e, field.key)}
          autoFocus={isFirst && firstFieldRef.current === null}
          sectionCode={sectionCode}
        />
        {showError && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
            <span>⚠</span>
            <span>{hasError}</span>
          </p>
        )}
      </div>
    );
  }, [validationErrors, touchedFields, fieldUnits, sectionData, handleFieldChange, handleKeyDown]);

  const renderItem = (item: any) => {
    const itemData = sectionData[item.code] || {};
    const processedFields = (item as any).processedFields || item.fields;

    // Avoid duplicate labels when the item label and the single field label are identical
    const showItemLabel =
      !!item.label &&
      !(
        item.fields &&
        item.fields.length === 1 &&
        item.fields[0].label &&
        item.fields[0].label === item.label
      );

    return (
      <div className="space-y-2">
        {showItemLabel && (
          <div>
            <h4 className="text-sm font-semibold text-foreground">{item.label}</h4>
          </div>
        )}
        <div className="space-y-2">
          {processedFields.map((fieldOrGroup: any, index: number) => {
            const isFirst = index === 0 && !showItemLabel;
            
            // If it's a group object (body: Height+Weight+BMI or basic chunk) — flex keeps all on one row
            if (fieldOrGroup.type === "row") {
              const rowItemCode = (fieldOrGroup as any).itemCode || item.code;
              const rowItemData = sectionData[rowItemCode] || {};
              return (
                <div
                  key={`row-${fieldOrGroup.group}-${index}`}
                  className="flex flex-row gap-3 items-end flex-nowrap min-w-0"
                >
                  {fieldOrGroup.fields.map((field: any, fieldIndex: number) => {
                    const isCalculated = field.type === "calculated";
                    return (
                      <div key={field.key} className="flex-1 min-w-0 flex items-end">
                        {isCalculated
                          ? renderField(field, rowItemCode, rowItemData, false, true)
                          : renderField(field, rowItemCode, rowItemData, isFirst && fieldIndex === 0, true)}
                      </div>
                    );
                  })}
                </div>
              );
            }

            // basic_row: Temp + Pulse + SpO₂ from different items (vitals only) — flex keeps on one row
            if (fieldOrGroup.type === "basic_row") {
              const basicFields = fieldOrGroup.fields as { field: any; itemCode: string }[];
              return (
                <div
                  key={`basic-row-${index}`}
                  className="flex flex-row gap-3 items-end flex-nowrap min-w-0"
                >
                  {basicFields.map(({ field, itemCode: fItemCode }, fieldIndex: number) => (
                    <div key={field.key} className="flex-1 min-w-0 flex items-end">
                      {renderField(field, fItemCode, sectionData[fItemCode] || {}, isFirst && fieldIndex === 0, true)}
                    </div>
                  ))}
                </div>
              );
            }
            
            // If it's a BP pair
            if (fieldOrGroup.type === "bp_pair") {
              const [systolicField, diastolicField] = fieldOrGroup.fields;
              const bpItemCode = (fieldOrGroup as any).itemCode || item.code;
              const bpItemData = sectionData[bpItemCode] || {};
              return (
                <div
                  key={`bp-${systolicField.key}-${diastolicField.key}`}
                  className="flex items-end gap-2 flex-nowrap min-w-0"
                >
                  <Label className="text-sm font-medium whitespace-nowrap self-center shrink-0">BP</Label>
                  <div className="w-[7rem] shrink-0">
                    {renderField(systolicField, bpItemCode, bpItemData, isFirst, true)}
                  </div>
                  <span className="text-base font-medium text-muted-foreground self-center shrink-0">/</span>
                  <div className="w-[7rem] shrink-0">
                    {renderField(diastolicField, bpItemCode, bpItemData, false, true)}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap self-center shrink-0">mmHg</span>
                </div>
              );
            }
            
            // If it's a pair (array) - legacy support; flex keeps on one row
            if (Array.isArray(fieldOrGroup)) {
              const [field1, field2] = fieldOrGroup;
              return (
                <div key={`${field1.key}-${field2.key}`} className="flex flex-row gap-3 items-end flex-nowrap">
                  <div className="flex-1 min-w-0">{renderField(field1, item.code, itemData, isFirst && index === 0)}</div>
                  <div className="flex-1 min-w-0">{renderField(field2, item.code, itemData, false)}</div>
                </div>
              );
            }
            
            // Single field
            return (
              <div key={fieldOrGroup.key} className="grid grid-cols-1 max-w-2xl">
                {renderField(fieldOrGroup, item.code, itemData, isFirst)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render one vitals row (for single-card layout)
  const renderVitalsRow = useCallback((row: any, rowIndex: number) => {
    const isFirst = rowIndex === 0;
    if (row.type === "row") {
      const rowItemCode = row.itemCode || "";
      const rowItemData = sectionData[rowItemCode] || {};
      return (
        <div key={`vitals-row-${rowIndex}`} className="flex flex-row gap-3 items-end flex-nowrap min-w-0">
          {row.fields.map((field: any, fieldIndex: number) => {
            const isCalculated = field.type === "calculated";
            return (
              <div key={field.key} className="flex-1 min-w-0 flex items-end">
                {isCalculated
                  ? renderField(field, rowItemCode, rowItemData, false, true)
                  : renderField(field, rowItemCode, rowItemData, isFirst && fieldIndex === 0, true)}
              </div>
            );
          })}
        </div>
      );
    }
    if (row.type === "bp_pair") {
      const [systolicField, diastolicField] = row.fields;
      const bpItemCode = row.itemCode || "";
      const bpItemData = sectionData[bpItemCode] || {};
      return (
        <div key={`vitals-bp-${rowIndex}`} className="flex items-end gap-2 flex-nowrap min-w-0">
          <Label className="text-sm font-medium whitespace-nowrap self-center shrink-0">BP</Label>
          <div className="w-[7rem] shrink-0">
            {renderField(systolicField, bpItemCode, bpItemData, isFirst, true)}
          </div>
          <span className="text-base font-medium text-muted-foreground self-center shrink-0">/</span>
          <div className="w-[7rem] shrink-0">
            {renderField(diastolicField, bpItemCode, bpItemData, false, true)}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap self-center shrink-0">mmHg</span>
        </div>
      );
    }
    if (row.type === "basic_row") {
      const basicFields = row.fields as { field: any; itemCode: string }[];
      return (
        <div key={`vitals-basic-${rowIndex}`} className="flex flex-row gap-3 items-end flex-nowrap min-w-0">
          {basicFields.map(({ field, itemCode: fItemCode }, fieldIndex: number) => (
            <div key={field.key} className="flex-1 min-w-0 flex items-end">
              {renderField(field, fItemCode, sectionData[fItemCode] || {}, isFirst && fieldIndex === 0, true)}
            </div>
          ))}
        </div>
      );
    }
    if (row.type === "pair" && row.fields) {
      const [field1, field2] = row.fields;
      const itemCode = row.itemCode || "";
      const itemData = sectionData[itemCode] || {};
      return (
        <div key={`vitals-pair-${rowIndex}`} className="flex flex-row gap-3 items-end flex-nowrap">
          {renderField(field1, itemCode, itemData, isFirst, true)}
          {renderField(field2, itemCode, itemData, false, true)}
        </div>
      );
    }
    if (row.type === "single" && row.field) {
      const itemCode = row.itemCode || "";
      const itemData = sectionData[itemCode] || {};
      return (
        <div key={`vitals-single-${rowIndex}-${row.field.key}`} className="min-w-0">
          {renderField(row.field, itemCode, itemData, isFirst, false)}
        </div>
      );
    }
    return null;
  }, [sectionData, renderField]);

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pb-4">
      {/* Vitals: single compact card with all rows to avoid scrolling */}
      {sectionCode === "vitals" && vitalsFlatRows.length > 0 ? (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2">
          {vitalsFlatRows.map((row, idx) => renderVitalsRow(row, idx))}
        </div>
      ) : (
        <>
          {/* Required Items */}
          {requiredItems.length > 0 && (
            <div className="space-y-3">
              {requiredItems.map((item) => (
                <div key={item.code} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  {renderItem(item)}
                </div>
              ))}
            </div>
          )}

          {/* Optional Items */}
          {optionalItems.length > 0 && (
            <div className="space-y-3">
              {optionalItems.map((item) => (
                <div key={item.code} className="p-3 bg-muted/20 rounded-lg border border-border/50">
                  {renderItem(item)}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Hidden Items - Expandable with Checkbox Selection */}
      {hiddenItems.length > 0 && (
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowHiddenFields(!showHiddenFields)}
            className="w-full justify-between h-10 text-sm font-medium hover:bg-muted transition-all"
          >
            <span className="flex items-center gap-2">
              <span>{showHiddenFields ? "−" : "+"}</span>
              <span>Add More Fields ({hiddenItems.length})</span>
            </span>
          </Button>
          {showHiddenFields && (
            <div className="space-y-3 pl-3 border-l-2 border-purple-300 dark:border-purple-700">
              {/* Checkbox selection for hidden items */}
              <div className="space-y-1.5 p-2.5 bg-muted/20 rounded-lg border border-border/30">
                <p className="text-xs font-medium text-foreground">Select fields to add:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {hiddenItems.map((item) => {
                    const isSelected = selectedHiddenItems.has(item.code);
                    return (
                      <label
                        key={item.code}
                        className="flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-all"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelectedHiddenItems((prev) => {
                              const newSet = new Set(prev);
                              if (checked) {
                                newSet.add(item.code);
                              } else {
                                newSet.delete(item.code);
                              }
                              return newSet;
                            });
                          }}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-foreground">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              
              {/* Render selected hidden items */}
              {selectedHiddenItems.size > 0 && (
                <div className="space-y-3">
                  {hiddenItems
                    .filter((item) => selectedHiddenItems.has(item.code))
                    .map((item) => (
                      <div key={item.code} className="p-3 bg-muted/10 rounded-lg border border-border/30">
                        {renderItem(item)}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Separator className="my-4" />

      {/* Sticky footer with helper text */}
      <div className="sticky bottom-0 bg-background border-t border-border pt-3 pb-2 -mx-6 px-6 mt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            All fields optional • Enter to move between fields
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              className="h-10 px-5 text-sm font-medium min-w-[90px] flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-purple-600 hover:bg-purple-700 h-10 px-5 text-sm font-medium min-w-[90px] shadow-sm hover:shadow-md transition-all flex-1 sm:flex-initial"
            >
              {saveButtonText}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
