import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

// POST - Create/Register a new patient
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const body = await request.json();

    // Validate required fields
    if (!body.user_data || !body.profile_data) {
      return NextResponse.json(
        { error: "user_data and profile_data are required" },
        { status: 400 }
      );
    }

    const url = `${DJANGO_API_URL}admin/patient/registration/`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid response from server", detail: response.statusText },
        { status: response.status }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || data.detail || "Failed to create patient",
          detail: data.detail || data.message,
          errors: data.user_data || data.profile_data || data,
          ...data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("[API] Patient creation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

