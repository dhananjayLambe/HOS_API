import { type NextRequest, NextResponse } from "next/server"
import { getDjangoApiBase } from "@/lib/get-django-api-base"

const DJANGO_API_URL = getDjangoApiBase()

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}doctor/doctor-fees/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token || "",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ message: "Failed to update fee structure" }, { status: 500 })
  }
}
