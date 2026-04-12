import type { ReactNode } from "react";

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

/** True if any badge suggests high frequency / most-used (backend convention). */
export function isMostUsedBadge(badges: string[] | undefined): boolean {
  if (!badges?.length) return false;
  return badges.some((b) => {
    const x = b.toLowerCase();
    return x.includes("popular") || x.includes("frequent") || x.includes("most");
  });
}
