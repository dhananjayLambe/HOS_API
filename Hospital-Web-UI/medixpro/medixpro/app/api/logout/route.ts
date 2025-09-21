// app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log("Logout API called");
    const BASE_URL = process.env.DJANGO_API_URL || "http://localhost:8000/api/";
    // Call Django backend logout API
    const res = await fetch(`${BASE_URL}auth/logout/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error("Backend logout failed");

    // Clear cookies in Next.js
    const response = NextResponse.json({ message: "Logged out successfully" });
    response.cookies.set("access_token", "", { path: "/", expires: new Date(0) });
    response.cookies.set("refresh_token", "", { path: "/", expires: new Date(0) });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}