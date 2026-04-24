"use client";

type AnyObject = Record<string, unknown>;

export interface ParsedAuthTokens {
  access: string | null;
  refresh: string | null;
}

/**
 * Accepts both supported response shapes:
 * - { tokens: { access, refresh } }
 * - { access, refresh } / { access_token, refresh_token }
 */
export function extractAuthTokens(payload: unknown): ParsedAuthTokens {
  const data = (payload ?? {}) as AnyObject;
  const nested = (data.tokens ?? {}) as AnyObject;

  const access =
    asString(nested.access) ??
    asString(data.access) ??
    asString(data.access_token) ??
    null;

  const refresh =
    asString(nested.refresh) ??
    asString(data.refresh) ??
    asString(data.refresh_token) ??
    null;

  return { access, refresh };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

