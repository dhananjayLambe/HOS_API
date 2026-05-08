import { type NextRequest, NextResponse } from "next/server"
import { getDjangoApiBase } from "@/lib/get-django-api-base"

function resolveDjangoApiBaseSafe(): string {
  const fallback = "http://127.0.0.1:8000/api/"
  const raw = (process.env.DJANGO_API_URL || "").trim()

  // If misconfigured as relative (/api), force safe absolute fallback.
  if (raw && !raw.startsWith("http://") && !raw.startsWith("https://")) {
    return fallback
  }

  const resolved = (raw || getDjangoApiBase()).trim()
  return resolved || fallback
}

function djangoReportSummaryUrl(searchParams?: URLSearchParams): string {
  const base = resolveDjangoApiBaseSafe().replace(/\/+$/, "")
  const qs = searchParams?.toString()
  return `${base}/reports/appointments/summary/${qs ? `?${qs}` : ""}`
}

export async function GET(request: NextRequest) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const rawAuthHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const authHeader = rawAuthHeader && /^Bearer\s+\S+/i.test(rawAuthHeader.trim()) ? rawAuthHeader.trim() : null
    const { searchParams } = request.nextUrl

    const response = await fetch(djangoReportSummaryUrl(searchParams), {
      method: "GET",
      headers: {
        ...(authHeader && { Authorization: authHeader }),
      },
      credentials: "include",
      signal: controller.signal,
    })

    const rawBody = await response.text()
    const hasJsonBody = response.headers.get("content-type")?.includes("application/json")
    let data: unknown = {}
    if (hasJsonBody && rawBody) {
      try {
        data = JSON.parse(rawBody)
      } catch {
        data = response.ok ? {} : { error: "Request failed", detail: response.statusText }
      }
    } else if (!response.ok) {
      data = { error: "Request failed", detail: response.statusText }
    }

    const nextRes = NextResponse.json(data, { status: response.status })
    const setCookies = response.headers.get("set-cookie")
    if (setCookies) {
      const cookies = setCookies.split(/,(?=[^ ]*?=)/)
      cookies.forEach((cookie) => {
        nextRes.headers.append("Set-Cookie", cookie)
      })
    }
    return nextRes
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Proxy request timed out", detail: "Upstream timeout after 12s" }, { status: 504 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("[API] reports/appointments/summary GET proxy error:", error)
    return NextResponse.json({ error: "Proxy request failed", detail: message }, { status: 500 })
  } finally {
    clearTimeout(timeout)
  }
}
