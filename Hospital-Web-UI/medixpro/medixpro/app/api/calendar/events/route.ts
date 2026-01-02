import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/"

// GET - List calendar events with filtering
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const { searchParams } = new URL(request.url)

    // Build query string from search params
    const queryParams = new URLSearchParams()
    searchParams.forEach((value, key) => {
      queryParams.append(key, value)
    })

    const queryString = queryParams.toString()
    const url = `${DJANGO_API_URL}calendar/events/${queryString ? `?${queryString}` : ""}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
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
          error: data.message || data.detail || "Failed to fetch calendar events",
          detail: data.detail || data.message,
          ...data,
        },
        { status: response.status }
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.error("Error fetching calendar events:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const body = await request.json()

    console.log("[Next.js API] POST /api/calendar/events - Request body:", JSON.stringify(body, null, 2))

    const response = await fetch(`${DJANGO_API_URL}calendar/events/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
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

    console.log("[Next.js API] POST response status:", response.status)
    console.log("[Next.js API] POST response data:", JSON.stringify(data, null, 2))

    if (!response.ok) {
      // Extract error message from backend response
      let errorMessage = data.message || data.detail || "Failed to create calendar event"
      
      // Handle validation errors
      if (data.data && typeof data.data === 'object') {
        const validationErrors = Object.entries(data.data)
          .map(([key, value]: [string, any]) => {
            if (Array.isArray(value)) {
              return `${key}: ${value.join(', ')}`
            }
            return `${key}: ${value}`
          })
          .join('; ')
        if (validationErrors) {
          errorMessage = validationErrors
        }
      } else if (data.errors && typeof data.errors === 'object') {
        const validationErrors = Object.entries(data.errors)
          .map(([key, value]: [string, any]) => {
            if (Array.isArray(value)) {
              return `${key}: ${value.join(', ')}`
            }
            return `${key}: ${value}`
          })
          .join('; ')
        if (validationErrors) {
          errorMessage = validationErrors
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          errors: data.errors || data.data,
          status: response.status,
        },
        { status: response.status }
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.error("[Next.js API] Calendar event creation error:", error)
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        details: error.stack,
      },
      { status: 500 }
    )
  }
}

