import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function djangoProxyHeaders(request: NextRequest): HeadersInit {
  const auth =
    request.headers.get("authorization") || request.headers.get("Authorization");
  const cookie = request.headers.get("cookie");
  return {
    "Content-Type": "application/json",
    ...(auth && { Authorization: auth }),
    ...(cookie && { Cookie: cookie }),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  try {
    const { encounterId } = await params;

    const url = `${DJANGO_API_URL}/api/consultations/encounter/${encounterId}/instructions/templates/`;
    const response = await fetch(url, {
      method: "GET",
      headers: djangoProxyHeaders(_request),
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data && typeof data === "object" && Object.keys(data as object).length > 0) {
        return NextResponse.json(data, { status: response.status });
      }
      return NextResponse.json(
        { detail: "Failed to fetch templates" },
        { status: response.status }
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("[API] Instruction templates error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
