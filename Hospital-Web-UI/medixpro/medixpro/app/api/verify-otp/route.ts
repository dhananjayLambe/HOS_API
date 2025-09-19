import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000/api/";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(`${BACKEND_URL}auth/verify-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await res.json();

    // Create NextResponse and forward cookies
    const nextRes = NextResponse.json(data, { status: res.status });

    // Forward all Set-Cookie headers from Django
    const setCookies = res.headers.get("set-cookie");
    if (setCookies) {
      // If multiple cookies, Django may separate by comma
      const cookies = setCookies.split(/,(?=[^ ]*?=)/); // split by comma only between cookies
      cookies.forEach(cookie => {
        nextRes.headers.append("Set-Cookie", cookie);
      });
    }

    return nextRes;
  } catch (error: any) {
    console.error("verify-otp proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to backend. Please try again." },
      { status: 500 }
    );
  }
}