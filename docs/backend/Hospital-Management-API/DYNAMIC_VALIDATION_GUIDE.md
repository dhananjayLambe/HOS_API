# Dynamic Validation System - Implementation Guide

## Overview

This document describes the dynamic validation system that allows form validation rules to be defined in template metadata and automatically applied in the UI.

## ✅ Why This Approach is Useful

1. **Single Source of Truth**: Validation rules live in templates, not hardcoded in forms
2. **Specialty-Specific**: Different specialties can have different validation rules
3. **Maintainable**: Update validation without touching code
4. **Consistent**: Same validation rules in UI and backend
5. **Scalable**: Easy to add new fields/sections without code changes

## 📋 Architecture

```
Template Metadata (JSON)
    ↓
Backend API (ConsultationEngine)
    ↓
Frontend Hook (useDynamicValidation)
    ↓
Dynamic Components (DynamicField)
    ↓
Forms (VitalsForm, HistoryForm, etc.)
```

## 🔧 Implementation Steps

### Step 1: Update Template Metadata

Add `validation` object to each field in `*_details.json`:

```json
{
  "key": "systolic",
  "type": "number",
  "label": "Systolic",
  "unit": "mmHg",
  "validation": {
    "required": false,
    "min": 50,
    "max": 300,
    "error_messages": {
      "required": "Systolic BP is required",
      "min": "Systolic BP must be at least 50 mmHg",
      "max": "Systolic BP cannot exceed 300 mmHg",
      "invalid": "Please enter a valid systolic BP"
    }
  }
}
```

### Step 2: Backend Integration

The `ConsultationEngine.get_pre_consultation_template()` already returns field metadata. Ensure it includes validation rules:

```python
# Backend already returns this structure:
{
  "sections": [
    {
      "section": "vitals",
      "items": [
        {
          "code": "blood_pressure",
          "label": "Blood Pressure",
          "fields": [
            {
              "key": "systolic",
              "type": "number",
              "validation": { ... }
            }
          ]
        }
      ]
    }
  ]
}
```

### Step 3: Frontend Integration

#### Option A: Gradual Migration (Recommended)

Keep existing forms, add validation gradually:

```tsx
// In vitals-form.tsx
import { useDynamicValidation } from "@/hooks/use-dynamic-validation";

const {
  validateFieldValue,
  getFieldError,
  isFormValid,
} = useDynamicValidation({
  fields: templateFields, // From API
  specialtyConfig, // From API
  section: "vitals",
});

// Add validation to existing inputs
<Input
  value={formData.systolic}
  onChange={(e) => {
    const value = Number(e.target.value);
    setFormData(prev => ({ ...prev, systolic: value }));
    validateFieldValue("systolic", value, formData);
  }}
  error={getFieldError("systolic")}
/>
```

#### Option B: Full Dynamic Forms

Replace hardcoded forms with dynamic components:

```tsx
// Use DynamicField component
{templateFields.map((field) => (
  <DynamicField
    key={field.key}
    field={field}
    value={formData[field.key]}
    onChange={(value) => handleFieldChange(field.key, value)}
    error={getFieldError(field.key)}
  />
))}
```

## 📝 Validation Rules Supported

### Basic Rules

- **required**: Field must have a value
- **min**: Minimum value (numbers) or length (strings)
- **max**: Maximum value (numbers) or length (strings)
- **pattern**: Regex pattern for string validation

### Custom Validators

Define cross-field validation:

```json
{
  "validation": {
    "custom_validator": "diastolic_must_be_less_than_systolic",
    "error_messages": {
      "custom": "Diastolic BP must be less than Systolic BP"
    }
  }
}
```

Available custom validators:
- `diastolic_must_be_less_than_systolic`
- `weight_height_ratio` (BMI check)
- Add more in `dynamic-validator.ts`

### Specialty-Specific Required Fields

Use `specialty_config.json` to mark fields as required per specialty:

```json
{
  "gynecology": {
    "vitals": {
      "required": ["height_weight", "temperature", "blood_pressure"]
    }
  }
}
```

## 🎯 Usage Examples

### Example 1: Simple Number Field

```json
{
  "key": "temperature",
  "type": "number",
  "validation": {
    "required": false,
    "min": 30,
    "max": 45,
    "error_messages": {
      "min": "Temperature must be at least 30°C",
      "max": "Temperature cannot exceed 45°C"
    }
  }
}
```

### Example 2: Required Text Field

```json
{
  "key": "allergen_name",
  "type": "text",
  "validation": {
    "required": true,
    "min": 2,
    "max": 100,
    "error_messages": {
      "required": "Allergen name is required",
      "min": "Allergen name must be at least 2 characters"
    }
  }
}
```

### Example 3: Pattern Validation

```json
{
  "key": "phone",
  "type": "text",
  "validation": {
    "pattern": "^[0-9]{10}$",
    "error_messages": {
      "pattern": "Phone number must be 10 digits"
    }
  }
}
```

## 🔄 Migration Strategy

### Phase 1: Add Validation to Templates (Week 1)
- Update `vitals_details.json` with validation rules
- Update `allergies_details.json` with validation rules
- Update other section templates

### Phase 2: Integrate Validation Hook (Week 2)
- Add `useDynamicValidation` to existing forms
- Show validation errors on blur/submit
- Keep existing UI structure

### Phase 3: Dynamic Components (Week 3-4)
- Create `DynamicField` component
- Gradually replace hardcoded fields
- Test with different specialties

### Phase 4: Backend Validation (Week 5)
- Add same validation logic to backend
- Return validation errors from API
- Sync frontend/backend error messages

## 📊 Benefits Summary

| Aspect | Before | After |
|--------|-------|-------|
| **Validation Rules** | Hardcoded in forms | Defined in templates |
| **Specialty Support** | Manual if/else | Automatic from config |
| **Maintenance** | Update code | Update JSON |
| **Consistency** | Risk of mismatch | Single source of truth |
| **Testing** | Test each form | Test validation system |

## 🚀 Next Steps

1. **Review** the example files created:
   - `dynamic-validator.ts` - Core validation logic
   - `use-dynamic-validation.ts` - React hook
   - `dynamic-field.tsx` - Reusable field component
   - `vitals-form-dynamic.example.tsx` - Example usage

2. **Update Templates**: Add validation to your template JSON files

3. **Test**: Start with one form (e.g., Vitals) and validate it works

4. **Expand**: Gradually migrate other forms

5. **Backend**: Add same validation to backend API

## ❓ FAQ

**Q: Can we keep existing forms?**  
A: Yes! You can add validation gradually without rewriting forms.

**Q: What if a field needs complex validation?**  
A: Use `custom_validator` and add the logic to `dynamic-validator.ts`.

**Q: How do we handle specialty-specific rules?**  
A: Use `specialty_config.json` to mark fields as required per specialty.

**Q: Can validation rules change at runtime?**  
A: Yes! Since they come from API, you can update templates without code changes.

**Q: What about backend validation?**  
A: Use the same template structure to validate on backend. Share validation logic if possible.

## 📚 Files Created

- `/lib/validation/dynamic-validator.ts` - Core validation functions
- `/hooks/use-dynamic-validation.ts` - React hook for forms
- `/components/consultations/dynamic-field.tsx` - Dynamic field component
- `/components/consultations/vitals-form-dynamic.example.tsx` - Example implementation

## 🎉 Conclusion

Dynamic validation is **highly recommended** because it:
- Reduces code duplication
- Makes forms more maintainable
- Supports specialty-specific requirements
- Enables rapid changes without deployments
- Ensures consistency between UI and backend

Start with one form, validate the approach works, then expand!
