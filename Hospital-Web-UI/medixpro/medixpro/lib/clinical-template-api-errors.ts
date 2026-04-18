import axios from "axios";

const DEFAULT_FALLBACK = "Something went wrong";

/**
 * Parses Django/DRF and Axios errors from clinical template APIs (list + create).
 */
export function parseClinicalTemplateApiError(
  err: unknown,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      const name = d.name;
      if (Array.isArray(name) && name.length) return String(name[0]);
      if (typeof name === "string") return name;
      const detail = d.detail;
      if (typeof detail === "string") return detail;
      if (
        Array.isArray(detail) &&
        detail[0] &&
        typeof detail[0] === "object" &&
        detail[0] != null &&
        "msg" in detail[0]
      ) {
        return String((detail[0] as { msg: unknown }).msg);
      }
      if (Array.isArray(d.non_field_errors) && d.non_field_errors.length) {
        return String(d.non_field_errors[0]);
      }
    }
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
