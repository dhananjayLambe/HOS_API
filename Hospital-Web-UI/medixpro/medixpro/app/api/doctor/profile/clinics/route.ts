import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")

    // Use the doctor profile endpoint which includes clinic_association
    const response = await fetch(`${DJANGO_API_URL}/api/doctor/profile/`, {
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
          error: data.message || data.detail || "Failed to fetch clinics",
          ...data,
        },
        { status: response.status }
      )
    }

    // Extract clinic_association from the profile response
    const clinics = data?.doctor_profile?.clinic_association || data?.clinic_association || []

    const nextRes = NextResponse.json(
      {
        status: "success",
        message: "Clinics retrieved successfully",
        data: clinics,
      },
      { status: response.status }
    )
    const setCookies = response.headers.get("set-cookie")
    if (setCookies) {
      const cookies = setCookies.split(/,(?=[^ ]*?=)/)
      cookies.forEach((cookie) => {
        nextRes.headers.append("Set-Cookie", cookie)
      })
    }
    return nextRes
  } catch (error: any) {
    console.error("Clinics fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/clinics/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token || "",
      },
      body: JSON.stringify(body),
      credentials: "include",
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
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
  } catch (error) {
    return NextResponse.json({ message: "Failed to add clinic" }, { status: 500 })
  }
}
