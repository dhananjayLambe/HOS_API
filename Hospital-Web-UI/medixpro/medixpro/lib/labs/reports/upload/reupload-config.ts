export const REUPLOAD_REASON_OPTIONS = [
  "Wrong file uploaded",
  "Signed PDF replacing unsigned report",
  "Report regenerated",
  "Typo / value update",
  "Doctor requested update",
  "Other",
] as const;

export type ReuploadReasonOption = (typeof REUPLOAD_REASON_OPTIONS)[number];

export type UploadWorkflowMode = "upload" | "reupload";

export function isReuploadMode(mode: string | null | undefined): mode is "reupload" {
  return mode === "reupload";
}

/** Returns trimmed reason text when valid; null when required but missing. */
export function resolveReuploadReason(
  choice: string,
  otherText: string,
): string | null {
  const trimmed =
    choice === "Other" ? otherText.trim() : choice.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

export function isReuploadReasonReady(choice: string, otherText: string): boolean {
  return resolveReuploadReason(choice, otherText) != null;
}
