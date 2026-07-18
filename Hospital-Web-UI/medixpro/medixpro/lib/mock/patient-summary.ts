export type PatientOperationalBadge = "consultation_active" | "in_queue" | "follow_up_due" | "recent_visit";

export interface PatientSummaryPayload {
  patient: {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
    age_display: string;
    gender: string;
    mobile: string;
    uhid: string;
    has_open_encounter: boolean;
    open_encounter_state: "consultation_active" | "in_queue" | null;
    has_unfinished_consultation: boolean;
    is_follow_up_due: boolean;
  };
  quick_stats: {
    visits: number;
    active_rx: number;
    last_visit_label: string;
    pending_labs: number;
  };
  generated_summary: {
    headline: string;
    summary: string;
  };
  snapshot: {
    last_diagnosis: string;
    current_medications: string;
    follow_up: string;
    latest_lab: string;
  };
  consultations: Array<{
    id: string;
    date_label: string;
    diagnosis: string;
    medicines_summary: string;
    advice: string;
    follow_up: string;
  }>;
  prescriptions: Array<{
    id: string;
    consultation_id: string;
    prescription_pnr?: string;
    issued_on: string;
    medicine_summary: string;
    status: "ACTIVE" | "CANCELLED";
  }>;
  labs: Array<{
    id: string;
    test_name: string;
    uploaded_label: string;
    abnormal_badge?: string;
  }>;
  timeline: Array<{
    id: string;
    date_label: string;
    event: string;
    detail: string;
    kind?: string;
    report_id?: string | null;
  }>;
}

const mockByPatientId: Record<string, PatientSummaryPayload> = {
  "b6364d6d-96ad-4d40-9a28-3a3836b7997d": {
    patient: {
      id: "b6364d6d-96ad-4d40-9a28-3a3836b7997d",
      full_name: "John Smith",
      first_name: "John",
      last_name: "Smith",
      age_display: "32Y",
      gender: "Male",
      mobile: "+91-9XXXXXX617",
      uhid: "DP-2026-1024",
      has_open_encounter: true,
      open_encounter_state: "consultation_active",
      has_unfinished_consultation: true,
      is_follow_up_due: true,
    },
    quick_stats: {
      visits: 12,
      active_rx: 2,
      last_visit_label: "Today",
      pending_labs: 1,
    },
    generated_summary: {
      headline: "Treatment progression improving",
      summary:
        "Patient treated for recurrent throat infection over the last 3 visits. Symptoms improved after Amoxicillin course started on 02 May 2026. Follow-up consultation scheduled for tomorrow due to persistent mild cough. Recent CBC report uploaded 2 days ago.",
    },
    snapshot: {
      last_diagnosis: "Acute Pharyngitis",
      current_medications: "3 Active Medicines",
      follow_up: "Due Tomorrow",
      latest_lab: "CBC Uploaded",
    },
    consultations: [
      {
        id: "c-1",
        date_label: "06 May 2026",
        diagnosis: "Acute Pharyngitis",
        medicines_summary: "Amoxicillin +2 more",
        advice: "Steam inhalation and hydration",
        follow_up: "Tomorrow",
      },
      {
        id: "c-2",
        date_label: "02 May 2026",
        diagnosis: "Recurrent throat infection",
        medicines_summary: "Azithromycin +1 more",
        advice: "Warm saline gargles",
        follow_up: "In 4 days",
      },
      {
        id: "c-3",
        date_label: "21 Apr 2026",
        diagnosis: "Upper respiratory irritation",
        medicines_summary: "Symptomatic treatment",
        advice: "Hydration, avoid cold drinks",
        follow_up: "PRN",
      },
    ],
    prescriptions: [
      {
        id: "rx-1",
        consultation_id: "c-1",
        prescription_pnr: "MOCK-RX-001",
        issued_on: "06 May 2026",
        medicine_summary: "Amoxicillin +2 medicines",
        status: "ACTIVE",
      },
      {
        id: "rx-2",
        consultation_id: "c-2",
        prescription_pnr: "MOCK-RX-002",
        issued_on: "02 May 2026",
        medicine_summary: "Azithromycin course",
        status: "CANCELLED",
      },
      {
        id: "rx-3",
        consultation_id: "c-3",
        prescription_pnr: "MOCK-RX-003",
        issued_on: "21 Apr 2026",
        medicine_summary: "Symptomatic medicines",
        status: "ACTIVE",
      },
    ],
    labs: [
      { id: "lab-1", test_name: "CBC Report", uploaded_label: "Uploaded 2 days ago", abnormal_badge: "Abnormal WBC" },
      { id: "lab-2", test_name: "CRP", uploaded_label: "Uploaded 12 days ago" },
      { id: "lab-3", test_name: "LFT", uploaded_label: "Uploaded 1 month ago" },
    ],
    timeline: [
      { id: "t-1", date_label: "06 May 2026", event: "Consultation completed", detail: "Diagnosis updated and follow-up planned." },
      { id: "t-2", date_label: "04 May 2026", event: "CBC report uploaded", detail: "Abnormal WBC flagged for review." },
      { id: "t-3", date_label: "02 May 2026", event: "Prescription generated", detail: "Amoxicillin course initiated." },
      { id: "t-4", date_label: "02 May 2026", event: "Encounter started", detail: "Patient moved from queue to consultation." },
    ],
  },
};

export function getPatientSummaryMock(patientId: string): PatientSummaryPayload {
  return (
    mockByPatientId[patientId] ?? {
      ...mockByPatientId["b6364d6d-96ad-4d40-9a28-3a3836b7997d"],
      patient: {
        ...mockByPatientId["b6364d6d-96ad-4d40-9a28-3a3836b7997d"].patient,
        id: patientId,
      },
    }
  );
}
