/**
 * Test-only workspace report fixtures (unit tests).
 * Not imported by production UI — live APIs are the only runtime data path.
 */
import type {
  WorkspaceArtifact,
  WorkspacePatient,
  WorkspaceReport,
} from "@/components/doctor/diagnostic-reports-workspace/workspace-types";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return hoursAgo(days * 24);
}

function pdfPreviewHtml(title: string, patientName: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;margin:16px 20px;color:#111;background:#fff}
  h1{font-size:16px;margin:0 0 2px;font-weight:600}
  .muted{color:#666;font-size:11px;margin:0 0 12px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#666;font-weight:600}
  td,th{border-bottom:1px solid #eee;padding:5px 4px;text-align:left}
  .foot{margin-top:16px;color:#999;font-size:10px}
  </style></head><body>
  <h1>${title}</h1>
  <p class="muted">Patient: ${patientName} · Test fixture diagnostic report</p>
  <table><thead><tr><th>Parameter</th><th>Value</th><th>Range</th></tr></thead>
  <tbody>
  <tr><td>Hemoglobin</td><td>11.2 g/dL</td><td>12–16</td></tr>
  <tr><td>WBC</td><td>7.8 ×10³/µL</td><td>4–11</td></tr>
  <tr><td>Platelets</td><td>210 ×10³/µL</td><td>150–400</td></tr>
  </tbody></table>
  <p class="foot">DoctorProCare · Test fixture artifact — not for clinical use</p>
  </body></html>`;
}

const PATIENTS: WorkspacePatient[] = [
  {
    id: "pat-ramesh",
    name: "Ramesh Patil",
    age: 52,
    gender: "Male",
    identifier: "PAT100241",
    mobile: "9876543210",
    lastVisitAt: hoursAgo(4),
    currentConsultationId: "consult-ramesh-1",
    currentConsultationLabel: "Follow-up · Diabetes",
  },
  {
    id: "pat-priya",
    name: "Priya Sharma",
    age: 34,
    gender: "Female",
    identifier: "PAT100387",
    mobile: "9822012345",
    lastVisitAt: daysAgo(1),
    currentConsultationId: "consult-priya-1",
    currentConsultationLabel: "OPD · Fever workup",
  },
  {
    id: "pat-amit",
    name: "Amit Kumar",
    age: 41,
    gender: "Male",
    identifier: "PAT100512",
    mobile: "9898765432",
    lastVisitAt: daysAgo(3),
    currentConsultationId: null,
    currentConsultationLabel: null,
  },
  {
    id: "pat-sunita",
    name: "Sunita Desai",
    age: 67,
    gender: "Female",
    identifier: "PAT100901",
    mobile: "9765432109",
    lastVisitAt: hoursAgo(28),
    currentConsultationId: "consult-sunita-1",
    currentConsultationLabel: "Telemedicine · Chest pain review",
  },
  {
    id: "pat-vikram",
    name: "Vikram Joshi",
    age: 29,
    gender: "Male",
    identifier: "PAT101102",
    mobile: "9012345678",
    lastVisitAt: hoursAgo(2),
    currentConsultationId: "consult-vikram-1",
    currentConsultationLabel: "New visit · Fatigue",
  },
];

function patient(id: string): WorkspacePatient {
  const found = PATIENTS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown test fixture patient ${id}`);
  return found;
}

function artifact(id: string, label: string, patientName: string, primary = false): WorkspaceArtifact {
  const html = pdfPreviewHtml(label.replace(".pdf", ""), patientName);
  const encoded = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  return {
    id,
    label,
    kind: "PDF",
    previewUrl: encoded,
    downloadUrl: encoded,
    isPrimary: primary,
  };
}

export function createTestWorkspaceReports(): WorkspaceReport[] {
  const ramesh = patient("pat-ramesh");
  const priya = patient("pat-priya");
  const amit = patient("pat-amit");
  const sunita = patient("pat-sunita");
  const vikram = patient("pat-vikram");

  return [
    {
      id: "rpt-ramesh-hba1c",
      reportNumber: "DR-2026-8841",
      patient: ramesh,
      testName: "HbA1c",
      category: "Biochemistry",
      labName: "Kolhapur Central Lab",
      doctorName: "Dr. Mehta",
      branchName: "Kolhapur Main",
      consultationId: ramesh.currentConsultationId,
      consultationLabel: ramesh.currentConsultationLabel,
      encounterId: "enc-ramesh-1",
      collectionDate: daysAgo(1),
      reportDate: hoursAgo(6),
      uploadedAt: hoursAgo(6),
      clinicalStatus: "AVAILABLE",
      clinicalFindingsPreview: "HbA1c 8.4% — above target.",
      clinicalFindings: "HbA1c 8.4% — above target. Correlate with glucose logs.",
      artifacts: [artifact("art-ramesh-hba1c", "HbA1c Report.pdf", ramesh.name, true)],
      timeline: {
        orderedAt: daysAgo(2),
        collectedAt: daysAgo(1),
        uploadedAt: hoursAgo(6),
      },
    },
    {
      id: "rpt-priya-cbc",
      reportNumber: "DR-2026-8850",
      patient: priya,
      testName: "Complete Blood Count (CBC)",
      category: "Hematology",
      labName: "Kolhapur Central Lab",
      doctorName: "Dr. Mehta",
      branchName: "Kolhapur Main",
      consultationId: priya.currentConsultationId,
      consultationLabel: priya.currentConsultationLabel,
      encounterId: "enc-priya-1",
      collectionDate: hoursAgo(20),
      reportDate: hoursAgo(3),
      uploadedAt: hoursAgo(3),
      clinicalStatus: "AVAILABLE",
      clinicalFindingsPreview: "Hemoglobin low at 7.1 g/dL.",
      clinicalFindings: "Hemoglobin critically low at 7.1 g/dL. Urgent clinical correlation advised.",
      artifacts: [
        artifact("art-priya-cbc", "CBC Report.pdf", priya.name, true),
        artifact("art-priya-smear", "Peripheral smear.pdf", priya.name, false),
      ],
      timeline: {
        orderedAt: daysAgo(1),
        collectedAt: hoursAgo(20),
        uploadedAt: hoursAgo(3),
      },
    },
    {
      id: "rpt-sunita-ecg",
      reportNumber: "DR-2026-8899",
      patient: sunita,
      testName: "ECG",
      category: "Cardiology",
      labName: "HeartCare Diagnostics",
      doctorName: "Dr. Mehta",
      branchName: "Kolhapur Main",
      consultationId: sunita.currentConsultationId,
      consultationLabel: sunita.currentConsultationLabel,
      encounterId: "enc-sunita-1",
      collectionDate: hoursAgo(30),
      reportDate: hoursAgo(26),
      uploadedAt: hoursAgo(26),
      clinicalStatus: "UPDATED",
      clinicalFindingsPreview: "Corrected tracing uploaded.",
      clinicalFindings: "Updated ECG tracing uploaded after correcting technical artifact.",
      artifacts: [artifact("art-sunita-ecg", "ECG Trace.pdf", sunita.name, true)],
      timeline: {
        orderedAt: daysAgo(2),
        collectedAt: hoursAgo(30),
        uploadedAt: hoursAgo(26),
      },
    },
    {
      id: "rpt-vikram-await",
      reportNumber: null,
      patient: vikram,
      testName: "Thyroid Profile (T3/T4/TSH)",
      category: "Endocrinology",
      labName: "Kolhapur Central Lab",
      doctorName: "Dr. Mehta",
      branchName: "Kolhapur Main",
      consultationId: vikram.currentConsultationId,
      consultationLabel: vikram.currentConsultationLabel,
      encounterId: "enc-vikram-1",
      collectionDate: hoursAgo(5),
      reportDate: null,
      uploadedAt: null,
      clinicalStatus: "AWAITING_REPORT",
      clinicalFindingsPreview: null,
      clinicalFindings: null,
      artifacts: [],
      timeline: {
        orderedAt: hoursAgo(6),
        collectedAt: hoursAgo(5),
        uploadedAt: null,
      },
    },
    {
      id: "rpt-amit-lft",
      reportNumber: "DR-2026-8702",
      patient: amit,
      testName: "Liver Function Test (LFT)",
      category: "Biochemistry",
      labName: "City Diagnostics",
      doctorName: null,
      branchName: "Kolhapur Main",
      consultationId: null,
      consultationLabel: null,
      encounterId: "enc-amit-2",
      collectionDate: daysAgo(5),
      reportDate: daysAgo(4),
      uploadedAt: daysAgo(4),
      clinicalStatus: "AVAILABLE",
      clinicalFindingsPreview: "LFTs within normal limits.",
      clinicalFindings: "LFTs within normal limits.",
      artifacts: [artifact("art-amit-lft", "LFT Report.pdf", amit.name, true)],
      timeline: {
        orderedAt: daysAgo(6),
        collectedAt: daysAgo(5),
        uploadedAt: daysAgo(4),
      },
    },
  ];
}

export const DEMO_PATIENTS = PATIENTS;
