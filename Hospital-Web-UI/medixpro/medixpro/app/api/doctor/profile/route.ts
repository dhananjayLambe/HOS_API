import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// GET - Fetch doctor profile
export async function GET(request: NextRequest) {
  console.log("Fetching doctor profile...")
  try {
    const token = request.headers.get("authorization")

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/profile/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      // Forward cookies when Django uses cookie-based auth
      credentials: "include",
    })

    let data
    try {
      data = await response.json()
    } catch (e) {
      // If response is not JSON, return a generic error
      return NextResponse.json(
        { error: "Invalid response from server", detail: response.statusText },
        { status: response.status }
      )
    }

    if (!response.ok) {
      // Return error response that axios will treat as error
      return NextResponse.json(
        {
          error: data.message || data.detail || "Failed to fetch profile",
          detail: data.detail || data.message,
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
  } catch (error) {
    console.error("[v0] Profile fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Update doctor profile
export async function PATCH(request: NextRequest) {
  try {
    // Get token from Authorization header (case-insensitive)
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const body = await request.json()

    console.log("[Next.js API] PATCH /api/doctor/profile - Request body:", JSON.stringify(body, null, 2))

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/profile/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
      credentials: "include",
    })

    const data = await response.json()

    console.log("[Next.js API] PATCH response status:", response.status)
    console.log("[Next.js API] PATCH response data:", JSON.stringify(data, null, 2))

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: data.message || data.detail || "Failed to update profile", 
          errors: data.errors || data,
          status: response.status
        },
        { status: response.status },
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
    console.error("[Next.js API] Profile update error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: error.stack
      }, 
      { status: 500 }
    )
  }
}
