import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const formData = await request.formData()

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/kyc/`, {
      method: "POST",
      headers: {
        Authorization: token || "",
      },
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ message: "Failed to upload KYC document" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/kyc/`, {
      method: "GET",
      headers: {
        Authorization: token || "",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch KYC documents" }, { status: 500 })
  }
}
