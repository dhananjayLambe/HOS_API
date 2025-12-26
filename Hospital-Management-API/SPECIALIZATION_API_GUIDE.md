# Specialization API - Unified Approach Guide

## Overview

The Specialization API now supports a **unified approach** where the frontend can send a single `specialization_name` field, and the backend automatically handles:
- Matching predefined specializations (e.g., "Cardiologist", "Dermatologist")
- Creating or finding custom specializations for any other names

## API Endpoints

### Base URL
```
/api/doctor/specializations/
```

### Supported Methods
- `GET` - List all specializations for the authenticated doctor
- `POST` - Create a new specialization
- `GET /{id}/` - Retrieve a specific specialization
- `PUT /{id}/` - Update a specialization (full update)
- `PATCH /{id}/` - Update a specialization (partial update)
- `DELETE /{id}/` - Delete a specialization

## Request Formats

### 1. Unified Approach (Recommended) ⭐

**Frontend can simply send a specialization name as a string:**

```json
POST /api/doctor/specializations/
{
  "specialization_name": "Cardiologist",
  "is_primary": true
}
```

**Or for custom specializations:**

```json
POST /api/doctor/specializations/
{
  "specialization_name": "Pediatric Cardiology",
  "is_primary": false
}
```

**How it works:**
- If `specialization_name` matches a predefined specialization (case-insensitive), it uses the predefined code
- If it doesn't match, it automatically creates or finds a `CustomSpecialization` with that name
- Then creates a `Specialization` record linking to it

### 2. Predefined Specialization (Backward Compatible)

```json
POST /api/doctor/specializations/
{
  "specialization": "CL",  // Code for Cardiologist
  "is_primary": true
}
```

### 3. Custom Specialization by ID (Backward Compatible)

```json
POST /api/doctor/specializations/
{
  "custom_specialization": "uuid-of-custom-specialization",
  "is_primary": false
}
```

## Response Format

### Success Response (Create/Update)

```json
{
  "status": "success",
  "message": "Specialization created successfully",
  "data": {
    "id": "uuid",
    "specialization": "CL",  // null if custom
    "custom_specialization": "uuid",  // null if predefined
    "specialization_display": "Cardiologist",  // Display name for predefined
    "custom_specialization_name": null,  // Name if custom
    "is_primary": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### Success Response (List)

```json
{
  "status": "success",
  "message": "Specializations retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "specialization": "CL",
      "specialization_display": "Cardiologist",
      "custom_specialization": null,
      "custom_specialization_name": null,
      "is_primary": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "specialization": null,
      "specialization_display": null,
      "custom_specialization": "uuid",
      "custom_specialization_name": "Pediatric Cardiology",
      "is_primary": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Specialization already exists for this doctor.",
  "data": {
    // Existing specialization data
  }
}
```

## Predefined Specializations

The system recognizes the following predefined specializations (case-insensitive matching):

- Cardiologist
- Dermatologist
- Emergency Medicine Specialist
- Immunologist
- Anesthesiologist
- Colon and Rectal Surgeon
- Endocrinologist
- Gastroenterologist
- Hematologist
- Oncologist
- Neurologist
- Neurosurgeon
- Pediatrician
- Plastic Surgeon
- Physical Medicine and Rehabilitation Specialist
- Psychiatrist
- Radiologist
- Rheumatologist
- Thoracic Surgeon
- Urologist
- Otorhinolaryngologist (ENT Specialist)
- Ophthalmologist
- Maternal-Fetal Medicine Specialist
- Neonatologist
- Gynecologist
- Orthopedic Surgeon
- Vascular Surgeon
- Allergy and Immunology Specialist
- Pain Medicine Specialist
- Pathologist
- Nuclear Medicine Specialist
- Sleep Medicine Specialist
- Occupational Medicine Specialist
- Sports Medicine Specialist
- Palliative Medicine Specialist
- Dermatosurgeon
- Family Medicine Specialist
- General Practitioner
- Geriatrician
- Infectious Disease Specialist
- Toxicologist
- General Surgeon
- Transplant Surgeon
- Critical Care Specialist
- Cosmetic Surgeon
- Lab Medicine Specialist
- Clinical Geneticist

## Update Operations

### Update with specialization_name

```json
PATCH /api/doctor/specializations/{id}/
{
  "specialization_name": "New Specialization Name",
  "is_primary": true
}
```

The update logic:
- If the new name matches a predefined specialization, it updates to use that
- If it doesn't match, it finds or creates a custom specialization
- Prevents duplicate specializations for the same doctor

## Key Features

1. **Automatic Matching**: Case-insensitive matching of predefined specializations
2. **Auto-Creation**: Custom specializations are automatically created if they don't exist
3. **Duplicate Prevention**: Prevents adding the same specialization twice for a doctor
4. **Backward Compatible**: Still supports the old API format with `specialization` and `custom_specialization` fields
5. **Flexible Updates**: Can update a specialization by changing its name, and it will automatically handle the type conversion

## Frontend Integration Example

```javascript
// Simple approach - just send the name
const addSpecialization = async (specializationName, isPrimary = false) => {
  const response = await fetch('/api/doctor/specializations/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      specialization_name: specializationName,
      is_primary: isPrimary
    })
  });
  
  return await response.json();
};

// Usage
await addSpecialization('Cardiologist', true);  // Predefined
await addSpecialization('Pediatric Cardiology', false);  // Custom
```

## Notes

- The `specialization_name` field is **write-only** (not returned in responses)
- Use `specialization_display` to get the display name for predefined specializations
- Use `custom_specialization_name` to get the name for custom specializations
- The system automatically handles case-insensitive matching and trimming whitespace
- Custom specializations are shared across all doctors (if one doctor creates "Pediatric Cardiology", others can use it too)

