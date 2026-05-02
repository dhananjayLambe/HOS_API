import { type NextRequest, NextResponse } from "next/server";
import { getDjangoApiBase } from "@/lib/get-django-api-base";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    let body: Record<string, unknown> = {};
    try {
      const raw = await request.json();
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        body = raw as Record<string, unknown>;
      }
    } catch {
      body = {};
    }

    const base = getDjangoApiBase().replace(/\/+$/, "");
    const url = `${base}/appointments/${encodeURIComponent(id)}/cancel/`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
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
    console.error("[API] appointments/[id]/cancel PATCH proxy error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
