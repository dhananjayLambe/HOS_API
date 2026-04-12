import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// GET - Proxy to Django consultation render-schema API
export async function GET(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get("specialty") || "";
    const section = searchParams.get("section") || "";

    const url = new URL(
      "/api/consultation/render-schema/",
      DJANGO_API_URL,
    );
    if (specialty) url.searchParams.set("specialty", specialty);
    if (section) url.searchParams.set("section", section);

    const response = await fetch(url.toString(), {
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
        { status: response.status },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.message ||
            data.detail ||
            "Failed to fetch consultation schema",
          detail: data.detail || data.message,
          ...data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("[API] Consultation render-schema error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

