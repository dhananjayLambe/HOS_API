import { type NextRequest, NextResponse } from "next/server";
import { getDjangoApiBase } from "@/lib/get-django-api-base";

// POST - Create a new patient (Doctor EMR Flow)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const body = await request.json();

    // Validate required fields based on CreatePatientSerializer
    const hasDob = Boolean(body.date_of_birth);
    const hasAgeYears =
      body.age_years !== undefined &&
      body.age_years !== null &&
      String(body.age_years).trim() !== "";
    const hasAgeMonths =
      body.age_months !== undefined &&
      body.age_months !== null &&
      String(body.age_months).trim() !== "";

    const hasValidAge = hasAgeYears || hasAgeMonths;
    const missingAgeOrDob = !hasDob && !hasValidAge;
    const hasBothAgeAndDob = hasDob && hasValidAge;

    if (!body.mobile || !body.first_name || !body.gender || missingAgeOrDob || hasBothAgeAndDob) {
      return NextResponse.json(
        { 
          status: "error",
          message: "Missing required fields",
          errors: {
            mobile: body.mobile ? undefined : "Mobile is required",
            first_name: body.first_name ? undefined : "First name is required",
            gender: body.gender ? undefined : "Gender is required",
            ...(missingAgeOrDob ? { age_or_dob: "Enter Age or DOB" } : {}),
            ...(hasBothAgeAndDob ? { age_or_dob: "Provide either DOB or Age, not both" } : {}),
          }
        },
        { status: 400 }
      );
    }

    const url = `${getDjangoApiBase()}patients/create/`;

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
      // Extract error message following priority: detail > message > error > statusText
      let errorMessage = "Failed to create patient";
      
      if (data?.detail) {
        errorMessage = data.detail;
      } else if (data?.message) {
        errorMessage = data.message;
      } else if (data?.error) {
        errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else if (data?.non_field_errors && Array.isArray(data.non_field_errors)) {
        errorMessage = data.non_field_errors[0];
      } else if (response.statusText) {
        errorMessage = response.statusText;
      }
      
      // Extract field-specific errors if available
      const fieldErrors: Record<string, string[]> = {};
      if (data?.errors && typeof data.errors === 'object') {
        Object.keys(data.errors).forEach(key => {
          if (Array.isArray(data.errors[key])) {
            fieldErrors[key] = data.errors[key];
          } else if (data.errors[key]) {
            fieldErrors[key] = [String(data.errors[key])];
          }
        });
      }
      
      return NextResponse.json(
        {
          status: "error",
          message: errorMessage,
          detail: data?.detail,
          errors: Object.keys(fieldErrors).length > 0 ? fieldErrors : data?.errors || data,
          ...data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("[API] Patient creation error:", error);
    
    // Provide more detailed error information
    let errorMessage = "Internal server error";
    if (error.message) {
      errorMessage = error.message;
    } else if (error.toString && error.toString() !== "[object Object]") {
      errorMessage = error.toString();
    }
    
    return NextResponse.json(
      { 
        status: "error",
        message: errorMessage,
        detail: "An unexpected error occurred while creating the patient. Please try again."
      },
      { status: 500 }
    );
  }
}

