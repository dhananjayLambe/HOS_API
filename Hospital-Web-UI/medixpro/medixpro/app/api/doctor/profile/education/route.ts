import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/education/`, {
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
    return NextResponse.json({ message: "Failed to add education" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/education/`, {
      method: "GET",
      headers: {
        Authorization: token || "",
      },
    })

    let data
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      return NextResponse.json(
        { message: "Failed to fetch education", error: text },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch education" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/education/${id}/`, {
      method: "PATCH",
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
    return NextResponse.json({ message: "Failed to update education" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/education/${id}/`, {
      method: "DELETE",
      headers: {
        Authorization: token || "",
      },
    })

    if (!response.ok) {
      const data = await response.json()
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json({ message: "Education deleted successfully" })
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete education" }, { status: 500 })
  }
}
