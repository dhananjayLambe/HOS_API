import { type NextRequest, NextResponse } from "next/server";
import { getDjangoApiBase } from "@/lib/get-django-api-base";

function djangoAppointmentSlotsUrl(searchParams: URLSearchParams): string {
  const base = getDjangoApiBase().replace(/\/+$/, "");
  const qs = searchParams.toString();
  return `${base}/appointments/slots/${qs ? `?${qs}` : ""}`;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const { searchParams } = request.nextUrl;

    const response = await fetch(djangoAppointmentSlotsUrl(searchParams), {
      method: "GET",
      headers: {
        ...(authHeader && { Authorization: authHeader }),
      },
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid response from server", detail: response.statusText },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[API] appointments/slots GET proxy error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
