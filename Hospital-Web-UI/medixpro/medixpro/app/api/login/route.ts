// app/api/login/route.ts
import { NextResponse } from "next/server";
import { readDjangoJson } from "@/lib/djangoBffBase";
import { serverLogger } from "@/lib/serverLogger";

const BASE_URL = process.env.DJANGO_API_URL || "http://localhost:8000/api/";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(`${BASE_URL}auth/send-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const { status, data } = await readDjangoJson(res);
    return NextResponse.json(data, { status });
  } catch (err: any) {
    serverLogger.error("login proxy error", err, { route: "login" });
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}