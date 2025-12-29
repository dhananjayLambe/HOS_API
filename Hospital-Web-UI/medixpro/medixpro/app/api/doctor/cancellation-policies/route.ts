import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// GET - List all cancellation policies (with optional clinic filter)
export async function GET(request: NextRequest) {
  try {
    console.log("[Next.js API] GET /api/doctor/cancellation-policies - Request received")
    const token = request.headers.get("Authorization")
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinic")
    const doctorId = searchParams.get("doctor")
    console.log("[Next.js API] Clinic ID:", clinicId, "Doctor ID:", doctorId)

    const params = new URLSearchParams()
    if (clinicId) params.append('clinic', clinicId)
    if (doctorId) params.append('doctor', doctorId)
    const queryString = params.toString()
    const url = queryString 
      ? `${DJANGO_API_URL}/api/doctor/cancellation-policies/?${queryString}`
      : `${DJANGO_API_URL}/api/doctor/cancellation-policies/`

    console.log("[Next.js API] Calling Django:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      credentials: "include",
    })

    let data
    const contentType = response.headers.get("content-type")
    
    // Check if response is HTML (404 page) instead of JSON
    if (contentType && contentType.includes("text/html")) {
      console.error("[Next.js API] Django returned HTML instead of JSON - likely 404")
      // Return empty array for 404 (no data exists yet) - match Django format
      if (response.status === 404) {
        return NextResponse.json(
          {
            status: "success",
            message: "Cancellation policies retrieved successfully",
            data: [],
          },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: "Invalid response format from server" },
        { status: response.status }
      )
    }

    try {
      const text = await response.text()
      if (!text) {
        // Empty response - return empty array for 404 - match Django format
        if (response.status === 404) {
          return NextResponse.json(
            {
              status: "success",
              message: "Cancellation policies retrieved successfully",
              data: [],
            },
            { status: 200 }
          )
        }
        data = {}
      } else {
        data = JSON.parse(text)
      }
    } catch (e) {
      console.error("[Next.js API] Failed to parse response:", e)
      // If 404, return empty array - match Django format
      if (response.status === 404) {
        return NextResponse.json(
          {
            status: "success",
            message: "Cancellation policies retrieved successfully",
            data: [],
          },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: "Invalid response from server", detail: response.statusText },
        { status: response.status }
      )
    }

    if (!response.ok) {
      // Handle 404 gracefully - return empty array - match Django format
      if (response.status === 404) {
        return NextResponse.json(
          {
            status: "success",
            message: "Cancellation policies retrieved successfully",
            data: [],
          },
          { status: 200 }
        )
      }
      return NextResponse.json(
        {
          error: data.message || data.detail || "Failed to fetch cancellation policies",
          ...data,
        },
        { status: response.status }
      )
    }

    // Normalize response structure to always have { status, message, data }
    // Handle paginated responses: { count, next, previous, results: { status, message, data: [...] } }
    let normalizedData = data
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (data.data !== undefined && Array.isArray(data.data)) {
        normalizedData = data
      } else if (data.results !== undefined) {
        if (Array.isArray(data.results)) {
          // results is an array
          normalizedData = {
            status: data.status || "success",
            message: data.message || "Cancellation policies retrieved successfully",
            data: data.results
          }
        } else if (data.results && typeof data.results === 'object' && data.results.data && Array.isArray(data.results.data)) {
          // results is an object with nested { status, message, data: [...] }
          normalizedData = {
            status: data.results.status || data.status || "success",
            message: data.results.message || data.message || "Cancellation policies retrieved successfully",
            data: data.results.data
          }
        }
      } else if (data.id) {
        // Single record
        normalizedData = {
          status: "success",
          message: "Cancellation policy retrieved successfully",
          data: [data]
        }
      } else {
        // Try to find array in any property
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key])) {
            normalizedData = {
              status: data.status || "success",
              message: data.message || "Cancellation policies retrieved successfully",
              data: data[key]
            }
            break
          }
        }
      }
    } else if (Array.isArray(data)) {
      normalizedData = {
        status: "success",
        message: "Cancellation policies retrieved successfully",
        data: data
      }
    }

    const nextRes = NextResponse.json(normalizedData, { status: response.status })
    const setCookies = response.headers.get("set-cookie")
    if (setCookies) {
      const cookies = setCookies.split(/,(?=[^ ]*?=)/)
      cookies.forEach((cookie) => {
        nextRes.headers.append("Set-Cookie", cookie)
      })
    }
    return nextRes
  } catch (error: any) {
    console.error("Cancellation policies fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a new cancellation policy
export async function POST(request: NextRequest) {
  try {
    console.log("[Next.js API] POST /api/doctor/cancellation-policies - Request received")
    const token = request.headers.get("Authorization")
    const body = await request.json()
    console.log("[Next.js API] Request body:", JSON.stringify(body, null, 2))

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/cancellation-policies/`, {
      method: "POST",
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
          error: data.message || data.detail || data.error || "Failed to create cancellation policy",
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
    console.error("Cancellation policy create error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

