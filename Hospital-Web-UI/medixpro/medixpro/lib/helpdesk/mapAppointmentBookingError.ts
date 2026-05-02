import { isAxiosError } from "axios";

const DEFAULT = "Something went wrong";
const NETWORK = "Network error. Try again.";

type CodedFieldError = { code?: string; message?: string };

function isCodedFieldError(v: unknown): v is CodedFieldError {
  return typeof v === "object" && v !== null && "code" in v;
}

function messageForCode(code: string, fallbackMessage?: string): string {
  if (code === "SLOT_CONFLICT") return "Slot already booked";
  if (code === "PAST_TIME") return "Cannot book past appointment";
  if (code === "INVALID_STATUS") {
    return fallbackMessage ?? "Only scheduled appointments can be rescheduled";
  }
  if (code === "FUTURE_LIMIT_EXCEEDED") {
    return fallbackMessage ?? "You can only book appointments within 30 days";
  }
  if (fallbackMessage) return fallbackMessage;
  return DEFAULT;
}

/**
 * Walks DRF-style field errors `{ field: { code, message } }` and returns a single UI string.
 */
export function mapAppointmentBookingError(error: unknown): string {
  if (!isAxiosError(error) || !error.response) {
    return NETWORK;
  }

  const data = error.response.data;
  if (data && typeof data === "object") {
    for (const key of Object.keys(data as object)) {
      const v = (data as Record<string, unknown>)[key];
      if (isCodedFieldError(v) && typeof v.code === "string") {
        return messageForCode(v.code, typeof v.message === "string" ? v.message : undefined);
      }
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") {
        return v[0];
      }
    }
    const detail = (data as { detail?: string }).detail;
    if (typeof detail === "string") return detail;
  }

  return DEFAULT;
}
