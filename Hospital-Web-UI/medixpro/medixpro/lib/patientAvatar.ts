const CALM_AVATAR_BG = [
  "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-300",
  "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
];

export function getCalmAvatarTint(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return CALM_AVATAR_BG[Math.abs(hash) % CALM_AVATAR_BG.length];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return "P";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "P";
}
