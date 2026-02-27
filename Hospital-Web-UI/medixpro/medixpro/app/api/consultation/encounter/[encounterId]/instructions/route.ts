import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeader(request: NextRequest): string | undefined {
  return (
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    undefined
  );
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
      headers: {
        "Content-Type": "application/json",
        ...(getAuthHeader(_request) && {
          Authorization: getAuthHeader(_request)!,
        }),
      },
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || data.message || "Failed to fetch instructions" },
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
      headers: {
        "Content-Type": "application/json",
        ...(getAuthHeader(request) && {
          Authorization: getAuthHeader(request)!,
        }),
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || data.input_data || data.message || "Failed to add instruction" },
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
