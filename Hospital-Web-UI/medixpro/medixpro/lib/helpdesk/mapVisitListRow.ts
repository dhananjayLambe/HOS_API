import type { ClinicalVisitListItemApi } from "@/lib/api/visits";

export type HelpdeskVisitRow = {
  visitId: string;
  visitPnr: string;
  startedAt: string | null;
  patientName: string;
  patientAge: number | null;
  patientGender: string;
  patientMobile: string;
  patientUhid: string;
  doctorName: string;
  doctorId: string | null;
  visitType: string;
  status: string;
  hasPrescription: boolean;
  prescriptionId: string | null;
  testsCount: number;
  reportsCount: number;
};

export function mapVisitListRow(item: ClinicalVisitListItemApi): HelpdeskVisitRow {
  return {
    visitId: item.visit_id,
    visitPnr: item.visit_pnr,
    startedAt: item.started_at,
    patientName: item.patient_name,
    patientAge: item.patient_age,
    patientGender: item.patient_gender,
    patientMobile: item.patient_mobile,
    patientUhid: item.patient_uhid,
    doctorName: item.doctor_name,
    doctorId: item.doctor_id,
    visitType: item.visit_type,
    status: item.status,
    hasPrescription: item.has_prescription,
    prescriptionId: item.prescription_id,
    testsCount: item.tests_count,
    reportsCount: item.reports_count,
  };
}

export function visitStatusLabel(status: string): string {
  const key = (status || "").toUpperCase();
  if (key === "CONSULTATION_COMPLETED" || key === "COMPLETED") return "Completed";
  if (key === "CONSULTATION_IN_PROGRESS" || key === "IN_PROGRESS") return "In Progress";
  if (key === "CLOSED") return "Closed";
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function visitTypeLabel(type: string): string {
  const key = (type || "").toUpperCase();
  if (key === "WALK_IN") return "Walk-In";
  if (key === "APPOINTMENT") return "Appointment";
  if (key === "FOLLOW_UP") return "Follow Up";
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatVisitDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function defaultDateRange(): { fromDate: string; toDate: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { fromDate: fmt(from), toDate: fmt(to) };
}

export function exportVisitsCsv(rows: HelpdeskVisitRow[]): void {
  const headers = ["Visit ID", "Patient", "Doctor", "Date", "Visit Type", "Status"];
  const lines = rows.map((row) =>
    [
      row.visitPnr,
      row.patientName,
      row.doctorName,
      formatVisitDateTime(row.startedAt),
      visitTypeLabel(row.visitType),
      visitStatusLabel(row.status),
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `visits-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
