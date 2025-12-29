import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// GET - Retrieve a specific cancellation policy
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("Authorization")
    const { id } = await params

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/cancellation-policies/${id}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      credentials: "include",
    })

    let data
    try {
      data = await response.json()
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid response from server", detail: response.statusText },
        { status: response.status }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || data.detail || "Failed to fetch cancellation policy",
          ...data,
        },
        { status: response.status }
      )
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
  } catch (error: any) {
    console.error("Cancellation policy fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update a cancellation policy (full update)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("Authorization")
    const { id } = await params
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/cancellation-policies/${id}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify(body),
      credentials: "include",
    })

    let data
    try {
      data = await response.json()
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid response from server", detail: response.statusText },
        { status: response.status }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || data.detail || "Failed to update cancellation policy",
          errors: data.errors || data,
          ...data,
        },
        { status: response.status }
      )
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
  } catch (error: any) {
    console.error("Cancellation policy update error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Partially update a cancellation policy
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("[Next.js API] PATCH /api/doctor/cancellation-policies/[id] - Request received")
    const token = request.headers.get("Authorization")
    const { id } = await params
    const body = await request.json()
    console.log("[Next.js API] Request body:", JSON.stringify(body, null, 2))
    console.log("[Next.js API] Policy ID:", id)

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/cancellation-policies/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify(body),
      credentials: "include",
    })

    console.log("[Next.js API] Django response status:", response.status)
    console.log("[Next.js API] Django response headers:", Object.fromEntries(response.headers.entries()))

    let data
    const contentType = response.headers.get("content-type")
    const responseText = await response.text()
    console.log("[Next.js API] Response text:", responseText)
    console.log("[Next.js API] Content-Type:", contentType)

    try {
      if (responseText) {
        data = JSON.parse(responseText)
      } else {
        data = {}
      }
    } catch (e) {
      console.error("[Next.js API] Failed to parse JSON:", e, "Response text:", responseText)
      return NextResponse.json(
        { 
          error: "Invalid response from server", 
          detail: response.statusText,
          statusText: responseText || "Empty response"
        },
        { status: response.status }
      )
    }

    console.log("[Next.js API] Parsed data:", data)

    if (!response.ok) {
      console.error("[Next.js API] Django error response:", data)
      return NextResponse.json(
        {
          error: data.message || data.detail || data.error || "Failed to update cancellation policy",
          errors: data.errors || data,
          detail: data.detail || data.message || data.error,
          ...data,
        },
        { status: response.status }
      )
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
  } catch (error: any) {
    console.error("Cancellation policy patch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a cancellation policy
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("Authorization")
    const { id } = await params

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/cancellation-policies/${id}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      credentials: "include",
    })

    if (!response.ok) {
      let data
      try {
        data = await response.json()
      } catch (e) {
        return NextResponse.json(
          { error: "Failed to delete cancellation policy" },
          { status: response.status }
        )
      }
      return NextResponse.json(
        {
          error: data.message || data.detail || "Failed to delete cancellation policy",
          ...data,
        },
        { status: response.status }
      )
    }

    // DELETE typically returns 204 No Content
    return new NextResponse(null, { status: response.status || 204 })
  } catch (error: any) {
    console.error("Cancellation policy delete error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

