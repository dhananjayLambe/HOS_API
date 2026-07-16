import type { DiagnosticReportsWorkspaceProvider } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import { backendAxiosClient } from "@/lib/axiosClient";
import { resolveDoctorContext } from "@/lib/doctor/resolveDoctorContext";

type ApiEnvelope<T> = { status: string; data: T; message?: string };

async function getDoctorScope() {
  const context = await resolveDoctorContext();
  if (!context.isReady) {
    throw new Error("Doctor context is not ready.");
  }
  return context;
}

/**
 * Live provider stub — wired in a later backend integration plan.
 * Components should never import axios; they go through resolveWorkspaceProvider.
 */
export function createLiveWorkspaceProvider(): DiagnosticReportsWorkspaceProvider {
  return {
    async getQueueCounts(query) {
      const { clinicId } = await getDoctorScope();
      const response = await backendAxiosClient.get<ApiEnvelope<{ reports_ready: number; awaiting: number; critical: number }>>(
        "/v1/doctors/diagnostic-workspace/counts/",
        {
          params: {
            clinic_id: clinicId,
            q: query?.q || undefined,
          },
        }
      );
      return response.data.data;
    },
    async searchPatients(q) {
      const { clinicId } = await getDoctorScope();
      const response = await backendAxiosClient.get<ApiEnvelope<any[]>>(
        "/v1/doctors/diagnostic-workspace/patients/search/",
        {
          params: {
            clinic_id: clinicId,
            q,
          },
        }
      );
      return (response.data.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        age: p.age ?? null,
        gender: p.gender ?? "",
        identifier: p.identifier ?? "",
        mobile: p.mobile ?? null,
        lastVisitAt: p.last_visit_at ?? null,
        currentConsultationId: p.current_consultation_id ?? null,
        currentConsultationLabel: p.current_consultation_label ?? null,
      }));
    },
    async listReports(query) {
      const { clinicId } = await getDoctorScope();
      const response = await backendAxiosClient.get<ApiEnvelope<{ reports: any[]; next_cursor: string | null }>>(
        "/v1/doctors/diagnostic-workspace/reports/",
        {
          params: {
            clinic_id: clinicId,
            q: query.q || undefined,
            queue: query.queue || undefined,
            quick_filter: query.quickFilter || undefined,
            patient_id: query.patientId || undefined,
            consultation_id: query.consultationId || undefined,
            encounter_id: query.encounterId || undefined,
            lab: query.advanced?.lab || undefined,
            category: query.advanced?.category || undefined,
            doctor: query.advanced?.doctor || undefined,
            branch: query.advanced?.branch || undefined,
            status: query.advanced?.status || undefined,
          },
        }
      );
      const reports = (response.data.data.reports || []).map((r) => ({
        id: r.id,
        reportNumber: r.report_number ?? null,
        patient: {
          id: r.patient.id,
          name: r.patient.name,
          age: r.patient.age ?? null,
          gender: r.patient.gender ?? "",
          identifier: r.patient.identifier ?? "",
          mobile: r.patient.mobile ?? null,
          lastVisitAt: r.patient.last_visit_at ?? null,
          currentConsultationId: r.patient.current_consultation_id ?? null,
          currentConsultationLabel: r.patient.current_consultation_label ?? null,
        },
        testName: r.test_name ?? "",
        category: r.category ?? null,
        labName: r.lab_name ?? null,
        doctorName: r.doctor_name ?? null,
        branchName: r.branch_name ?? null,
        consultationId: r.consultation_id ?? null,
        consultationLabel: r.consultation_label ?? null,
        encounterId: r.encounter_id ?? null,
        collectionDate: r.collection_date ?? null,
        reportDate: r.report_date ?? null,
        uploadedAt: r.uploaded_at ?? null,
        clinicalStatus: r.clinical_status,
        clinicalFindingsPreview: r.clinical_findings_preview ?? null,
        clinicalFindings: null,
        artifacts: [],
        timeline: { orderedAt: null, collectedAt: null, uploadedAt: null },
      }));
      return {
        reports,
        nextCursor: response.data.data.next_cursor,
      };
    },
    async getReportDetail(reportId) {
      if (reportId.startsWith("awaiting:")) return null;
      const { clinicId } = await getDoctorScope();
      const response = await backendAxiosClient.get<ApiEnvelope<any>>(
        `/v1/doctors/diagnostic-workspace/reports/${reportId}/`,
        { params: { clinic_id: clinicId } }
      );
      const r = response.data.data;
      return {
        id: r.id,
        reportNumber: r.report_number ?? null,
        patient: {
          id: r.patient.id,
          name: r.patient.name,
          age: r.patient.age ?? null,
          gender: r.patient.gender ?? "",
          identifier: r.patient.identifier ?? "",
          mobile: r.patient.mobile ?? null,
          lastVisitAt: r.patient.last_visit_at ?? null,
          currentConsultationId: r.patient.current_consultation_id ?? null,
          currentConsultationLabel: r.patient.current_consultation_label ?? null,
        },
        testName: r.test_name ?? "",
        category: r.category ?? null,
        labName: r.lab_name ?? null,
        doctorName: r.doctor_name ?? null,
        branchName: r.branch_name ?? null,
        consultationId: r.consultation_id ?? null,
        consultationLabel: r.consultation_label ?? null,
        encounterId: r.encounter_id ?? null,
        collectionDate: r.collection_date ?? null,
        reportDate: r.report_date ?? null,
        uploadedAt: r.uploaded_at ?? null,
        clinicalStatus: r.clinical_status,
        clinicalFindingsPreview: r.clinical_findings_preview ?? null,
        clinicalFindings: r.clinical_findings ?? null,
        artifacts: (r.artifacts || []).map((a: any) => ({
          id: a.id,
          label: a.label,
          kind: a.artifact_type,
          previewUrl: a.preview_url ?? null,
          downloadUrl: a.download_url,
          isPrimary: Boolean(a.is_primary),
        })),
        timeline: {
          orderedAt: r.timeline?.ordered_at ?? null,
          collectedAt: r.timeline?.collected_at ?? null,
          uploadedAt: r.timeline?.uploaded_at ?? null,
        },
      };
    },
  };
}
