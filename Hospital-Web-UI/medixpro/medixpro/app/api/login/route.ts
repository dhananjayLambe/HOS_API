// app/api/login/route.ts
import { NextResponse } from "next/server";

const BASE_URL = process.env.DJANGO_API_URL || "http://localhost:8000/api/";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Request Body:", body);
    console.log("login API called");

    // Call Django backend API
    const res = await fetch(`${BASE_URL}auth/send-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    // Return response directly (no cookies needed)
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("login proxy error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}