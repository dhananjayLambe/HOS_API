import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

function djangoUrl(visitId: string) {
  const base = DJANGO_API_URL.replace(/\/+$/, "");
  return `${base}/visits/${visitId}/vitals/`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ visitId: string }> }
) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const { visitId } = await context.params;
  if (!visitId) {
    return NextResponse.json({ error: "visit_id required" }, { status: 400 });
  }
  const res = await fetch(djangoUrl(visitId), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader && { Authorization: authHeader }),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ visitId: string }> }
) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const { visitId } = await context.params;
  if (!visitId) {
    return NextResponse.json({ error: "visit_id required" }, { status: 400 });
  }
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const res = await fetch(djangoUrl(visitId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader && { Authorization: authHeader }),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data, { status: res.status });
}
