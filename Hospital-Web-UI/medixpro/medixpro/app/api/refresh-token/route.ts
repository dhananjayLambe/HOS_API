import { NextResponse } from "next/server";

export async function POST() {
  try {
    const backendRes = await fetch(`${process.env.BACKEND_URL}/auth/staff/refresh-token/`, {
      method: "POST",
      credentials: "include", // 🔹 send cookies automatically
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    // No need to set cookies here (backend already did it)
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Refresh failed" }, { status: 500 });
  }
}