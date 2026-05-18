/** Operational waiting-time thresholds for incoming order queue. */
export const WAITING_AMBER_MINUTES = 30;
export const WAITING_RED_MINUTES = 120;

export type WaitingSinceTone = "neutral" | "amber" | "red";

export function minutesWaitingSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 60_000);
}

export function waitingSinceTone(minutes: number | null): WaitingSinceTone {
  if (minutes === null) return "neutral";
  if (minutes >= WAITING_RED_MINUTES) return "red";
  if (minutes >= WAITING_AMBER_MINUTES) return "amber";
  return "neutral";
}

export const WAITING_SINCE_TONE_CLASS: Record<WaitingSinceTone, string> = {
  neutral: "text-[#6B7280]",
  amber: "font-medium text-amber-700",
  red: "font-semibold text-red-700",
};
