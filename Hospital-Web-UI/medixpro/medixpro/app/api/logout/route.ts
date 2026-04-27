// app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const refreshToken = body.refresh_token || body.refresh;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    const BASE_URL = process.env.DJANGO_API_URL || process.env.BACKEND_URL || "http://localhost:8000/api/";
    
    // Call Django backend logout API
    const res = await fetch(`${BASE_URL}auth/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const contentType = res.headers.get("content-type") || "";
    const responsePayload = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Backend logout failed",
          details:
            (responsePayload &&
              typeof responsePayload === "object" &&
              "error" in responsePayload &&
              (responsePayload as { error?: string }).error) ||
            undefined,
        },
        { status: res.status }
      );
    }

    // Return success (client will clear localStorage)
    if (responsePayload && typeof responsePayload === "object") {
      return NextResponse.json(responsePayload, { status: 200 });
    }
    return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}