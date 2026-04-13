import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const CACHE_CONTROL_VALUE = "private, max-age=60, stale-while-revalidate=120";

export async function GET(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    const cookieHeader = request.headers.get("cookie");

    const search = request.nextUrl.search ?? "";
    const url = `${DJANGO_API_URL}/api/consultations/instructions/suggestions/${search}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || data.message || "Failed to fetch instruction suggestions" },
        {
          status: response.status,
          headers: {
            "Cache-Control": CACHE_CONTROL_VALUE,
          },
        }
      );
    }
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": CACHE_CONTROL_VALUE,
      },
    });
  } catch (error: unknown) {
    console.error("[API] Instruction suggestions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
