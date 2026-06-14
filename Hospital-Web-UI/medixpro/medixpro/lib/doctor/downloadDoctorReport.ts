import { fetchArtifactBlob, getReportDownloadUrl } from "@/lib/labs/reports/api/v1/reports-api";
import { isAuthenticatedArtifactUrl } from "@/lib/labs/reports/completion/artifact-download";

function triggerBrowserDownload(href: string, fileName: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function downloadDoctorReport(
  reportId: string,
  options?: { signal?: AbortSignal; fileName?: string },
): Promise<void> {
  const { download_url: downloadUrl, filename } = await getReportDownloadUrl(reportId, {
    signal: options?.signal,
  });

  if (!downloadUrl) {
    throw new Error("No download URL available for this report.");
  }

  const fileName = filename || options?.fileName || "report.pdf";

  if (isAuthenticatedArtifactUrl(downloadUrl)) {
    const blob = await fetchArtifactBlob(downloadUrl, { signal: options?.signal });
    const objectUrl = URL.createObjectURL(blob);
    try {
      triggerBrowserDownload(objectUrl, fileName);
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    }
    return;
  }

  triggerBrowserDownload(downloadUrl, fileName);
}
