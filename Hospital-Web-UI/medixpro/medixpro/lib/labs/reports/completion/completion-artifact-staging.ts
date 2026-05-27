import type {
  ReportArtifactType,
  ReportArtifactViewModel,
  ReportChipViewModel,
} from "@/lib/labs/reports/completion/order-lifecycle.types";
import { inferArtifactType } from "@/lib/labs/reports/completion/operational-contract";

export type StagedArtifactInput = {
  fileName: string;
  mimeType: string;
  file?: File;
  size?: number;
  artifactType?: ReportArtifactType;
  isPrimary?: boolean;
};

export function buildUploadToastMessage(
  testLabel: string,
  artifacts: StagedArtifactInput[],
): string {
  if (artifacts.length === 0) return `${testLabel} uploaded`;
  if (artifacts.length === 1) return `${artifacts[0]!.fileName} uploaded`;
  return `${artifacts.length} files uploaded for ${testLabel}`;
}

export function mergeArtifactsIntoReport(
  report: ReportChipViewModel,
  incoming: StagedArtifactInput[],
  idPrefix = "art",
): ReportChipViewModel {
  const latestVersionNumber =
    report.versions.reduce((max, version) => Math.max(max, version.versionNumber), 0) || 0;
  const versionNumber = latestVersionNumber > 0 ? latestVersionNumber : 1;
  const versionId = report.latestVersionId ?? `${report.reportId}-v${versionNumber}`;
  const newArtifacts: ReportArtifactViewModel[] = incoming.map((a, i) => ({
    id: `${idPrefix}-${Date.now()}-${i}`,
    fileName: a.fileName,
    mimeType: a.mimeType,
    artifactType: a.artifactType ?? inferArtifactType(a.fileName, a.mimeType),
    patientVisible: a.isPrimary ?? (a.artifactType ?? inferArtifactType(a.fileName, a.mimeType)) === "PRIMARY_REPORT",
    uploadedAtLabel: "Just now",
    uploadedByName: "You",
    versionNumber,
    previewFile: a.file,
  }));
  const versions =
    report.versions.length > 0
      ? report.versions.map((version) =>
          version.versionId === versionId || version.isLatest
            ? {
                ...version,
                versionId,
                versionNumber,
                isLatest: true,
                status: "ready" as const,
                deliveryState: "not_sent" as const,
                artifacts: [...version.artifacts, ...newArtifacts],
              }
            : { ...version, isLatest: false },
        )
      : [
          {
            versionId,
            versionNumber,
            label: `v${versionNumber} Latest`,
            isLatest: true,
            status: "ready" as const,
            deliveryState: "not_sent" as const,
            artifacts: newArtifacts,
            createdAtLabel: "Just now",
            createdByName: "You",
          },
        ];
  return {
    ...report,
    status:
      report.status === "pending" ||
      report.status === "rejected" ||
      report.status === "failed_upload"
        ? "ready"
        : report.status,
    deliveryState: report.deliveryState === "failed" ? "not_sent" : report.deliveryState,
    artifacts: [...report.artifacts, ...newArtifacts],
    versions,
    latestVersionId: versionId,
    lastUpdatedAtLabel: "just now",
    lastUpdatedByName: "You",
  };
}

export function reuploadReportVersion(
  report: ReportChipViewModel,
  incoming: StagedArtifactInput[],
  options: { reason: string },
  idPrefix = "art",
): ReportChipViewModel {
  const nextVersionNumber =
    report.versions.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1 || 2;
  const versionId = `${report.reportId}-v${nextVersionNumber}`;
  const deliveryState = "not_sent";
  const status = "ready";
  const newArtifacts: ReportArtifactViewModel[] = incoming.map((a, i) => {
    const artifactType = a.artifactType ?? inferArtifactType(a.fileName, a.mimeType);
    return {
      id: `${idPrefix}-reupload-${Date.now()}-${i}`,
      fileName: a.fileName,
      mimeType: a.mimeType,
      artifactType,
      patientVisible: a.isPrimary ?? artifactType === "PRIMARY_REPORT",
      uploadedAtLabel: "Just now",
      uploadedByName: "You",
      versionNumber: nextVersionNumber,
      previewFile: a.file,
    };
  });

  return {
    ...report,
    status,
    deliveryState,
    artifacts: newArtifacts,
    versions: [
      ...report.versions.map((version) => ({ ...version, isLatest: false })),
      {
        versionId,
        versionNumber: nextVersionNumber,
        label: `v${nextVersionNumber} Updated`,
        isLatest: true,
        isCorrected: false,
        status,
        deliveryState,
        artifacts: newArtifacts,
        createdAtLabel: "Just now",
        createdByName: "You",
        reuploadReason: options.reason,
      },
    ],
    latestVersionId: versionId,
    isReuploaded: true,
    lastUpdatedAtLabel: "just now",
    lastUpdatedLabel: "just now",
    lastUpdatedByName: "You",
    reuploadReason: options.reason,
  };
}
