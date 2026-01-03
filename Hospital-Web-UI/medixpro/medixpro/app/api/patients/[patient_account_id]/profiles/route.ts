import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

// GET - Get patient profiles by account ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patient_account_id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const { patient_account_id } = await params;

    if (!patient_account_id) {
      return NextResponse.json(
        { 
          status: "error",
          message: "Patient account ID is required"
        },
        { status: 400 }
      );
    }

    const url = `${DJANGO_API_URL}patients/${patient_account_id}/profiles/`;

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
        { 
          status: "error",
          message: "Invalid response from server", 
          detail: response.statusText 
        },
        { status: response.status }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          status: data.status || "error",
          message: data.message || data.detail || "Failed to fetch profiles",
          ...data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("[API] Get profiles error:", error);
    return NextResponse.json(
      { 
        status: "error",
        message: error.message || "Internal server error" 
      },
      { status: 500 }
    );
  }
}

// POST - Add family member profile
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patient_account_id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const body = await request.json();
    const { patient_account_id } = await params;

    if (!patient_account_id) {
      return NextResponse.json(
        { 
          status: "error",
          message: "Patient account ID is required"
        },
        { status: 400 }
      );
    }

    const url = `${DJANGO_API_URL}patients/${patient_account_id}/profiles/`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return NextResponse.json(
        { 
          status: "error",
          message: "Invalid response from server", 
          detail: response.statusText 
        },
        { status: response.status }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          status: data.status || "error",
          message: data.message || data.detail || "Failed to add family member",
          errors: data.errors || data,
          ...data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("[API] Add family member error:", error);
    return NextResponse.json(
      { 
        status: "error",
        message: error.message || "Internal server error" 
      },
      { status: 500 }
    );
  }
}

