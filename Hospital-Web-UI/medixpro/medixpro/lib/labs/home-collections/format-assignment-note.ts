import type { CollectionStatus } from "@/lib/labs/constants/status";

/** Queue/detail label for assignment note column. */
export function formatAssignmentNoteDisplay(
  status: CollectionStatus,
  assignmentNote: string | null | undefined,
): string {
  const note = (assignmentNote ?? "").trim();
  if (note) return note;
  if (status === "PENDING") return "—";
  return "Assigned";
}
