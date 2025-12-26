import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/registration/`, {
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
        { message: "Failed to fetch registration", error: text },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in GET registration:", error)
    return NextResponse.json(
      { message: "Failed to fetch registration", error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/registration/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token || "",
      },
      body: JSON.stringify(body),
    })

    let data
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      return NextResponse.json(
        { message: "Failed to create registration", error: text },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in POST registration:", error)
    return NextResponse.json(
      { message: "Failed to create registration", error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/registration/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: token || "",
      },
      body: JSON.stringify(body),
    })

    let data
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      return NextResponse.json(
        { message: "Failed to update registration", error: text },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in PATCH registration:", error)
    return NextResponse.json(
      { message: "Failed to update registration", error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/registration/`, {
      method: "DELETE",
      headers: {
        Authorization: token || "",
      },
    })

    if (!response.ok) {
      let data
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        const text = await response.text()
        return NextResponse.json(
          { message: "Failed to delete registration", error: text },
          { status: response.status || 500 }
        )
      }
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json({ message: "Registration deleted successfully" })
  } catch (error: any) {
    console.error("Error in DELETE registration:", error)
    return NextResponse.json(
      { message: "Failed to delete registration", error: error.message },
      { status: 500 }
    )
  }
}

