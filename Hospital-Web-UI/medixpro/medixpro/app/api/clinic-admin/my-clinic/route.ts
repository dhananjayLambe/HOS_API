import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND_URL = process.env.BACKEND_URL || process.env.DJANGO_API_URL || "http://localhost:8000/api/"

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = request.headers.get("authorization")
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }
    if (authHeader) {
      headers["Authorization"] = authHeader
    }

    // Get clinic_id from ClinicAdminProfile via backend endpoint
    const response = await fetch(`${BACKEND_URL}clinic/clinic-admin/my-clinic/`, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || "Clinic not found for current user",
          message: errorData.message || "Unable to find clinic associated with your account",
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Return the clinic_id in a consistent format
    return NextResponse.json({
      success: data.success !== false,
      clinic_id: data.clinic_id || data.data?.clinic_id || data.clinic?.id,
      clinic: data.clinic || data.data?.clinic,
    }, { status: 200 })
  } catch (error: any) {
    console.error("[Clinic Admin API] Error fetching clinic:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch clinic information",
        message: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

