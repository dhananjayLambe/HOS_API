/** Normalize slot time to HH:mm:ss for Django. */
export function toHhMmSs(t: string): string {
  const s = t.trim();
  const parts = s.split(":");
  if (parts.length === 2) {
    const h = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    return `${h}:${m}:00`;
  }
  if (parts.length >= 3) {
    const h = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const sec = (parts[2] || "00").replace(/\D/g, "").slice(0, 2).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }
  return s;
}
