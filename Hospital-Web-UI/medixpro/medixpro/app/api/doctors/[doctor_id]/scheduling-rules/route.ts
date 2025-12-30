import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doctor_id: string }> }
) {
  try {
    const token = request.headers.get("Authorization")
    const { doctor_id } = await params
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinic_id")

    if (!doctor_id) {
      return NextResponse.json(
        { error: "doctor_id is required" },
        { status: 400 }
      )
    }

    if (!clinicId) {
      return NextResponse.json(
        { error: "clinic_id is required" },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${DJANGO_API_URL}/api/doctor/scheduling-rules/?clinic_id=${clinicId}&doctor=${doctor_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: token }),
        },
        credentials: "include",
      }
    )

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
          error: data.message || data.detail || "Failed to fetch scheduling rules",
          ...data,
        },
        { status: response.status }
      )
    }

    const nextRes = NextResponse.json(
      {
        status: "success",
        message: data.message || "Scheduling rules retrieved successfully",
        data: data.data || data,
      },
      { status: response.status }
    )

    // Forward cookies if any
    const setCookies = response.headers.get("set-cookie")
    if (setCookies) {
      const cookies = setCookies.split(/,(?=[^ ]*?=)/)
      cookies.forEach((cookie) => {
        nextRes.headers.append("Set-Cookie", cookie)
      })
    }

    return nextRes
  } catch (error: any) {
    console.error("Scheduling rules fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ doctor_id: string }> }
) {
  try {
    const token = request.headers.get("Authorization")
    const { doctor_id } = await params
    const body = await request.json()

    if (!doctor_id) {
      return NextResponse.json(
        { error: "doctor_id is required" },
        { status: 400 }
      )
    }

    if (!body.clinic_id) {
      return NextResponse.json(
        { error: "clinic_id is required" },
        { status: 400 }
      )
    }

    // Add doctor_id to request body (backend expects it in body, not URL)
    const requestBody = {
      ...body,
      doctor: doctor_id, // Backend expects 'doctor' field
    }

    // Log request for debugging (remove in production)
    console.log("Scheduling rules POST request:", {
      doctor_id,
      clinic_id: body.clinic_id,
      url: `${DJANGO_API_URL}/api/doctor/scheduling-rules/`,
    })

    const response = await fetch(
      `${DJANGO_API_URL}/api/doctor/scheduling-rules/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: token }),
        },
        body: JSON.stringify(requestBody),
        credentials: "include",
      }
    )

    console.log("Scheduling rules POST response status:", response.status, response.statusText)

    let data: any = {}
    const contentType = response.headers.get("content-type")
    
    // Read response text once
    let responseText = ""
    try {
      responseText = await response.text()
    } catch (e) {
      console.error("Failed to read response:", e)
      return NextResponse.json(
        {
          error: "Failed to read response from server",
          detail: response.statusText,
          status: response.status,
        },
        { status: response.status }
      )
    }
    
    // Try to parse as JSON if we have content
    if (responseText) {
      // Only try to parse JSON if content-type indicates JSON or if response looks like JSON
      if (contentType && contentType.includes("application/json") || responseText.trim().startsWith("{")) {
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          console.error("Failed to parse JSON response:", e, "Response text:", responseText.substring(0, 200))
          // If parsing fails but we have text, return it as detail
          return NextResponse.json(
            {
              error: "Invalid JSON response from server",
              detail: responseText || response.statusText,
              status: response.status,
            },
            { status: response.status }
          )
        }
      } else {
        // Not JSON, return as error detail
        return NextResponse.json(
          {
            error: "Unexpected response format from server",
            detail: responseText || response.statusText,
            status: response.status,
          },
          { status: response.status }
        )
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || data.detail || data.error || "Failed to save scheduling rules",
          errors: data.errors || {},
          status: data.status || "error",
          ...data,
        },
        { status: response.status }
      )
    }

    const nextRes = NextResponse.json(
      {
        status: "success",
        message: data.message || "Scheduling rules saved successfully",
        data: data.data || data,
      },
      { status: response.status }
    )

    // Forward cookies if any
    const setCookies = response.headers.get("set-cookie")
    if (setCookies) {
      const cookies = setCookies.split(/,(?=[^ ]*?=)/)
      cookies.forEach((cookie) => {
        nextRes.headers.append("Set-Cookie", cookie)
      })
    }

    return nextRes
  } catch (error: any) {
    console.error("Scheduling rules save error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

