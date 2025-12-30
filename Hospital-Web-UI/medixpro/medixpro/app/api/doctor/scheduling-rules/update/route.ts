import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get("doctor_id")
    const clinicId = searchParams.get("clinic_id")
    const body = await request.json()

    if (!doctorId) {
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

    // Log request for debugging
    console.log("Scheduling rules UPSERT request:", {
      doctor_id: doctorId,
      clinic_id: clinicId,
      url: `${DJANGO_API_URL}/api/doctor/scheduling-rules/update/?doctor_id=${doctorId}&clinic_id=${clinicId}`,
    })

    const response = await fetch(
      `${DJANGO_API_URL}/api/doctor/scheduling-rules/update/?doctor_id=${doctorId}&clinic_id=${clinicId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: token }),
        },
        body: JSON.stringify(body),
        credentials: "include",
      }
    )

    console.log("Scheduling rules UPSERT response status:", response.status, response.statusText)

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
          error: data.message || data.detail || data.error || "Failed to update scheduling rules",
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
    console.error("Scheduling rules UPSERT error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

