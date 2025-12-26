import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const formData = await request.formData()

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/kyc/upload/govt-id/`, {
      method: "PATCH",
      headers: {
        Authorization: token || "",
      },
      body: formData,
    })

    let data
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      return NextResponse.json(
        { message: "Failed to upload government ID files", error: text },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in PATCH government-id upload:", error)
    return NextResponse.json(
      { message: "Failed to upload government ID files", error: error.message },
      { status: 500 }
    )
  }
}

