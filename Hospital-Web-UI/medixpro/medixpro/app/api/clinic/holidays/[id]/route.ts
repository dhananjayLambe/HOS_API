import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/**
 * GET /api/clinic/holidays/[id]?clinic_id={clinic_id}
 * Retrieves a specific clinic holiday
 * Backend: GET /api/clinic/clinics/{clinic_id}/holidays/{holiday_id}/
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("Authorization")
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinic_id")
    const { id } = await params

    if (!clinicId) {
      return NextResponse.json(
        { error: "clinic_id is required" },
        { status: 400 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: "Holiday ID is required" },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${DJANGO_API_URL}/api/clinic/clinics/${clinicId}/holidays/${id}/`,
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
          error: data.message || data.detail || "Failed to fetch holiday",
          ...data,
        },
        { status: response.status }
      )
    }

    const nextRes = NextResponse.json(
      {
        status: "success",
        message: "Holiday retrieved successfully",
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
    console.error("Holiday fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/clinic/holidays/[id]?clinic_id={clinic_id}
 * Updates a clinic holiday
 * Backend: PATCH /api/clinic/clinics/{clinic_id}/holidays/{holiday_id}/
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinic_id")
    const { id } = await params

    if (!clinicId) {
      return NextResponse.json(
        { error: "clinic_id is required" },
        { status: 400 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: "Holiday ID is required" },
        { status: 400 }
      )
    }

    console.log(`[PATCH /api/clinic/holidays/${id}] Updating holiday with data:`, body)
    console.log(`[PATCH /api/clinic/holidays/${id}] Backend URL: ${DJANGO_API_URL}/api/clinic/clinics/${clinicId}/holidays/${id}/`)

    const response = await fetch(
      `${DJANGO_API_URL}/api/clinic/clinics/${clinicId}/holidays/${id}/`,
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

    console.log(`[PATCH /api/clinic/holidays/${id}] Response status:`, response.status)

    let data
    try {
      const responseText = await response.text()
      console.log(`[PATCH /api/clinic/holidays/${id}] Response text:`, responseText)
      data = responseText ? JSON.parse(responseText) : {}
    } catch (e) {
      console.error(`[PATCH /api/clinic/holidays/${id}] Failed to parse response:`, e)
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
      console.error(`[PATCH /api/clinic/holidays/${id}] Error response:`, data)
      
      // Extract detailed error information
      let errorMessage = data.message || data.detail || data.error || "Failed to update holiday"
      
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
        status: data.status || "success",
        message: data.message || "Holiday updated successfully",
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
    console.error("Holiday update error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/clinic/holidays/[id]?clinic_id={clinic_id}
 * Deletes a clinic holiday (soft delete via deactivate endpoint)
 * Backend: PATCH /api/clinic/clinics/{clinic_id}/holidays/{holiday_id}/deactivate/
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("Authorization")
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinic_id")
    const { id } = await params

    if (!clinicId) {
      return NextResponse.json(
        { error: "clinic_id is required" },
        { status: 400 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: "Holiday ID is required" },
        { status: 400 }
      )
    }

    // Use deactivate endpoint for soft delete
    const response = await fetch(
      `${DJANGO_API_URL}/api/clinic/clinics/${clinicId}/holidays/${id}/deactivate/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: token }),
        },
        credentials: "include",
      }
    )

    // Handle successful deletion (200 OK)
    if (response.status === 200) {
      try {
        const data = await response.json()
        const nextRes = NextResponse.json(
          {
            status: "success",
            message: data.message || "Holiday deleted successfully",
            ...data,
          },
          { status: 200 }
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
      } catch (e) {
        // If we can't parse JSON but status is 200, still return success
        return NextResponse.json(
          {
            status: "success",
            message: "Holiday deleted successfully",
          },
          { status: 200 }
        )
      }
    }

    // Handle error responses
    let data
    try {
      data = await response.json()
    } catch (e) {
      return NextResponse.json(
        {
          error: "Invalid response from server",
          detail: response.statusText,
          status: "error",
        },
        { status: response.status }
      )
    }

    const errorRes = NextResponse.json(
      {
        error: data.message || data.detail || "Failed to delete holiday",
        status: "error",
        ...data,
      },
      { status: response.status }
    )

    // Forward cookies if any
    const setCookies = response.headers.get("set-cookie")
    if (setCookies) {
      const cookies = setCookies.split(/,(?=[^ ]*?=)/)
      cookies.forEach((cookie) => {
        errorRes.headers.append("Set-Cookie", cookie)
      })
    }

    return errorRes
  } catch (error: any) {
    console.error("Holiday delete error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

