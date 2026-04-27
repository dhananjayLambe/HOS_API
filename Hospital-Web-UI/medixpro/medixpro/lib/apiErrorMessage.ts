import { isAxiosError } from "axios";

/** Best-effort message from Django `{ error: string }`, DRF `{ detail: string }`, or Error. */
export function getApiErrorDetail(error: unknown): string {
  if (isAxiosError(error)) {
    const d = error.response?.data;
    if (d && typeof d === "object") {
      const rec = d as Record<string, unknown>;
      if (typeof rec.error === "string" && rec.error) return rec.error;
      if (typeof rec.detail === "string" && rec.detail) return rec.detail;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Request failed";
}
