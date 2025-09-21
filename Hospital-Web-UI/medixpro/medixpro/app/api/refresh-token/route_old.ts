import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  try {
    const backendRes = await fetch(`${process.env.BACKEND_URL}/auth/staff/refresh-token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: "no-store",
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    // ✅ Set new cookies
    const res = NextResponse.json(data, { status: 200 });

    res.cookies.set("access_token", data.tokens.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15, // 15 minutes
    });

    res.cookies.set("refresh_token", data.tokens.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    res.cookies.set("role", data.role, {
      httpOnly: false, // frontend can read this for UI purposes
      path: "/",
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Refresh failed" }, { status: 500 });
  }
}