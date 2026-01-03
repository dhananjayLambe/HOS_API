import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

// POST - Check if patient exists by mobile number
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const body = await request.json();

    // Validate required fields
    if (!body.mobile) {
      return NextResponse.json(
        { 
          status: "error",
          message: "Mobile number is required"
        },
        { status: 400 }
      );
    }

    const url = `${DJANGO_API_URL}patients/check-mobile/`;

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
          message: data.message || data.detail || "Failed to check patient",
          errors: data.errors || data,
          ...data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("[API] Check mobile error:", error);
    return NextResponse.json(
      { 
        status: "error",
        message: error.message || "Internal server error" 
      },
      { status: 500 }
    );
  }
}

