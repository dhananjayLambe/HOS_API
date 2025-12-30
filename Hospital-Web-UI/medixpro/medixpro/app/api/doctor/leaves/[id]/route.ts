import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
          error: data.message || data.detail || "Failed to update leave",
          errors: data.errors || {},
          ...data,
        },
        { status: response.status }
      )
    }

    const nextRes = NextResponse.json(
      {
        status: "success",
        message: data.message || "Leave updated successfully",
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
    console.error("Leave update error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

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

    return NextResponse.json(
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
        nextRes.headers.append("Set-Cookie", cookie)
      })
    }

    return nextRes
  } catch (error: any) {
    console.error("Leave delete error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

