import { type NextRequest, NextResponse } from "next/server";
import { getDjangoApiBase } from "@/lib/get-django-api-base";

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error_code: "INVALID_PAYLOAD", message: "Invalid request payload" }, { status: 400 });
    }
    const queue = (body as { queue?: unknown }).queue;
    if (!Array.isArray(queue)) {
      return NextResponse.json({ error_code: "INVALID_PAYLOAD", message: "Queue must be an array" }, { status: 400 });
    }
    const malformed = queue.some((item) => {
      if (!item || typeof item !== "object") return true;
      const row = item as { id?: unknown; position?: unknown };
      return typeof row.id !== "string" || typeof row.position !== "number" || row.position < 1;
    });
    if (malformed) {
      return NextResponse.json(
        { error_code: "INVALID_PAYLOAD", message: "Each queue item must contain string id and positive numeric position" },
        { status: 400 }
      );
    }

    const base = getDjangoApiBase().replace(/\/+$/, "");
    const url = `${base}/queue/reorder/`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      credentials: "include",
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
