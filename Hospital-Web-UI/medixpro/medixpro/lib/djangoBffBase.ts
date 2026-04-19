import { NextResponse } from "next/server"

export function resolveDjangoApiBase(): string {
  const fallback = "http://127.0.0.1:8000"
  const raw =
    process.env.DJANGO_API_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    fallback

  let base = raw.replace(/\/+$/, "")
  if (base.endsWith("/api")) {
    base = base.slice(0, -4)
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1):3000$/i.test(base)) {
    return fallback
  }
  return base || fallback
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
