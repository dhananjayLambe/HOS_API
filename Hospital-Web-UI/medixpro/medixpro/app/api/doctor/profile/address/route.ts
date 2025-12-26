import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/address/`, {
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
    return NextResponse.json({ message: "Failed to update address" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/address/`, {
      method: "GET",
      headers: {
        Authorization: token || "",
      },
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
    return NextResponse.json({ message: "Failed to fetch address" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/address/`, {
      method: "PUT",
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
    return NextResponse.json({ message: "Failed to update address" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/address/`, {
      method: "PATCH",
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
    return NextResponse.json({ message: "Failed to update address" }, { status: 500 })
  }
}
