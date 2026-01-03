# Patient Search and Management Components

This directory contains components for patient search, selection, and management in the doctor dashboard.

## Components

### PatientSearchBar
Main component that conditionally renders either:
- `PatientSearch` - when no patient is selected
- `PatientContextChip` - when a patient is selected

### PatientSearch
Search input component with:
- Debounced search (300ms delay)
- Dropdown results (max 5)
- Mobile-responsive (icon button opens modal on small screens)
- Desktop popover on larger screens
- "Add New Patient" action in dropdown footer

### PatientContextChip
Displays selected patient information:
- Avatar with initials
- Patient name
- Age and gender
- Masked mobile number
- Lock icon when consultation is active
- Click to view patient details modal

### AddPatientDialog
Modal form for creating new patients with:
- First name (required)
- Last name (optional)
- Mobile number (required, 10 digits)
- Gender (required)
- Date of birth (optional)

## Usage

### Basic Integration

The components are already integrated into the dashboard layout. The `PatientProvider` is added to the root layout, and `PatientSearchBar` is included in the dashboard header.

### Using Consultation Lock

When starting a consultation, use the `useConsultationLock` hook:

```tsx
import { useConsultationLock } from "@/hooks/use-consultation-lock";

function ConsultationPage() {
  const { startConsultation, endConsultation, isLocked, hasPatient } = useConsultationLock();

  const handleStartConsultation = async () => {
    if (!hasPatient) {
      toast.error("Please select a patient to continue");
      return;
    }

    try {
      // Call your API to start consultation
      await startConsultationAPI();
      startConsultation(); // Lock the patient
    } catch (error) {
      // Handle error
    }
  };

  const handleEndConsultation = () => {
    endConsultation(); // Unlock the patient
  };

  return (
    <div>
      {isLocked && <p>Patient is locked during consultation</p>}
      {/* Your consultation UI */}
    </div>
  );
}
```

### Accessing Selected Patient

```tsx
import { usePatient } from "@/lib/patientContext";

function MyComponent() {
  const { selectedPatient, isLocked } = usePatient();

  if (!selectedPatient) {
    return <p>No patient selected</p>;
  }

  return <div>Patient: {selectedPatient.full_name}</div>;
}
```

## API Endpoints

The components use the following API endpoints:

- **Search**: `GET /api/patient_account/search/?query={query}`
- **Create Patient**: `POST /api/admin/patient/registration/`

Note: The create patient endpoint requires admin permissions. You may need to adjust this based on your backend permissions.

## Features

✅ Global patient search with debouncing
✅ Patient selection and context display
✅ Quick patient creation
✅ Patient locking during consultations
✅ Responsive design (desktop/tablet/mobile)
✅ Keyboard navigation support
✅ Accessibility features
✅ Patient persistence (localStorage)

## Responsive Behavior

- **Desktop**: Full search input (320-400px width) with popover dropdown
- **Tablet**: Reduced width search input
- **Mobile**: Search icon button opens full-width modal

