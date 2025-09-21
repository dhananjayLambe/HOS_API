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
      credentials: "include", // 🔑 needed to receive/set cookies
      body: JSON.stringify(body),
    });

    const data = await res.json();

    // Create NextResponse and forward cookies
    const nextRes = NextResponse.json(data, { status: res.status });

    // Forward all Set-Cookie headers from Django
    const setCookies = res.headers.get("set-cookie");
    if (setCookies) {
      // Split multiple cookies if needed
      const cookies = setCookies.split(/,(?=[^ ]*?=)/);
      cookies.forEach(cookie => {
        nextRes.headers.append("Set-Cookie", cookie);
      });
    }

    return nextRes;
  } catch (err: any) {
    console.error("login proxy error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}