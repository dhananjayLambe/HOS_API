import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";

const MOCK_DELAY_MS = 300;
const DRAFT_PREFIX = "lab-report-draft:";

export type UploadDraftFileMeta = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type UploadDraft = {
  taskId: string;
  files: UploadDraftFileMeta[];
  primaryFileId: string | null;
  verified: boolean;
  savedAt: string;
};

export type SubmitReportPayload = {
  files: UploadDraftFileMeta[];
  primaryFileId: string | null;
  markReadyOnSubmit?: boolean;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function submitReportTask(
  _taskId: string,
  payload: SubmitReportPayload,
): Promise<{ status: ReportOperationalStatus }> {
  await delay(MOCK_DELAY_MS);
  const status: ReportOperationalStatus = payload.markReadyOnSubmit ? "READY_DELIVERY" : "UPLOADED";
  return { status };
}

export async function markTaskReady(_taskId: string): Promise<void> {
  await delay(MOCK_DELAY_MS);
}

export async function sendTaskWhatsApp(_taskId: string): Promise<void> {
  await delay(MOCK_DELAY_MS);
}

export async function retryTaskDelivery(_taskId: string): Promise<void> {
  await delay(MOCK_DELAY_MS);
}

export function saveTaskDraft(taskId: string, draft: UploadDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${DRAFT_PREFIX}${taskId}`, JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

export function loadTaskDraft(taskId: string): UploadDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${DRAFT_PREFIX}${taskId}`);
    if (!raw) return null;
    return JSON.parse(raw) as UploadDraft;
  } catch {
    return null;
  }
}

export function clearTaskDraft(taskId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${DRAFT_PREFIX}${taskId}`);
}

/** Mock preview URL for list actions (no real file on server in Phase 1). */
export function mockReportPreviewUrl(taskId: string): string {
  return `/lab-dashboard/reports?preview=${encodeURIComponent(taskId)}`;
}
