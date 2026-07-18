/**
 * Workspace preview/download URLs are opaque JWT-protected API paths (302 → storage).
 * <iframe>/<img>/<a> cannot attach Authorization from localStorage — resolve first.
 */

import { backendAxiosClient } from "@/lib/axiosClient";

const WORKSPACE_ACCESS_PATH =
  /\/(?:api\/v1\/doctors\/reports\/)?workspace\/reports\/[^/]+\/(preview|download)\/?/i;

/** Ensure Django reverse paths work through the Next `/api` rewrite. */
export function normalizeWorkspaceAccessUrl(url: string): string {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) return url;
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    let path = parsed.pathname;
    if (path.startsWith("/workspace/reports/")) {
      path = `/api/v1/doctors/reports${path}`;
    }
    return `${path}${parsed.search}`;
  } catch {
    if (url.startsWith("/workspace/reports/")) {
      return `/api/v1/doctors/reports${url}`;
    }
    return url;
  }
}

export function isWorkspaceAccessApiUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const normalized = normalizeWorkspaceAccessUrl(url);
  try {
    const parsed = new URL(normalized, globalThis?.location?.origin ?? "http://localhost");
    return WORKSPACE_ACCESS_PATH.test(parsed.pathname);
  } catch {
    return WORKSPACE_ACCESS_PATH.test(normalized);
  }
}

export type ResolvedWorkspaceAccess =
  | { kind: "remote"; url: string }
  | { kind: "blob"; url: string; revoke: () => void };

function toFetchUrl(url: string): string {
  const normalized = normalizeWorkspaceAccessUrl(url);
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }
  if (typeof window === "undefined") return normalized;
  return new URL(normalized, window.location.origin).toString();
}

/** Axios path: absolute-on-origin paths starting with /api work with baseURL `/api`. */
function toAxiosPath(url: string): string {
  const normalized = normalizeWorkspaceAccessUrl(url);
  try {
    const parsed = new URL(normalized, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return normalized;
  }
}

async function resolveViaRedirectLocation(
  accessUrl: string,
  options?: { signal?: AbortSignal }
): Promise<string | ResolvedWorkspaceAccess | null> {
  const token =
    typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
  const response = await fetch(toFetchUrl(accessUrl), {
    method: "GET",
    redirect: "manual",
    signal: options?.signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (response.status >= 300 && response.status < 400) {
    return response.headers.get("Location");
  }

  // Opaque cross-origin redirect (some browsers)
  if (response.type === "opaqueredirect" || response.status === 0) {
    return null;
  }

  if (response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        data?: { preview_supported?: boolean };
      } | null;
      if (body?.data?.preview_supported === false) {
        throw new Error("Preview is not available for this file type.");
      }
      throw new Error(body?.message || "Preview response was not a file.");
    }
    // Local/dev FileResponse — consume binary/text bodies as blob URLs.
    if (
      contentType.includes("application/pdf") ||
      contentType.startsWith("image/") ||
      contentType.includes("octet-stream") ||
      contentType.includes("text/") ||
      contentType.includes("csv") ||
      contentType.includes("spreadsheet") ||
      contentType.includes("wordprocessingml") ||
      contentType.includes("msword") ||
      contentType.includes("ms-excel") ||
      contentType.includes("zip")
    ) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      return {
        kind: "blob",
        url: objectUrl,
        revoke: () => URL.revokeObjectURL(objectUrl),
      };
    }
    // Proxied file body — caller should blob via axios instead
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Not authorized to open this artifact.");
  }
  if (response.status === 404) {
    throw new Error("Artifact not found.");
  }
  return null;
}

async function resolveViaAuthenticatedBlob(
  accessUrl: string,
  options?: { signal?: AbortSignal }
): Promise<ResolvedWorkspaceAccess> {
  const path = toAxiosPath(accessUrl);
  const response = await backendAxiosClient.get<Blob>(path, {
    responseType: "blob",
    signal: options?.signal,
    // Treat redirects as success when the client follows them to a file body
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const contentType = String(response.headers["content-type"] || "");
  if (contentType.includes("application/json")) {
    const text = await response.data.text();
    const body = JSON.parse(text) as {
      message?: string;
      data?: { preview_supported?: boolean };
    };
    if (body?.data?.preview_supported === false) {
      throw new Error("Preview is not available for this file type.");
    }
    throw new Error(body?.message || "Preview response was not a file.");
  }

  const objectUrl = URL.createObjectURL(response.data);
  return {
    kind: "blob",
    url: objectUrl,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

/**
 * Authenticated resolve: prefer 302 Location (presigned), else JWT blob download.
 * Caller must revoke blob URLs when done.
 */
export async function resolveWorkspaceAccessUrl(
  accessUrl: string,
  options?: { signal?: AbortSignal }
): Promise<ResolvedWorkspaceAccess> {
  if (
    accessUrl.startsWith("blob:") ||
    accessUrl.startsWith("data:") ||
    !isWorkspaceAccessApiUrl(accessUrl)
  ) {
    return { kind: "remote", url: accessUrl };
  }

  try {
    const resolved = await resolveViaRedirectLocation(accessUrl, options);
    if (resolved) {
      if (typeof resolved === "string") {
        return { kind: "remote", url: resolved };
      }
      return resolved;
    }
  } catch (e) {
    // Fall through to blob path for recoverable cases; rethrow auth/not-found
    if (e instanceof Error && /not authorized|not found|not available/i.test(e.message)) {
      throw e;
    }
  }

  return resolveViaAuthenticatedBlob(accessUrl, options);
}
