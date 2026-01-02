import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/**
 * GET /api/doctor/leaves
 * Fetches list of doctor leaves
 * Backend: GET /api/doctor/doctor-leave-list/
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get("doctor_id")
    const clinicId = searchParams.get("clinic_id")

    if (!doctorId) {
      return NextResponse.json(
        { error: "doctor_id is required" },
        { status: 400 }
      )
    }

    const params = new URLSearchParams({
      doctor_id: doctorId,
    })
    
    // Add clinic filter only if provided
    if (clinicId) {
      params.append("clinic", clinicId)
    }

    const response = await fetch(
      `${DJANGO_API_URL}/api/doctor/doctor-leave-list/?${params.toString()}`,
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
          error: data.message || data.detail || "Failed to fetch leaves",
          ...data,
        },
        { status: response.status }
      )
    }

    const nextRes = NextResponse.json(
      {
        status: "success",
        message: "Leaves retrieved successfully",
        data: Array.isArray(data) ? data : data.results || [],
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
    console.error("Leaves fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/doctor/leaves
 * Creates a new doctor leave
 * Backend: POST /api/doctor/doctor-leave-create/
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()

    if (!body.clinic) {
      return NextResponse.json(
        { error: "clinic is required" },
        { status: 400 }
      )
    }

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/doctor-leave-create/`, {
      method: "POST",
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
          error: data.message || data.detail || "Failed to create leave",
          errors: data.errors || {},
          ...data,
        },
        { status: response.status }
      )
    }

    const nextRes = NextResponse.json(
      {
        status: "success",
        message: data.message || "Leave created successfully",
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
    console.error("Leave create error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

