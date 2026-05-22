export type UploadRouteState = {
  taskId: string | null;
  reportId: string | null;
  returnUrl: string | null;
  demo: string | null;
  taskIdMalformed: boolean;
};

const DEFAULT_RETURN_PATH = "/lab-dashboard/reports?tab=pending";

/** Accept UUID-like or demo task ids (alphanumeric, dash, underscore). */
export function validateTaskId(id: string | null | undefined): "ok" | "malformed" | "missing" {
  if (!id || !id.trim()) return "missing";
  const trimmed = id.trim();
  if (trimmed.length > 128) return "malformed";
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return "malformed";
  return "ok";
}

export function parseUploadWorkflowSearchParams(
  params: Pick<URLSearchParams, "get"> | null | undefined,
): UploadRouteState {
  const rawTaskId = params?.get("taskId") ?? null;
  const taskValidation = validateTaskId(rawTaskId);
  const taskId = taskValidation === "ok" && rawTaskId ? rawTaskId.trim() : null;

  const rawReportId = params?.get("reportId") ?? null;
  const reportValidation = validateTaskId(rawReportId);
  const reportId = reportValidation === "ok" && rawReportId ? rawReportId.trim() : null;

  const returnUrl = (params?.get("returnUrl") ?? "").trim() || null;
  const demo = params?.get("demo");

  return {
    taskId,
    reportId,
    returnUrl,
    demo,
    taskIdMalformed: rawTaskId != null && rawTaskId.trim() !== "" && taskValidation === "malformed",
  };
}

/** Safe return href for invalid-task CTA and shell back navigation. */
export function buildUploadReturnHref(
  returnUrl: string | null,
  fallback: string = DEFAULT_RETURN_PATH,
): string {
  if (!returnUrl) return fallback;
  if (!returnUrl.startsWith("/lab-dashboard")) return fallback;
  if (returnUrl.includes("://")) return fallback;
  return returnUrl;
}

export function uploadPathWithTaskId(taskId: string, existing?: URLSearchParams): string {
  const params = new URLSearchParams(existing?.toString() ?? "");
  params.set("taskId", taskId);
  return `/lab-dashboard/reports/upload?${params.toString()}`;
}
