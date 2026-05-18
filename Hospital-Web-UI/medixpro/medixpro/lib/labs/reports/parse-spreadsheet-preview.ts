export type SpreadsheetPreviewData = {
  sheetName: string;
  rows: string[][];
  truncated: boolean;
};

export type SpreadsheetPreviewResult =
  | { ok: true; data: SpreadsheetPreviewData }
  | { ok: false; error: string };

const MAX_ROWS = 30;
const MAX_COLS = 12;

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/** Parse CSV/XLSX for inline preview (client-only). */
export async function parseSpreadsheetPreview(file: File): Promise<SpreadsheetPreviewResult> {
  try {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { ok: false, error: "The file has no worksheets." };
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return { ok: false, error: "Could not read the first worksheet." };
    }

    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    const normalized = grid.map((row) => {
      const cells = Array.isArray(row) ? row : [row];
      return cells.slice(0, MAX_COLS).map(cellToString);
    });

    const nonEmpty = normalized.filter((row) => row.some((c) => c.trim().length > 0));
    const rows = (nonEmpty.length > 0 ? nonEmpty : normalized).slice(0, MAX_ROWS);
    const truncated =
      normalized.length > MAX_ROWS ||
      grid.some((row) => Array.isArray(row) && row.length > MAX_COLS);

    if (rows.length === 0) {
      return { ok: false, error: "The spreadsheet appears to be empty." };
    }

    return {
      ok: true,
      data: { sheetName, rows, truncated },
    };
  } catch {
    return {
      ok: false,
      error: "Could not read this spreadsheet. Use a valid .xlsx or .csv file.",
    };
  }
}

export function isSpreadsheetFile(name: string, type: string): boolean {
  const lower = name.toLowerCase();
  return (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type === "text/csv" ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv")
  );
}

export function canOpenInBrowserTab(name: string, type: string): boolean {
  const lower = name.toLowerCase();
  if (type.includes("pdf") || lower.endsWith(".pdf")) return true;
  if (type.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(lower)) return true;
  if (type.startsWith("text/") || lower.endsWith(".txt")) return true;
  return false;
}
