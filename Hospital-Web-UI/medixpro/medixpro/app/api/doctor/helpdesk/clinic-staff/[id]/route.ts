/** DELETE → Django `DELETE {base}/api/helpdesk/<uuid>/delete/` (main/urls.py api/helpdesk/). */
import { nextJsonErrorFromDjango, resolveDjangoApiBase } from "@/lib/djangoBffBase"
import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = resolveDjangoApiBase()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("authorization")
    const { id } = await params

    const response = await fetch(`${DJANGO_API_URL}/api/helpdesk/${id}/delete/`, {
      method: "DELETE",
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
