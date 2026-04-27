import { type NextRequest, NextResponse } from "next/server";
import { getDjangoApiBase } from "@/lib/get-django-api-base";

// GET - Search patients (BFF → Django; browser uses same-origin /api + JWT)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const limit = searchParams.get("limit") || "10";

    if (!query.trim()) {
      return NextResponse.json([], { status: 200 });
    }

    const djangoBase = getDjangoApiBase();
    const url = `${djangoBase}patients/search/?query=${encodeURIComponent(query.trim())}&limit=${encodeURIComponent(limit)}`;

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

