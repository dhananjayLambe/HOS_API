export type LabOrdersDatePreset = "today" | "week" | "month" | "year";

export const LAB_ORDERS_DATE_PRESET_OPTIONS: { id: LabOrdersDatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "Last year" },
];

/** Calendar YYYY-MM-DD in the user's local timezone (not UTC). */
function formatLocalDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function rangeForLabOrdersPreset(preset: LabOrdersDatePreset): { date_from: string; date_to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = formatLocalDateYmd(today);

  switch (preset) {
    case "today":
      return { date_from: end, date_to: end };
    case "week": {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      return { date_from: formatLocalDateYmd(from), date_to: end };
    }
    case "month": {
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      return { date_from: formatLocalDateYmd(from), date_to: end };
    }
    case "year": {
      const from = new Date(today);
      from.setDate(today.getDate() - 364);
      return { date_from: formatLocalDateYmd(from), date_to: end };
    }
    default:
      return { date_from: end, date_to: end };
  }
}

export const DEFAULT_LAB_ORDERS_DATE_PRESET: LabOrdersDatePreset = "today";
