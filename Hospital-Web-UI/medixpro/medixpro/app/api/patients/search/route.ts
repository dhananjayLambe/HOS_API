import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

// GET - Search patients
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";

    if (!query.trim()) {
      return NextResponse.json([], { status: 200 });
    }

    const url = `${DJANGO_API_URL}patients/search/?query=${encodeURIComponent(query.trim())}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
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
          error: data.message || data.detail || "Failed to search patients",
          detail: data.detail || data.message,
          ...data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("[API] Patient search error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

