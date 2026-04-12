import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getAuthHeader(request: NextRequest): string | undefined {
  return (
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    undefined
  );
}

function djangoProxyHeaders(request: NextRequest): HeadersInit {
  const auth = getAuthHeader(request);
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
    const url = `${DJANGO_API_URL}/api/consultations/encounter/${encounterId}/instructions/`;
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
        { detail: "Failed to fetch instructions" },
        { status: response.status }
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("[API] Instructions list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  try {
    const { encounterId } = await params;
    const body = await request.json();
    const url = `${DJANGO_API_URL}/api/consultations/encounter/${encounterId}/instructions/`;
    const response = await fetch(url, {
      method: "POST",
      headers: djangoProxyHeaders(request),
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data && typeof data === "object" && Object.keys(data as object).length > 0) {
        return NextResponse.json(data, { status: response.status });
      }
      return NextResponse.json(
        { detail: "Failed to add instruction" },
        { status: response.status }
      );
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    console.error("[API] Add instruction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
