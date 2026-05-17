import type { LabAppointmentRow } from "@/lib/labs/types";

export function formatPrepNotesDisplay(row: LabAppointmentRow): {
  tags: string[];
  instructionLine: string;
} {
  const tags = [...row.prepTags];
  if (row.fastingRequired && !tags.some((t) => t.toLowerCase() === "fasting")) {
    tags.unshift("Fasting");
  }
  return {
    tags,
    instructionLine: row.instructions.trim(),
  };
}
