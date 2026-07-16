import {
  createDemoReports,
  DEMO_PATIENTS,
} from "@/components/doctor/diagnostic-reports-workspace/mock/workspace-demo-fixtures";
import type {
  DiagnosticReportsWorkspaceProvider,
  WorkspaceListQuery,
  WorkspacePatient,
  WorkspaceReport,
} from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import {
  computeQueueCounts,
  filterReports,
} from "@/lib/doctor/diagnostic-reports-workspace/filter-workspace-reports";

function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createDemoWorkspaceProvider(): DiagnosticReportsWorkspaceProvider {
  let reports: WorkspaceReport[] = createDemoReports();

  return {
    async getQueueCounts(query) {
      await delay();
      return computeQueueCounts(
        filterReports(reports, {
          patientId: query?.patientId,
          consultationId: query?.consultationId,
          q: query?.q,
        })
      );
    },

    async searchPatients(q: string) {
      await delay(80);
      const n = q.trim().toLowerCase();
      if (!n) return DEMO_PATIENTS.slice(0, 5);
      return DEMO_PATIENTS.filter((p) => {
        const hay = `${p.name} ${p.mobile ?? ""} ${p.identifier} ${p.id}`.toLowerCase();
        return hay.includes(n);
      });
    },

    async listReports(query: WorkspaceListQuery) {
      await delay();
      // Demo affordance: unknown patient ids still show catalogue
      if (
        query.patientId &&
        !reports.some((r) => r.patient.id === query.patientId)
      ) {
        return {
          reports: filterReports(reports, { ...query, patientId: null }),
          nextCursor: null,
        };
      }
      return { reports: filterReports(reports, query), nextCursor: null };
    },

    async getReportDetail(reportId: string) {
      await delay();
      return reports.find((r) => r.id === reportId) ?? null;
    },
  };
}

export function clonePatient(p: WorkspacePatient): WorkspacePatient {
  return { ...p };
}
