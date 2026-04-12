import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** True if `value` looks like a canonical UUID (DRF UUIDField accepts this form). */
export function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

/** Best-effort message from DRF / Next proxy JSON error bodies. */
export function formatInstructionApiError(data: unknown): string {
  if (data == null) return "Request failed";
  if (typeof data === "string") return data;
  if (typeof data !== "object") return "Request failed";
  const o = data as Record<string, unknown>;
  if (typeof o.detail === "string") return o.detail;
  if (Array.isArray(o.detail) && o.detail.length) return String(o.detail[0]);
  if (typeof o.error === "string") return o.error;
  if (typeof o.message === "string") return o.message;
  for (const v of Object.values(o)) {
    if (Array.isArray(v) && v.length) {
      const first = v[0];
      if (typeof first === "string") return first;
    }
    if (typeof v === "string") return v;
  }
  return "Request failed";
}
