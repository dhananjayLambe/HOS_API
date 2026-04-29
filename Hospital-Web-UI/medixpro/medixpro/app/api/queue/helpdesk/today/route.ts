import { type NextRequest, NextResponse } from "next/server";
import { getDjangoApiBase } from "@/lib/get-django-api-base";

function djangoQueueUrl() {
  const base = getDjangoApiBase().replace(/\/+$/, "");
  return `${base}/queue/helpdesk/today/`;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const url = djangoQueueUrl();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      credentials: "include",
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

    if (!response.ok) {
      return NextResponse.json(
        {
          error: (data as { message?: string; detail?: string })?.message ||
            (data as { detail?: string })?.detail ||
            "Failed to fetch helpdesk queue",
          ...(typeof data === "object" && data !== null ? (data as object) : {}),
        },
        { status: response.status }
      );
    }

    const next = NextResponse.json(data, { status: response.status });
    const queueDay = response.headers.get("x-queue-calendar-date");
    if (queueDay) {
      next.headers.set("X-Queue-Calendar-Date", queueDay);
    }
    return next;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[API] Helpdesk queue fetch error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
