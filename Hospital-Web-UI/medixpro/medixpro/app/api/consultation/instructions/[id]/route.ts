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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const url = `${DJANGO_API_URL}/api/consultations/instructions/${id}/`;
    const response = await fetch(url, {
      method: "PATCH",
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
        { error: data.detail || data.message || "Failed to update instruction" },
        { status: response.status }
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("[API] Update instruction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = `${DJANGO_API_URL}/api/consultations/instructions/${id}/`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        ...(getAuthHeader(_request) && {
          Authorization: getAuthHeader(_request)!,
        }),
      },
      credentials: "include",
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: data.detail || data.message || "Failed to delete instruction" },
      { status: response.status }
    );
  } catch (error: unknown) {
    console.error("[API] Delete instruction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
