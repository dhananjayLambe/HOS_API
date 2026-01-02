import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/**
 * PATCH /api/doctor/leaves/[id]
 * Updates an existing doctor leave
 * Backend: PATCH /api/doctor/doctor-leave-update/<uuid:pk>/
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Leave ID is required" },
        { status: 400 }
      )
    }

    console.log(`[PATCH /api/doctor/leaves/${id}] Updating leave with data:`, body)
    console.log(`[PATCH /api/doctor/leaves/${id}] Backend URL: ${DJANGO_API_URL}/api/doctor/doctor-leave-update/${id}/`)

    const response = await fetch(
      `${DJANGO_API_URL}/api/doctor/doctor-leave-update/${id}/`,
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

    console.log(`[PATCH /api/doctor/leaves/${id}] Response status:`, response.status)
    console.log(`[PATCH /api/doctor/leaves/${id}] Response ok:`, response.ok)

    let data
    try {
      const responseText = await response.text()
      console.log(`[PATCH /api/doctor/leaves/${id}] Response text:`, responseText)
      data = responseText ? JSON.parse(responseText) : {}
    } catch (e) {
      console.error(`[PATCH /api/doctor/leaves/${id}] Failed to parse response:`, e)
      return NextResponse.json(
        { error: "Invalid response from server", detail: response.statusText },
        { status: response.status }
      )
    }

    console.log(`[PATCH /api/doctor/leaves/${id}] Parsed data:`, data)

    if (!response.ok) {
      console.error(`[PATCH /api/doctor/leaves/${id}] Error response:`, data)
      return NextResponse.json(
        {
          error: data.message || data.detail || "Failed to update leave",
          errors: data.errors || {},
          ...data,
        },
        { status: response.status }
      )
    }

    // Backend returns: { status: "success", message: "...", data: {...} }
    // We need to preserve this structure
    const nextRes = NextResponse.json(
      {
        status: data.status || "success",
        message: data.message || "Leave updated successfully",
        data: data.data || data, // Handle both nested and flat responses
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
    console.error("Leave update error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/doctor/leaves/[id]
 * Deletes a doctor leave
 * Backend: DELETE /api/doctor/doctor-leave-delete/<uuid:pk>/
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("Authorization")
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Leave ID is required" },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${DJANGO_API_URL}/api/doctor/doctor-leave-delete/${id}/`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: token }),
        },
        credentials: "include",
      }
    )

    // Handle successful deletion (204 No Content or 200 OK)
    if (response.status === 204 || response.status === 200) {
      // For 204, there's no body, so we return success
      // For 200, try to parse response but handle gracefully if empty
      if (response.status === 204) {
        return NextResponse.json(
          {
            status: "success",
            message: "Leave deleted successfully",
          },
          { status: 200 }
        )
      }
      
      // For 200, try to parse response
      try {
        const data = await response.json()
        const nextRes = NextResponse.json(
          {
            status: "success",
            message: data.message || "Leave deleted successfully",
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
            message: "Leave deleted successfully",
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
          status: "error"
        },
        { status: response.status }
      )
    }

    const errorRes = NextResponse.json(
      {
        error: data.message || data.detail || "Failed to delete leave",
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
    console.error("Leave delete error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

