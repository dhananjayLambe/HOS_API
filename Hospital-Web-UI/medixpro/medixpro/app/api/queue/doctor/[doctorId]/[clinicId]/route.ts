import { type NextRequest, NextResponse } from "next/server";
import { getDjangoApiBase } from "@/lib/get-django-api-base";

function djangoDoctorQueueUrl(doctorId: string, clinicId: string): string {
  const base = getDjangoApiBase().replace(/\/+$/, "");
  return `${base}/queue/doctor/${doctorId}/${clinicId}/`;
}

// GET - Get today's queue for a doctor at a clinic
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ doctorId: string; clinicId: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const { doctorId, clinicId } = await context.params;

    if (!doctorId || !clinicId) {
      return NextResponse.json(
        { error: "doctor_id and clinic_id are required" },
        { status: 400 }
      );
    }

    const response = await fetch(djangoDoctorQueueUrl(doctorId, clinicId), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
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
          error:
            (data as { message?: string })?.message ??
            (data as { detail?: string })?.detail ??
            "Failed to fetch queue",
          detail: (data as { detail?: string })?.detail,
          ...(typeof data === "object" && data !== null ? data : {}),
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[API] Queue fetch error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
