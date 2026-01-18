import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

// GET - Get today's queue for a doctor at a clinic
export async function GET(
  request: NextRequest,
  { params }: { params: { doctorId: string; clinicId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const { doctorId, clinicId } = params;

    if (!doctorId || !clinicId) {
      return NextResponse.json(
        { error: "doctor_id and clinic_id are required" },
        { status: 400 }
      );
    }

    const url = `${DJANGO_API_URL}queue/doctor/${doctorId}/${clinicId}/`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      credentials: "include",
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid response from server", detail: response.statusText },
        { status: response.status }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || data.detail || "Failed to fetch queue",
          detail: data.detail || data.message,
          ...data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("[API] Queue fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

