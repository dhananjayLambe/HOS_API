import { NextResponse } from "next/server";
import { readDjangoJson } from "@/lib/djangoBffBase";
import { getDjangoApiBase } from "@/lib/get-django-api-base";
import { serverLogger } from "@/lib/serverLogger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl = getDjangoApiBase();

    const res = await fetch(`${backendUrl}auth/verify-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const { status, data } = await readDjangoJson(res);
    return NextResponse.json(data, { status });
  } catch (error: any) {
    serverLogger.error("verify-otp proxy error", error, { route: "verify-otp" });
    return NextResponse.json(
      { error: "Failed to connect to backend. Please try again." },
      { status: 500 }
    );
  }
}