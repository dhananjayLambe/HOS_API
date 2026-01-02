import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/"

// GET - Retrieve task details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")

    const response = await fetch(`${DJANGO_API_URL}tasks/${taskId}/`, {
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
          error: data.message || data.detail || "Failed to fetch task",
          detail: data.detail || data.message,
          ...data,
        },
        { status: response.status }
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.error("Error fetching task:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Full update of task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const body = await request.json()

    console.log("[Next.js API] PUT /api/tasks/[id] - Request body:", JSON.stringify(body, null, 2))

    const response = await fetch(`${DJANGO_API_URL}tasks/${taskId}/`, {
      method: "PUT",
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

    if (!response.ok) {
      let errorMessage = data.message || data.detail || "Failed to update task"
      
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

      console.log("[Next.js API] PUT error response:", JSON.stringify(data, null, 2))

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
    console.error("[Next.js API] Task update error:", error)
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        details: error.stack,
      },
      { status: 500 }
    )
  }
}

// PATCH - Partial update of task (status/priority)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const body = await request.json()

    console.log("[Next.js API] PATCH /api/tasks/[id] - Request body:", JSON.stringify(body, null, 2))

    const response = await fetch(`${DJANGO_API_URL}tasks/${taskId}/`, {
      method: "PATCH",
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

    if (!response.ok) {
      let errorMessage = data.message || data.detail || "Failed to update task"
      
      if (data.errors && typeof data.errors === 'object') {
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
    console.error("[Next.js API] Task partial update error:", error)
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        details: error.stack,
      },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")

    const response = await fetch(`${DJANGO_API_URL}tasks/${taskId}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      credentials: "include",
    })

    // DELETE might not return JSON
    let data
    try {
      const text = await response.text()
      data = text ? JSON.parse(text) : {}
    } catch (e) {
      // If response is empty or not JSON, that's OK for DELETE
      if (response.ok) {
        return NextResponse.json(
          { success: true, message: "Task deleted successfully" },
          { status: response.status }
        )
      }
      return NextResponse.json(
        { error: "Invalid response from server", detail: response.statusText },
        { status: response.status }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || data.detail || "Failed to delete task",
          detail: data.detail || data.message,
          ...data,
        },
        { status: response.status }
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.error("[Next.js API] Task deletion error:", error)
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        details: error.stack,
      },
      { status: 500 }
    )
  }
}

