import type { LabAppointmentRow } from "@/lib/labs/types";

export function formatPrepNotesDisplay(row: LabAppointmentRow): {
  tags: string[];
  instructionLine: string;
} {
  const tags = [...row.prepTags];
  if (row.fastingRequired && !tags.some((t) => t.toLowerCase() === "fasting")) {
    tags.unshift("Fasting");
  }
  const summary = row.prepSummary?.trim();
  const instructions = row.instructions.trim();
  return {
    tags,
    instructionLine: summary || instructions,
  };
}
