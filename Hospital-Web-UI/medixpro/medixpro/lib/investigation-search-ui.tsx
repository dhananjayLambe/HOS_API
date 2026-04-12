import type { ReactNode } from "react";

const RECENT_STORAGE_KEY = "medixpro:investigation-recent-v1";
const RECENT_MAX = 8;

export type RecentInvestigationEntry = { id: string; label: string };

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Highlights the first case-insensitive match of `query` in `text`. */
export function highlightInvestigationSearchLabel(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  let re: RegExp;
  try {
    re = new RegExp(`(${escapeRegExp(q)})`, "gi");
  } catch {
    return text;
  }
  const parts = text.split(re);
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={`h-${i}`} className="rounded bg-primary/25 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      <span key={`t-${i}`}>{part}</span>
    )
  );
}

export function readRecentInvestigations(): RecentInvestigationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row): row is RecentInvestigationEntry =>
          row != null &&
          typeof row === "object" &&
          typeof (row as RecentInvestigationEntry).id === "string" &&
          typeof (row as RecentInvestigationEntry).label === "string"
      )
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

export function pushRecentInvestigation(entry: RecentInvestigationEntry) {
  if (typeof window === "undefined") return;
  try {
    const prev = readRecentInvestigations().filter((e) => e.id !== entry.id);
    const next = [{ ...entry }, ...prev].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

/** True if any badge suggests high frequency / most-used (backend convention). */
export function isMostUsedBadge(badges: string[] | undefined): boolean {
  if (!badges?.length) return false;
  return badges.some((b) => {
    const x = b.toLowerCase();
    return x.includes("popular") || x.includes("frequent") || x.includes("most");
  });
}
