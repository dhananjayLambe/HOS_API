import { format } from "date-fns";

import type { Slot } from "./helpdeskAppointmentTypes";

/** Morning 06:00–11:59, Afternoon 12:00–16:59, Evening 17:00–21:59 (start times). */
export type TimeBucket = "morning" | "afternoon" | "evening";

export const TIME_BUCKET_ORDER: TimeBucket[] = ["morning", "afternoon", "evening"];

const MORNING_START = 6 * 60;
const AFTERNOON_START = 12 * 60;
const EVENING_START = 17 * 60;
/** Last minute of evening window (inclusive for slot *start* we cap at 21:45 for 15-min grid). */
const EVENING_END = 21 * 60 + 59;

export function minutesFromStartTime(startTime: string): number {
  const [h, m] = startTime.split(":").map(Number);
  return h * 60 + m;
}

export function getSlotBucket(slot: Slot): TimeBucket {
  const mins = minutesFromStartTime(slot.startTime);
  if (mins >= MORNING_START && mins < AFTERNOON_START) return "morning";
  if (mins >= AFTERNOON_START && mins < EVENING_START) return "afternoon";
  if (mins >= EVENING_START && mins <= EVENING_END) return "evening";
  if (mins < MORNING_START) return "morning";
  return "evening";
}

export function bucketForWallClockMinutes(totalMinutes: number): TimeBucket {
  if (totalMinutes >= MORNING_START && totalMinutes < AFTERNOON_START) return "morning";
  if (totalMinutes >= AFTERNOON_START && totalMinutes < EVENING_START) return "afternoon";
  if (totalMinutes >= EVENING_START && totalMinutes <= EVENING_END) return "evening";
  if (totalMinutes < MORNING_START) return "morning";
  return "evening";
}

export function isTodayIso(dateIso: string, now: Date = new Date()): boolean {
  return format(now, "yyyy-MM-dd") === dateIso;
}

function firstBucketWithAnySlots(counts: Record<TimeBucket, number>): TimeBucket | null {
  for (const b of TIME_BUCKET_ORDER) {
    if (counts[b] > 0) return b;
  }
  return null;
}

/**
 * Default tab: first bucket that has slots. For today, start from the wall-clock
 * bucket (e.g. afternoon at 4:30pm) and move forward so empty morning/afternoon
 * skips to evening when that is where slots actually exist.
 */
export function getDefaultBucketForDate(selectedDateIso: string, slots: Slot[], now: Date = new Date()): TimeBucket {
  const counts = countSlotsPerBucket(slots);

  if (slots.length === 0) {
    if (isTodayIso(selectedDateIso, now)) {
      return bucketForWallClockMinutes(now.getHours() * 60 + now.getMinutes());
    }
    return "morning";
  }

  if (isTodayIso(selectedDateIso, now)) {
    const wallBucket = bucketForWallClockMinutes(now.getHours() * 60 + now.getMinutes());
    const startIdx = TIME_BUCKET_ORDER.indexOf(wallBucket);
    for (let i = startIdx; i < TIME_BUCKET_ORDER.length; i++) {
      const b = TIME_BUCKET_ORDER[i];
      if (counts[b] > 0) return b;
    }
    for (let i = 0; i < startIdx; i++) {
      const b = TIME_BUCKET_ORDER[i];
      if (counts[b] > 0) return b;
    }
    return wallBucket;
  }

  return firstBucketWithAnySlots(counts) ?? "morning";
}

export function filterSlotsByBucket(slots: Slot[], bucket: TimeBucket): Slot[] {
  return slots.filter((s) => getSlotBucket(s) === bucket);
}

export function countSlotsPerBucket(slots: Slot[]): Record<TimeBucket, number> {
  const counts: Record<TimeBucket, number> = { morning: 0, afternoon: 0, evening: 0 };
  for (const s of slots) {
    counts[getSlotBucket(s)] += 1;
  }
  return counts;
}
