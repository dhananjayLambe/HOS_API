// app/api/resend-otp/route.ts
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000/api/";

export async function POST(req: Request) {
  try {
    const body = await req.json(); // { phone_number, role }

    // Call Django backend API
    const res = await fetch(`${BACKEND_URL}auth/resend-otp/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Check if backend returned JSON
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      console.error("Backend returned non-JSON:", text);
      return NextResponse.json(
        { error: "Backend did not return JSON, check endpoint." },
        { status: 500 }
      );
    }

    const data = await res.json();

    // Return JSON as-is
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error("Resend OTP proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to backend. Please try again." },
      { status: 500 }
    );
  }
}