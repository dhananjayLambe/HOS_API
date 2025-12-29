import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// GET - List all fee structures (with optional clinic filter)
export async function GET(request: NextRequest) {
  try {
    console.log("[Next.js API] GET /api/doctor/doctor-fees - Request received")
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
      ? `${DJANGO_API_URL}/api/doctor/doctor-fees/?${queryString}`
      : `${DJANGO_API_URL}/api/doctor/doctor-fees/`

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
            message: "Fee structures retrieved successfully",
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
              message: "Fee structures retrieved successfully",
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
            message: "Fee structures retrieved successfully",
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
            message: "Fee structures retrieved successfully",
            data: [],
          },
          { status: 200 }
        )
      }
      return NextResponse.json(
        {
          error: data.message || data.detail || "Failed to fetch fee structures",
          ...data,
        },
        { status: response.status }
      )
    }

    // Log the Django response structure for debugging
    console.log("[Next.js API] Django GET response data (FULL):", JSON.stringify(data, null, 2))
    console.log("[Next.js API] Django response data type:", typeof data)
    console.log("[Next.js API] Django response keys:", data && typeof data === 'object' ? Object.keys(data) : 'N/A')
    console.log("[Next.js API] Django response has 'data' property:", !!data?.data)
    console.log("[Next.js API] Django response.data is array:", Array.isArray(data?.data))
    console.log("[Next.js API] Django response is array:", Array.isArray(data))
    if (data?.data) {
      console.log("[Next.js API] Django response.data length:", Array.isArray(data.data) ? data.data.length : 'not array')
      if (Array.isArray(data.data) && data.data.length > 0) {
        console.log("[Next.js API] Django response.data[0]:", JSON.stringify(data.data[0], null, 2))
      }
    } else if (Array.isArray(data)) {
      console.log("[Next.js API] Django response is direct array, length:", data.length)
      if (data.length > 0) {
        console.log("[Next.js API] Django response[0]:", JSON.stringify(data[0], null, 2))
      }
    }

    // CRITICAL: Django ViewSet.list() returns { status: "success", message: "...", data: [...] }
    // But paginated responses have nested structure: { count, next, previous, results: { status, message, data: [...] } }
    // Normalize to always have { status, message, data }
    let normalizedData = data
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // Check if it already has the correct structure
      if (data.data !== undefined && Array.isArray(data.data)) {
        // Already has data array - use as-is
        normalizedData = data
      } else if (data.results !== undefined) {
        // Paginated response with 'results' property
        if (Array.isArray(data.results)) {
          // results is an array - convert to 'data'
          console.log("[Next.js API] Paginated response detected (results is array), converting 'results' to 'data'")
          normalizedData = {
            status: data.status || "success",
            message: data.message || "Fee structures retrieved successfully",
            data: data.results,
            count: data.count,
            next: data.next,
            previous: data.previous
          }
        } else if (data.results && typeof data.results === 'object' && data.results.data && Array.isArray(data.results.data)) {
          // results is an object with nested { status, message, data: [...] } - extract the data array
          console.log("[Next.js API] Paginated response detected (results is object with nested data), extracting data.results.data")
          normalizedData = {
            status: data.results.status || data.status || "success",
            message: data.results.message || data.message || "Fee structures retrieved successfully",
            data: data.results.data,
            count: data.count,
            next: data.next,
            previous: data.previous
          }
        } else {
          console.warn("[Next.js API] Paginated response but results structure is unexpected:", data.results)
        }
      } else if (data.id) {
        // Single record - wrap in data array
        console.log("[Next.js API] Single record detected, wrapping in data array")
        normalizedData = {
          status: "success",
          message: "Fee structure retrieved successfully",
          data: [data]
        }
      } else {
        // Unknown structure - try to extract array from any property
        console.log("[Next.js API] Unknown response structure, attempting to normalize...")
        const dataKeys = Object.keys(data)
        console.log("[Next.js API] Response keys:", dataKeys)
        // Check if any key contains an array
        for (const key of dataKeys) {
          if (Array.isArray(data[key])) {
            console.log(`[Next.js API] Found array in key '${key}', using as data`)
            normalizedData = {
              status: data.status || "success",
              message: data.message || "Fee structures retrieved successfully",
              data: data[key]
            }
            break
          }
        }
      }
    } else if (Array.isArray(data)) {
      // Django returned array directly - wrap it
      console.log("[Next.js API] Response is direct array, wrapping in Django format")
      normalizedData = {
        status: "success",
        message: "Fee structures retrieved successfully",
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
    console.error("Fee structures fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a new fee structure
export async function POST(request: NextRequest) {
  try {
    console.log("[Next.js API] POST /api/doctor/doctor-fees - Request received")
    const token = request.headers.get("Authorization")
    const body = await request.json()
    console.log("[Next.js API] Request body:", JSON.stringify(body, null, 2))

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/doctor-fees/`, {
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
          error: data.message || data.detail || data.error || "Failed to create fee structure",
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
    console.error("Fee structure create error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

