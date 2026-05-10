export const URGENCY_LEVELS = ["STAT", "URGENT", "ROUTINE"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  STAT: "STAT",
  URGENT: "Urgent",
  ROUTINE: "Routine",
};
