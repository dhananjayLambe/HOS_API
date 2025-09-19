// app/api/login/route.ts
import { NextResponse } from "next/server";

const BASE_URL = process.env.DJANGO_API_URL || "http://localhost:8000/api/";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Request Body:", body);

    // Call Django backend API
    const res = await fetch(`http://localhost:8000/api/auth/send-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error("Error from Django API:", error);
      return NextResponse.json(
        { error: error.message || "Failed to send OTP" }, 
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}