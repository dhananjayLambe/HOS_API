/** Two-letter fallback when org logo is missing (sidebar / chrome). */
export function organizationInitials(displayName: string): string {
  const name = displayName.trim();
  if (!name) return "LP";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[1][0] ?? "";
    return `${a}${b}`.toUpperCase() || "LP";
  }
  return name.slice(0, 2).toUpperCase();
}
