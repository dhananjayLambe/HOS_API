import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/**
 * GET /api/clinic/holidays?clinic_id={clinic_id}
 * Fetches list of clinic holidays
 * Backend: GET /api/clinic/clinics/{clinic_id}/holidays/
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinic_id")

    if (!clinicId) {
      return NextResponse.json(
        { error: "clinic_id is required" },
        { status: 400 }
      )
    }

    // Optional query parameters
    const fromDate = searchParams.get("from")
    const toDate = searchParams.get("to")
    const isActive = searchParams.get("is_active")

    const params = new URLSearchParams()
    if (fromDate) params.append("from", fromDate)
    if (toDate) params.append("to", toDate)
    if (isActive !== null) params.append("is_active", isActive)

    const queryString = params.toString()
    const url = `${DJANGO_API_URL}/api/clinic/clinics/${clinicId}/holidays/${queryString ? `?${queryString}` : ""}`

    const response = await fetch(url, {
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
          error: data.message || data.detail || "Failed to fetch holidays",
          ...data,
        },
        { status: response.status }
      )
    }

    const nextRes = NextResponse.json(
      {
        status: "success",
        message: "Holidays retrieved successfully",
        data: data.data || [],
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
    console.error("Holidays fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clinic/holidays
 * Creates a new clinic holiday
 * Backend: POST /api/clinic/clinics/{clinic_id}/holidays/
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()

    if (!body.clinic_id) {
      return NextResponse.json(
        { error: "clinic_id is required" },
        { status: 400 }
      )
    }

    const clinicId = body.clinic_id
    const requestBody = { ...body }
    delete requestBody.clinic_id // Remove clinic_id from body as it's in URL

    const response = await fetch(
      `${DJANGO_API_URL}/api/clinic/clinics/${clinicId}/holidays/`,
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

    let data
    try {
      const responseText = await response.text()
      data = responseText ? JSON.parse(responseText) : {}
    } catch (e) {
      console.error("Failed to parse holiday creation response:", e)
      return NextResponse.json(
        { 
          error: "Invalid response from server", 
          detail: response.statusText,
          message: "The server returned an invalid response. Please try again."
        },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      // Extract detailed error information
      let errorMessage = data.message || data.detail || data.error || "Failed to create holiday"
      
      // Handle validation errors
      if (data.errors) {
        const errorDetails: string[] = []
        
        // Handle non_field_errors (like overlapping holidays)
        if (data.errors.non_field_errors && Array.isArray(data.errors.non_field_errors)) {
          errorDetails.push(...data.errors.non_field_errors)
        }
        
        // Handle field-specific errors
        Object.entries(data.errors).forEach(([key, value]: [string, any]) => {
          if (key === 'non_field_errors') return // Already handled
          
          if (Array.isArray(value)) {
            value.forEach((err) => {
              if (typeof err === 'string') {
                errorDetails.push(`${key}: ${err}`)
              }
            })
          } else if (typeof value === 'string') {
            errorDetails.push(`${key}: ${value}`)
          }
        })
        
        if (errorDetails.length > 0) {
          errorMessage = errorDetails.join('; ')
        }
      }
      
      return NextResponse.json(
        {
          error: errorMessage,
          errors: data.errors || {},
          message: errorMessage,
          ...data,
        },
        { status: response.status }
      )
    }

    const nextRes = NextResponse.json(
      {
        status: "success",
        message: data.message || "Holiday created successfully",
        data: data.data,
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
    console.error("Holiday create error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

