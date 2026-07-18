/**
 * PatientLabHistoryService — adapter over lab-history backend APIs.
 * Isolates Patient Summary from Workspace UI providers.
 */

import { backendAxiosClient } from "@/lib/axiosClient";
import { resolveDoctorContext } from "@/lib/doctor/resolveDoctorContext";
import { normalizeWorkspaceAccessUrl } from "@/lib/doctor/diagnostic-reports-workspace/resolve-workspace-access-url";
import type {
  ClinicalLabHistoryDetail,
  ClinicalLabHistoryFilters,
  ClinicalLabHistoryItem,
  ClinicalLabHistoryListResult,
  ClinicalLabHistorySummary,
  ClinicalLabStatus,
} from "../types";

type ApiEnvelope<T> = { status: string; data: T; message?: string };

const KNOWN_STATUS = new Set<ClinicalLabStatus>([
  "AWAITING_REPORT",
  "AVAILABLE",
  "UPDATED",
]);

function mapStatus(raw: unknown): ClinicalLabStatus {
  const text = String(raw ?? "").toUpperCase() as ClinicalLabStatus;
  return KNOWN_STATUS.has(text) ? text : "AVAILABLE";
}

function mapItem(r: Record<string, unknown>): ClinicalLabHistoryItem {
  return {
    id: String(r.id ?? ""),
    reportNumber: (r.report_number as string) ?? null,
    testName: String(r.test_name ?? "Diagnostic report"),
    category: (r.category as string) ?? null,
    labName: (r.lab_name as string) ?? null,
    branchName: (r.branch_name as string) ?? null,
    doctorName: (r.doctor_name as string) ?? null,
    consultationId: (r.consultation_id as string) ?? null,
    consultationLabel: (r.consultation_label as string) ?? null,
    prescriptionId: (r.prescription_id as string) ?? null,
    encounterId: (r.encounter_id as string) ?? null,
    collectionDate: (r.collection_date as string) ?? null,
    reportDate: (r.report_date as string) ?? null,
    uploadedAt: (r.uploaded_at as string) ?? null,
    clinicalStatus: mapStatus(r.clinical_status),
    clinicalFindingsPreview: (r.clinical_findings_preview as string) ?? null,
    version: Number(r.version ?? 1) || 1,
    isLatest: r.is_latest !== false,
    supersededById: (r.superseded_by_id as string) ?? null,
    source: String(r.source ?? "lab_upload"),
    lifecycleState: String(r.lifecycle_state ?? "ACTIVE"),
    primaryArtifactKind: (r.primary_artifact_kind as string) ?? null,
    artifactCount: Number(r.artifact_count ?? 0) || 0,
  };
}

let doctorScopeCache: { clinicId: string; at: number } | null = null;
const SCOPE_TTL_MS = 30_000;

async function getClinicId(): Promise<string> {
  const now = Date.now();
  if (doctorScopeCache && now - doctorScopeCache.at < SCOPE_TTL_MS) {
    return doctorScopeCache.clinicId;
  }
  const ctx = await resolveDoctorContext();
  if (!ctx.isReady || !ctx.clinicId) {
    throw new Error("Doctor clinic context is not ready.");
  }
  doctorScopeCache = { clinicId: ctx.clinicId, at: now };
  return ctx.clinicId;
}

export const patientLabHistoryQueryKeys = {
  all: ["patient-lab-history"] as const,
  summary: (patientId: string) =>
    [...patientLabHistoryQueryKeys.all, "summary", patientId] as const,
  list: (patientId: string, filters: ClinicalLabHistoryFilters) =>
    [
      ...patientLabHistoryQueryKeys.all,
      "list",
      patientId,
      filters.q ?? "",
      filters.dateFrom ?? "",
      filters.dateTo ?? "",
      filters.status ?? "",
    ] as const,
  detail: (patientId: string, reportId: string) =>
    [...patientLabHistoryQueryKeys.all, "detail", patientId, reportId] as const,
};

export const PatientLabHistoryService = {
  async getSummary(patientId: string): Promise<ClinicalLabHistorySummary> {
    const clinicId = await getClinicId();
    const response = await backendAxiosClient.get<
      ApiEnvelope<{
        total_reports: number;
        pending: number;
        latest_date: string | null;
        latest_lab: string | null;
      }>
    >(`/v1/doctors/reports/patients/${patientId}/lab-history/summary/`, {
      params: { clinic_id: clinicId },
    });
    const d = response.data.data;
    return {
      totalReports: Number(d.total_reports ?? 0),
      pending: Number(d.pending ?? 0),
      latestDate: d.latest_date ?? null,
      latestLab: d.latest_lab ?? null,
    };
  },

  async list(
    patientId: string,
    filters: ClinicalLabHistoryFilters = {}
  ): Promise<ClinicalLabHistoryListResult> {
    const clinicId = await getClinicId();
    const trimmedQ = (filters.q || "").trim();
    const response = await backendAxiosClient.get<
      ApiEnvelope<{
        items: Record<string, unknown>[];
        next_cursor: string | null;
        page_size: number;
      }>
    >(`/v1/doctors/reports/patients/${patientId}/lab-history/`, {
      params: {
        clinic_id: clinicId,
        q: trimmedQ.length >= 2 ? trimmedQ : undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        status: filters.status || undefined,
        cursor: filters.cursor || undefined,
        page_size: filters.pageSize ?? 25,
        ordering: "-report_date",
      },
    });
    const d = response.data.data;
    return {
      items: (d.items || []).map(mapItem),
      nextCursor: d.next_cursor ?? null,
      pageSize: d.page_size ?? 25,
    };
  },

  async getDetail(
    patientId: string,
    reportId: string
  ): Promise<ClinicalLabHistoryDetail> {
    const clinicId = await getClinicId();
    const response = await backendAxiosClient.get<
      ApiEnvelope<Record<string, unknown>>
    >(`/v1/doctors/reports/patients/${patientId}/lab-history/${reportId}/`, {
      params: { clinic_id: clinicId },
    });
    const r = response.data.data;
    const base = mapItem(r);
    const artifactsRaw = (r.artifacts as Record<string, unknown>[]) || [];
    const timeline = (r.timeline as Record<string, unknown>) || {};
    return {
      ...base,
      clinicalFindings: (r.clinical_findings as string) ?? null,
      artifacts: artifactsRaw.map((a) => ({
        id: String(a.id ?? ""),
        label: String(a.label ?? ""),
        kind: String(a.artifact_type ?? "OTHER"),
        previewUrl: a.preview_url
          ? normalizeWorkspaceAccessUrl(String(a.preview_url))
          : null,
        downloadUrl: a.download_url
          ? normalizeWorkspaceAccessUrl(String(a.download_url))
          : "",
        isPrimary: Boolean(a.is_primary),
      })),
      timeline: {
        orderedAt: (timeline.ordered_at as string) ?? null,
        collectedAt: (timeline.collected_at as string) ?? null,
        uploadedAt: (timeline.uploaded_at as string) ?? null,
      },
    };
  },
};
