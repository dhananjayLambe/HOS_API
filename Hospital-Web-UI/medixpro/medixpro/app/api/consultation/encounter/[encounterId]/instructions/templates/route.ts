import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  try {
    const { encounterId } = await params;
    const authHeader =
      _request.headers.get("authorization") ||
      _request.headers.get("Authorization");

    const url = `${DJANGO_API_URL}/api/consultations/encounter/${encounterId}/instructions/templates/`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || data.message || "Failed to fetch templates" },
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
