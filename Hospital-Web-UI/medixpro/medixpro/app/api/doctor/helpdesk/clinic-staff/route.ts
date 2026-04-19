/**
 * BFF for clinic helpdesk staff. Browser calls this Next route only.
 *
 * Django upstream (see Hospital-Management-API main/urls.py `path("api/helpdesk/", ...)`):
 *   GET  {base}/api/helpdesk/list/?clinic_id=...
 *   POST {base}/api/helpdesk/create/
 * Not under /api/doctor/ — that prefix is only for doctor.api.urls (e.g. pending-requests / approve).
 */
import { nextJsonErrorFromDjango, resolveDjangoApiBase } from "@/lib/djangoBffBase"
import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = resolveDjangoApiBase()

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")
    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()
    const url = query
      ? `${DJANGO_API_URL}/api/helpdesk/list/?${query}`
      : `${DJANGO_API_URL}/api/helpdesk/list/`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      credentials: "include",
    })

    const raw = await response.json().catch(() => ({}))

    if (!response.ok) {
      return nextJsonErrorFromDjango(response, raw)
    }

    return NextResponse.json(raw, { status: response.status })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/helpdesk/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(body),
      credentials: "include",
    })

    const raw = await response.json().catch(() => ({}))

    if (!response.ok) {
      return nextJsonErrorFromDjango(response, raw)
    }

    return NextResponse.json(raw, { status: response.status })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong"
    console.error("[BFF] POST clinic-staff → Django /api/helpdesk/create/", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
