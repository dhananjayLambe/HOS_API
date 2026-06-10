import { format, isValid, parseISO } from "date-fns";

/** Display format for template list: "10 Jun" */
export function formatTemplateDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = parseISO(iso);
  if (!isValid(date)) return "—";
  return format(date, "d MMM");
}

/** Tooltip format: "10 Jun 2026 11:20 AM" */
export function formatTemplateDateTooltip(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = parseISO(iso);
  if (!isValid(date)) return "";
  return format(date, "d MMM yyyy h:mm a");
}
