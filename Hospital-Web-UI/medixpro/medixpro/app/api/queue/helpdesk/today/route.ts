import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const url = `${DJANGO_API_URL}queue/helpdesk/today/`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      credentials: "include",
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid response from server", detail: response.statusText },
        { status: response.status }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: (data as { message?: string; detail?: string })?.message ||
            (data as { detail?: string })?.detail ||
            "Failed to fetch helpdesk queue",
          ...(typeof data === "object" && data !== null ? (data as object) : {}),
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[API] Helpdesk queue fetch error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
