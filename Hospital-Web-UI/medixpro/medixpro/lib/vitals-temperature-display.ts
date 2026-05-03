import { convertValue } from "@/lib/validation/unit-converter";

/**
 * Body temperature from API and consultation store is canonical Celsius.
 * Use this for Fahrenheit labels on consultation / preview surfaces.
 */
export function formatCanonicalCelsiusAsFahrenheitString(value: unknown): string {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value).trim();
  const f = convertValue(n, "c", "f");
  if (typeof f !== "number" || Number.isNaN(f)) return String(value).trim();
  return f.toFixed(1);
}
