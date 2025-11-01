// app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("Logout API called");
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

    if (!res.ok) throw new Error("Backend logout failed");

    // Return success (client will clear localStorage)
    return NextResponse.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}