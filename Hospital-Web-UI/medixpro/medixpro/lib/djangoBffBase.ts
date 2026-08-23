import { NextResponse } from "next/server"
import { getDjangoApiBase } from "@/lib/get-django-api-base"
import { serverLogger } from "@/lib/serverLogger"

/** Django origin (no trailing /api) for BFF routes that append `/api/...` themselves. */
export function resolveDjangoApiBase(): string {
  const withApi = getDjangoApiBase().replace(/\/+$/, "")
  const origin = withApi.endsWith("/api") ? withApi.slice(0, -4) : withApi
  return origin.replace(/\/+$/, "") || "http://127.0.0.1:8000"
}

/**
 * Parse a Django/BFF upstream body as JSON. Django DEBUG 500s are HTML
 * (`<!DOCTYPE html>...`); calling `res.json()` on those throws SyntaxError.
 */
export async function readDjangoJson(
  res: Response,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const contentType = res.headers.get("content-type") || ""
  const text = await res.text()
  const looksJson = contentType.includes("application/json") || text.trim().startsWith("{")
  if (!looksJson) {
    const prefix = text.replace(/\s+/g, " ").slice(0, 180)
    serverLogger.error("Django BFF upstream returned HTML instead of JSON", undefined, {
      status: res.status,
      contentType,
      bodyPrefix: prefix,
      upstream: res.url || null,
    })
    return {
      status: res.status >= 400 ? res.status : 502,
      data: {
        error: "Backend returned an HTML error instead of JSON. Check the Django server log.",
        status: "backend_error",
      },
    }
  }
  try {
    const data = JSON.parse(text) as Record<string, unknown>
    return { status: res.status, data }
  } catch {
    return {
      status: 502,
      data: {
        error: "Backend returned invalid JSON.",
        status: "backend_error",
      },
    }
  }
}

/**
 * Normalize any Django/DRF failure to `{ error: string }` for the browser.
 */
export function nextJsonErrorFromDjango(res: Response, raw: unknown): NextResponse {
  const data = raw as Record<string, unknown> | null
  if (data && typeof data.error === "string" && data.error) {
    return NextResponse.json({ error: data.error }, { status: res.status })
  }
  if (data && typeof data.detail === "string" && data.detail) {
    return NextResponse.json({ error: data.detail }, { status: res.status })
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const parts = Object.entries(data).map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.join(", ")}`
      if (typeof value === "string") return `${key}: ${value}`
      return `${key}: ${JSON.stringify(value)}`
    })
    const msg = parts.join("; ")
    if (msg) {
      return NextResponse.json({ error: msg }, { status: res.status })
    }
  }
  return NextResponse.json({ error: "Something went wrong" }, { status: res.status })
}
