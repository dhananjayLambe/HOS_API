export type PrimarySelectableFile = {
  id: string;
  name: string;
  type: string;
};

export type FileKind = "pdf" | "image" | "spreadsheet" | "other";

export function classifyFileKind(name: string, mimeType: string): FileKind {
  const lower = name.toLowerCase();
  const type = mimeType.toLowerCase();
  if (type.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (
    type.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp)$/i.test(lower)
  ) {
    return "image";
  }
  if (
    type.includes("spreadsheet") ||
    type.includes("csv") ||
    type.includes("excel") ||
    /\.(csv|xlsx?|xls)$/i.test(lower)
  ) {
    return "spreadsheet";
  }
  return "other";
}

const KIND_PRIORITY: Record<FileKind, number> = {
  pdf: 0,
  image: 1,
  spreadsheet: 2,
  other: 3,
};

/** Pick primary by PDF > image > spreadsheet > other; stable within same priority by list order. */
export function pickPrimaryFileId(
  files: PrimarySelectableFile[],
  currentPrimaryId?: string | null,
): string | null {
  if (files.length === 0) return null;
  if (currentPrimaryId && files.some((f) => f.id === currentPrimaryId)) {
    return currentPrimaryId;
  }
  const sorted = [...files].sort((a, b) => {
    const pa = KIND_PRIORITY[classifyFileKind(a.name, a.type)];
    const pb = KIND_PRIORITY[classifyFileKind(b.name, b.type)];
    return pa - pb;
  });
  return sorted[0]?.id ?? null;
}

/** After remove, reassign primary if removed was primary. */
export function primaryAfterRemove(
  files: PrimarySelectableFile[],
  removedId: string,
  previousPrimaryId: string | null,
): string | null {
  if (files.length === 0) return null;
  if (previousPrimaryId !== removedId) {
    return pickPrimaryFileId(files, previousPrimaryId);
  }
  return pickPrimaryFileId(files, null);
}
