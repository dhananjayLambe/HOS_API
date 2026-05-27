import type { UploadFileItem } from "@/hooks/labs/useReportUploadWizard";

export type UploadFileRejectionReason = "duplicate" | "unsupported" | "too_large";

export type UploadFileRejection = {
  name: string;
  reason: UploadFileRejectionReason;
};

/** Client-side limit — align with backend when known. */
export const REPORT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export const UPLOAD_ACCEPT_ATTR =
  ".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.txt,.zip,application/pdf,image/jpeg,image/png,text/csv,text/plain,application/zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const ACCEPT_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".csv",
  ".xlsx",
  ".txt",
  ".zip",
]);

const ACCEPT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/csv",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function fileId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function normalizedMimeType(name: string, type: string): string {
  if (type) return type.toLowerCase();
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".zip")) return "application/zip";
  if (/\.(jpe?g)$/.test(lower)) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".txt")) return "text/plain";
  return "";
}

function duplicateKey(input: Pick<UploadFileItem, "name" | "size" | "type">): string {
  return `${input.name.trim().toLowerCase()}::${input.size}::${normalizedMimeType(input.name, input.type)}`;
}

export function isAcceptedFileType(file: File): boolean {
  const lower = file.name.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : "";
  if (ACCEPT_EXTENSIONS.has(ext)) return true;
  if (file.type && ACCEPT_MIME_TYPES.has(file.type)) return true;
  return false;
}

export function validateIncomingFiles(
  incoming: File[],
  existing: UploadFileItem[],
): { accepted: File[]; rejected: UploadFileRejection[] } {
  const accepted: File[] = [];
  const rejected: UploadFileRejection[] = [];
  const seenIds = new Set(existing.map((f) => f.id));
  const seenDuplicateKeys = new Set(existing.map(duplicateKey));

  for (const file of incoming) {
    const id = fileId(file);
    const dupeKey = duplicateKey({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (seenIds.has(id) || seenDuplicateKeys.has(dupeKey)) {
      rejected.push({ name: file.name, reason: "duplicate" });
      continue;
    }

    if (file.size > REPORT_UPLOAD_MAX_BYTES) {
      rejected.push({ name: file.name, reason: "too_large" });
      continue;
    }

    if (!isAcceptedFileType(file)) {
      rejected.push({ name: file.name, reason: "unsupported" });
      continue;
    }

    seenIds.add(id);
    seenDuplicateKeys.add(dupeKey);
    accepted.push(file);
  }

  return { accepted, rejected };
}

export function rejectionReasonLabel(reason: UploadFileRejectionReason): string {
  switch (reason) {
    case "duplicate":
      return "Duplicate";
    case "unsupported":
      return "Unsupported";
    case "too_large":
      return "Too large";
  }
}

export function rejectionReasonMessage(reason: UploadFileRejectionReason): string {
  switch (reason) {
    case "duplicate":
      return "Duplicate file detected";
    case "unsupported":
      return "Unsupported file type";
    case "too_large":
      return "File exceeds the maximum size limit.";
  }
}
