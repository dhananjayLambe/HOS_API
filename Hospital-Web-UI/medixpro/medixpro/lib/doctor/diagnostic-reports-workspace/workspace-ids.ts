/**
 * Shared UUID helpers for live workspace query params.
 * Matches Django `UUID()` acceptance (any RFC-4122 hex form).
 * Drops demo fixture ids like `pat-priya`.
 */
export function isWorkspaceUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

export function workspaceUuidOrNull(value: string | null | undefined): string | null {
  return isWorkspaceUuid(value) ? String(value).trim() : null;
}

export function workspaceUuidOrUndefined(
  value: string | null | undefined
): string | undefined {
  return isWorkspaceUuid(value) ? String(value).trim() : undefined;
}
