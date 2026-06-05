import { fetchArtifactBlob } from "@/lib/labs/reports/api/v1/reports-api";
import type { ReportArtifactViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";

export type ArtifactDownloadSource =
  | { kind: "api"; url: string }
  | { kind: "blob"; url: string }
  | { kind: "file"; file: File };

const API_ARTIFACT_DOWNLOAD_PATTERN = /\/api\/v1\/diagnostics\/reports\/[^/]+\/artifacts\/[^/]+\/download\/?/i;

export function isAuthenticatedArtifactUrl(url: string): boolean {
  try {
    const parsed = new URL(url, globalThis?.location?.origin ?? "http://localhost");
    return API_ARTIFACT_DOWNLOAD_PATTERN.test(parsed.pathname);
  } catch {
    return API_ARTIFACT_DOWNLOAD_PATTERN.test(url);
  }
}

export function resolveArtifactDownloadSource(
  artifact: ReportArtifactViewModel | null,
  options?: { remoteBlobUrl?: string | null },
): ArtifactDownloadSource | null {
  if (!artifact) return null;

  if (artifact.downloadUrl) {
    return { kind: "api", url: artifact.downloadUrl };
  }
  if (artifact.previewUrl) {
    return { kind: "api", url: artifact.previewUrl };
  }
  if (options?.remoteBlobUrl) {
    return { kind: "blob", url: options.remoteBlobUrl };
  }
  if (artifact.previewFile) {
    return { kind: "file", file: artifact.previewFile };
  }
  return null;
}

export function canDownloadArtifact(
  artifact: ReportArtifactViewModel | null,
  options?: { remoteBlobUrl?: string | null },
): boolean {
  return resolveArtifactDownloadSource(artifact, options) !== null;
}

function triggerBrowserDownload(href: string, fileName: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.rel = "noopener noreferrer";
  anchor.click();
}

export async function downloadReportArtifact(
  artifact: ReportArtifactViewModel,
  options?: { remoteBlobUrl?: string | null; signal?: AbortSignal },
): Promise<void> {
  const source = resolveArtifactDownloadSource(artifact, options);
  if (!source) {
    throw new Error("No downloadable artifact source is available.");
  }

  const fileName = artifact.fileName || "report";

  if (source.kind === "file") {
    const objectUrl = URL.createObjectURL(source.file);
    try {
      triggerBrowserDownload(objectUrl, fileName);
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    }
    return;
  }

  if (source.kind === "blob") {
    triggerBrowserDownload(source.url, fileName);
    return;
  }

  const blob = await fetchArtifactBlob(source.url, { signal: options?.signal });
  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerBrowserDownload(objectUrl, fileName);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}
