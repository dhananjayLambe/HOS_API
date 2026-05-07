const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatLastSeen(iso: string | null): { primary: string; secondary: string } {
  if (!iso) return { primary: "Not seen yet", secondary: "" };

  const dt = new Date(iso);
  const now = new Date();
  const dtDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDiff = Math.floor((nowDay - dtDay) / (1000 * 60 * 60 * 24));

  if (dayDiff === 0) {
    return { primary: "Seen today", secondary: timeFmt.format(dt) };
  }
  if (dayDiff === 1) {
    return { primary: "Seen yesterday", secondary: timeFmt.format(dt) };
  }
  if (dayDiff > 1 && dayDiff <= 30) {
    return { primary: `Seen ${dayDiff} days ago`, secondary: dateFmt.format(dt) };
  }
  return { primary: `Seen on ${dateFmt.format(dt)}`, secondary: "" };
}

export function isRecentVisit(iso: string | null, days = 7): boolean {
  if (!iso) return false;
  const dt = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - dt.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}
