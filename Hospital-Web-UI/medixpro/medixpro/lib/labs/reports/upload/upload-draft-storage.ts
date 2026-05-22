export type UploadDraftFileMeta = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type UploadDraftV1 = {
  version: 1;
  savedAt: string;
  taskId: string;
  filesMeta: UploadDraftFileMeta[];
  primaryFileId: string | null;
  verified: boolean;
};

const DRAFT_PREFIX = "report-upload-draft:";
const LEGACY_PREFIX = "lab-report-draft:";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

function draftKey(taskId: string): string {
  return `${DRAFT_PREFIX}${taskId}`;
}

function legacyKey(taskId: string): string {
  return `${LEGACY_PREFIX}${taskId}`;
}

function isExpired(savedAt: string): boolean {
  const t = Date.parse(savedAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t > DRAFT_TTL_MS;
}

function normalizeLegacy(raw: unknown): UploadDraftV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const taskId = typeof o.taskId === "string" ? o.taskId : "";
  if (!taskId) return null;
  const files = Array.isArray(o.files) ? o.files : [];
  const filesMeta: UploadDraftFileMeta[] = files
    .filter((f): f is UploadDraftFileMeta => {
      if (!f || typeof f !== "object") return false;
      const row = f as UploadDraftFileMeta;
      return typeof row.id === "string" && typeof row.name === "string";
    })
    .map((f) => ({
      id: f.id,
      name: f.name,
      size: typeof f.size === "number" ? f.size : 0,
      type: typeof f.type === "string" ? f.type : "",
    }));
  const savedAt = typeof o.savedAt === "string" ? o.savedAt : new Date().toISOString();
  return {
    version: 1,
    savedAt,
    taskId,
    filesMeta,
    primaryFileId: typeof o.primaryFileId === "string" ? o.primaryFileId : null,
    verified: o.verified === true,
  };
}

function parseDraft(raw: string): UploadDraftV1 | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (o.version !== 1) return null;
    const savedAt = typeof o.savedAt === "string" ? o.savedAt : "";
    const taskId = typeof o.taskId === "string" ? o.taskId : "";
    if (!savedAt || !taskId) return null;
    if (isExpired(savedAt)) return null;
    const filesMeta = Array.isArray(o.filesMeta) ? o.filesMeta : [];
    return {
      version: 1,
      savedAt,
      taskId,
      filesMeta: filesMeta.filter(
        (f): f is UploadDraftFileMeta =>
          !!f &&
          typeof f === "object" &&
          typeof (f as UploadDraftFileMeta).id === "string" &&
          typeof (f as UploadDraftFileMeta).name === "string",
      ),
      primaryFileId: typeof o.primaryFileId === "string" ? o.primaryFileId : null,
      verified: o.verified === true,
    };
  } catch {
    return null;
  }
}

export function saveUploadDraft(draft: UploadDraftV1): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(draftKey(draft.taskId), JSON.stringify(draft));
    sessionStorage.removeItem(legacyKey(draft.taskId));
  } catch {
    /* quota */
  }
}

export function loadUploadDraft(taskId: string): UploadDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const current = sessionStorage.getItem(draftKey(taskId));
    if (current) {
      const parsed = parseDraft(current);
      if (!parsed) {
        clearUploadDraft(taskId);
        return null;
      }
      return parsed;
    }
    const legacy = sessionStorage.getItem(legacyKey(taskId));
    if (!legacy) return null;
    const migrated = normalizeLegacy(JSON.parse(legacy));
    if (!migrated || isExpired(migrated.savedAt)) {
      clearUploadDraft(taskId);
      return null;
    }
    saveUploadDraft(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export function clearUploadDraft(taskId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(draftKey(taskId));
  sessionStorage.removeItem(legacyKey(taskId));
}

/** True when draft has file metadata but caller has no in-memory File objects. */
export function draftNeedsFileReselect(
  draft: UploadDraftV1 | null,
  inMemoryFileCount: number,
): boolean {
  if (!draft) return false;
  return draft.filesMeta.length > 0 && inMemoryFileCount === 0;
}
