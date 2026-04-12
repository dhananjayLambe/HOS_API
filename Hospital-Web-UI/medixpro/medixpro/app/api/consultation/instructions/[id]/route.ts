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
        { detail: "Failed to update instruction" },
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
      headers: djangoProxyHeaders(_request),
      credentials: "include",
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const data = await response.json().catch(() => ({}));
    if (data && typeof data === "object" && Object.keys(data as object).length > 0) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(
      { detail: "Failed to delete instruction" },
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
