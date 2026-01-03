# Patient Selection - Usage Guide

This guide explains how to use the selected patient in your components and pages throughout the application.

## Overview

The selected patient is managed globally through React Context and is available in all dashboard pages. The patient selection persists across page navigation and browser refreshes (via localStorage).

## Quick Start

### 1. Using the Hook (Recommended)

The easiest way to access the selected patient is using the `useSelectedPatient` hook:

```tsx
"use client";

import { useSelectedPatient } from "@/hooks/use-selected-patient";

export default function MyPage() {
  const { 
    patient,           // Full patient object
    hasPatient,        // Boolean: true if patient is selected
    patientId,         // Patient ID (string | null)
    patientName,       // Formatted patient name (string | null)
    patientAge,        // Calculated age (number | null)
    patientMobile,     // Mobile number (string | null)
    isLocked,          // Boolean: true if consultation is locked
    requirePatient,    // Function: throws error if no patient
    getPatientInfo      // Function: returns formatted patient info string
  } = useSelectedPatient();

  if (!hasPatient) {
    return <div>Please select a patient first</div>;
  }

  return (
    <div>
      <h1>Working with {patientName}</h1>
      <p>Patient ID: {patientId}</p>
      <p>Age: {patientAge}</p>
    </div>
  );
}
```

### 2. Using the Display Component

Display the selected patient in your page using the `SelectedPatientDisplay` component:

```tsx
"use client";

import { SelectedPatientDisplay } from "@/components/patient/selected-patient-display";

export default function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
      
      {/* Card variant (default) - Full card display */}
      <SelectedPatientDisplay />
      
      {/* Inline variant - Compact inline display */}
      <SelectedPatientDisplay variant="inline" />
      
      {/* Badge variant - Small badge display */}
      <SelectedPatientDisplay variant="badge" />
      
      {/* Hide lock status */}
      <SelectedPatientDisplay showLockStatus={false} />
      
      {/* Custom className */}
      <SelectedPatientDisplay className="mb-4" />
    </div>
  );
}
```

### 3. Using the Base Hook

For more control, use the base `usePatient` hook:

```tsx
"use client";

import { usePatient } from "@/lib/patientContext";

export default function MyPage() {
  const { 
    selectedPatient,    // Patient object or null
    isLocked,           // Boolean
    setSelectedPatient, // Function to set patient
    clearPatient,       // Function to clear selection
    lockPatient,        // Function to lock (start consultation)
    unlockPatient       // Function to unlock (end consultation)
  } = usePatient();

  if (!selectedPatient) {
    return <div>No patient selected</div>;
  }

  return (
    <div>
      <h1>{selectedPatient.full_name}</h1>
      <button onClick={clearPatient}>Clear Selection</button>
    </div>
  );
}
```

## Common Patterns

### Pattern 1: Require Patient for Operation

```tsx
import { useSelectedPatient } from "@/hooks/use-selected-patient";

function CreateAppointment() {
  const { requirePatient, patientId } = useSelectedPatient();

  const handleCreate = async () => {
    try {
      // This will throw an error if no patient is selected
      const patient = requirePatient();
      
      // Proceed with operation
      await createAppointment({
        patient_id: patient.id,
        // ... other data
      });
    } catch (error) {
      // Handle error - show message to select patient
      toast.error("Please select a patient first");
    }
  };

  return <button onClick={handleCreate}>Create Appointment</button>;
}
```

### Pattern 2: Conditional Rendering Based on Patient

```tsx
import { useSelectedPatient } from "@/hooks/use-selected-patient";

function ConsultationForm() {
  const { hasPatient, patientName, isLocked } = useSelectedPatient();

  if (!hasPatient) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          Please select a patient to start consultation
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2>Consultation for {patientName}</h2>
      {isLocked && <Badge>Consultation Active</Badge>}
      {/* Form content */}
    </div>
  );
}
```

### Pattern 3: Using Patient ID in API Calls

```tsx
import { useSelectedPatient } from "@/hooks/use-selected-patient";
import { useEffect, useState } from "react";

function PatientRecords() {
  const { patientId, hasPatient } = useSelectedPatient();
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (!hasPatient || !patientId) return;

    // Fetch records for selected patient
    fetch(`/api/patients/${patientId}/records`)
      .then(res => res.json())
      .then(data => setRecords(data));
  }, [patientId, hasPatient]);

  if (!hasPatient) {
    return <div>Select a patient to view records</div>;
  }

  return (
    <div>
      <h2>Patient Records</h2>
      {/* Display records */}
    </div>
  );
}
```

### Pattern 4: Lock/Unlock for Consultation

```tsx
import { useSelectedPatient } from "@/hooks/use-selected-patient";

function ConsultationPage() {
  const { 
    hasPatient, 
    patientName, 
    isLocked, 
    lockPatient, 
    unlockPatient 
  } = useSelectedPatient();

  const handleStartConsultation = () => {
    if (!hasPatient) {
      toast.error("Please select a patient first");
      return;
    }
    lockPatient();
    // Start consultation logic
  };

  const handleEndConsultation = () => {
    unlockPatient();
    // End consultation logic
  };

  return (
    <div>
      {isLocked ? (
        <button onClick={handleEndConsultation}>
          End Consultation
        </button>
      ) : (
        <button onClick={handleStartConsultation}>
          Start Consultation
        </button>
      )}
    </div>
  );
}
```

## Component Variants

### SelectedPatientDisplay Variants

1. **Card Variant** (default)
   - Full card with avatar, name, age, gender, mobile, DOB
   - Best for: Page headers, dedicated patient info sections
   ```tsx
   <SelectedPatientDisplay variant="card" />
   ```

2. **Inline Variant**
   - Compact horizontal display
   - Best for: Inline with other content, toolbars
   ```tsx
   <SelectedPatientDisplay variant="inline" />
   ```

3. **Badge Variant**
   - Small badge-style display
   - Best for: Compact spaces, sidebars, headers
   ```tsx
   <SelectedPatientDisplay variant="badge" />
   ```

## Type Definitions

```typescript
interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender?: string;
  date_of_birth?: string;
  mobile?: string;
  relation?: string;
}
```

## Best Practices

1. **Always check `hasPatient`** before using patient data
2. **Use `requirePatient()`** for operations that absolutely need a patient
3. **Show patient info** using `SelectedPatientDisplay` component for consistency
4. **Lock patient** when starting a consultation to prevent accidental changes
5. **Clear patient** when consultation ends or user explicitly unselects

## Examples in Codebase

- **Patient Search Bar**: `components/patient/patient-search-bar.tsx`
- **Patient Context Chip**: `components/patient/patient-context-chip.tsx`
- **Consultation Lock Hook**: `hooks/use-consultation-lock.ts`

## Troubleshooting

### "usePatient must be used within a PatientProvider"

Make sure your component is within the dashboard layout, which wraps everything in `PatientProvider`.

### Patient not persisting across page navigation

The patient is stored in localStorage and should persist. Check browser console for errors.

### Patient locked but can't unlock

Make sure you're calling `unlockPatient()` from the same component that called `lockPatient()`, or use the consultation lock hook.

