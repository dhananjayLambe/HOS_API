import type { DiagnosticReportsWorkspaceProvider } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import type { ArtifactKind } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import { backendAxiosClient } from "@/lib/axiosClient";
import { resolveDoctorContext } from "@/lib/doctor/resolveDoctorContext";
import { workspaceUuidOrUndefined } from "@/lib/doctor/diagnostic-reports-workspace/workspace-ids";
import { normalizeWorkspaceAccessUrl } from "@/lib/doctor/diagnostic-reports-workspace/resolve-workspace-access-url";

const KNOWN_ARTIFACT_KINDS = new Set<ArtifactKind>([
  "PDF",
  "IMAGE",
  "CSV",
  "XLSX",
  "DOCX",
  "TXT",
  "ZIP",
  "DICOM",
  "OTHER",
]);

function mapArtifactKind(raw: unknown): ArtifactKind {
  const text = String(raw ?? "").toUpperCase() as ArtifactKind;
  return KNOWN_ARTIFACT_KINDS.has(text) ? text : "OTHER";
}

type ApiEnvelope<T> = { status: string; data: T; message?: string };

type ListData = {
  reports: any[];
  pagination: {
    page: number;
    page_size: number;
    next_cursor: string | null;
  };
};

type SummaryData = {
  summary: {
    reports_ready: number;
    awaiting: number;
    critical: number;
  };
};

type DoctorScope = Awaited<ReturnType<typeof resolveDoctorContext>>;

let doctorScopeCache: { value: DoctorScope; at: number } | null = null;
const DOCTOR_SCOPE_TTL_MS = 30_000;

async function getDoctorScope() {
  const now = Date.now();
  if (
    doctorScopeCache &&
    now - doctorScopeCache.at < DOCTOR_SCOPE_TTL_MS &&
    doctorScopeCache.value.isReady
  ) {
    return doctorScopeCache.value;
  }
  const context = await resolveDoctorContext();
  if (!context.isReady) {
    throw new Error("Doctor context is not ready.");
  }
  doctorScopeCache = { value: context, at: now };
  return context;
}

function mapReport(r: any) {
  const patient = r?.patient ?? {};
  return {
    id: r.id,
    reportNumber: r.report_number ?? null,
    patient: {
      id: patient.id ?? "",
      name: patient.name ?? "",
      age: patient.age ?? null,
      gender: patient.gender ?? "",
      identifier: patient.identifier ?? "",
      mobile: patient.mobile ?? null,
      lastVisitAt: patient.last_visit_at ?? null,
      currentConsultationId: patient.current_consultation_id ?? null,
      currentConsultationLabel: patient.current_consultation_label ?? null,
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
      label: a.label ?? "",
      kind: mapArtifactKind(a.artifact_type),
      previewUrl: a.preview_url ? normalizeWorkspaceAccessUrl(a.preview_url) : null,
      downloadUrl: a.download_url
        ? normalizeWorkspaceAccessUrl(a.download_url)
        : "",
      isPrimary: Boolean(a.is_primary),
    })),
    timeline: {
      orderedAt: r.timeline?.ordered_at ?? null,
      collectedAt: r.timeline?.collected_at ?? null,
      uploadedAt: r.timeline?.uploaded_at ?? null,
    },
  };
}

function listOrSearchParams(clinicId: string, query: {
  q?: string;
  queue?: string | null;
  quickFilter?: string | null;
  patientId?: string | null;
  consultationId?: string | null;
  encounterId?: string | null;
  cursor?: string | null;
  advanced?: {
    lab?: string;
    category?: string;
    doctor?: string;
    branch?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}) {
  return {
    clinic_id: clinicId,
    q: query.q || undefined,
    queue: query.queue || undefined,
    quick_filter: query.quickFilter || undefined,
    patient_id: workspaceUuidOrUndefined(query.patientId),
    consultation_id: workspaceUuidOrUndefined(query.consultationId),
    encounter_id: workspaceUuidOrUndefined(query.encounterId),
    // API expects UUIDs for lab/doctor/branch — scrub display names
    lab: workspaceUuidOrUndefined(query.advanced?.lab),
    category: query.advanced?.category || undefined,
    doctor: workspaceUuidOrUndefined(query.advanced?.doctor),
    branch: workspaceUuidOrUndefined(query.advanced?.branch),
    status: query.advanced?.status || undefined,
    date_from: query.advanced?.dateFrom || undefined,
    date_to: query.advanced?.dateTo || undefined,
    cursor: query.cursor || undefined,
    page_size: 25,
  };
}

const MIN_SEARCH_LENGTH = 2;

/** Exported for page-level gating — must match search API `MIN_SEARCH_LENGTH`. */
export const WORKSPACE_MIN_SEARCH_LENGTH = MIN_SEARCH_LENGTH;

/**
 * Production workspace data path — sole runtime provider after Milestone 12 cutover.
 * Covers list/summary/search/detail (preview/download via opaque artifact URLs).
 * Patient typeahead search remains stubbed until a dedicated patient search API ships.
 */
export function createLiveWorkspaceProvider(): DiagnosticReportsWorkspaceProvider {
  return {
    async getQueueCounts(query) {
      const { clinicId } = await getDoctorScope();
      const trimmedQ = (query?.q || "").trim();
      const response = await backendAxiosClient.get<ApiEnvelope<SummaryData>>(
        "/v1/doctors/reports/workspace/summary/",
        {
          params: {
            clinic_id: clinicId,
            q:
              trimmedQ.length >= MIN_SEARCH_LENGTH ? trimmedQ : undefined,
            patient_id: workspaceUuidOrUndefined(query?.patientId),
            consultation_id: workspaceUuidOrUndefined(query?.consultationId),
          },
        }
      );
      const summary = response.data.data.summary;
      return {
        reports_ready: summary.reports_ready,
        awaiting: summary.awaiting,
        critical: summary.critical,
      };
    },
    async searchPatients(_q) {
      return [];
    },
    async listReports(query) {
      const { clinicId } = await getDoctorScope();
      const trimmedQ = (query.q || "").trim();
      // Search API rejects q shorter than MIN_SEARCH_LENGTH — use list until then.
      const useSearch = trimmedQ.length >= MIN_SEARCH_LENGTH;
      const path = useSearch
        ? "/v1/doctors/reports/workspace/search/"
        : "/v1/doctors/reports/workspace/";
      const response = await backendAxiosClient.get<ApiEnvelope<ListData>>(path, {
        params: listOrSearchParams(clinicId, {
          ...query,
          q: useSearch ? trimmedQ : undefined,
        }),
      });
      const data = response.data.data;
      return {
        reports: (data.reports || []).map(mapReport),
        nextCursor: data.pagination?.next_cursor ?? null,
      };
    },
    async getReportDetail(reportId) {
      const { clinicId } = await getDoctorScope();
      try {
        const response = await backendAxiosClient.get<ApiEnvelope<any>>(
          `/v1/doctors/reports/workspace/reports/${reportId}/`,
          {
            params: { clinic_id: clinicId },
          }
        );
        return mapReport(response.data.data);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
  };
}
