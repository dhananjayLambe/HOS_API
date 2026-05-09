import { type NextRequest, NextResponse } from "next/server"

function labsOnboardingUrl(): string {
  const base = process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000/api/"
  return `${base.replace(/\/$/, "")}/labs/onboarding/`
}

function parseErrorMessage(errorMessage: string): string[] {
  const errors: string[] = []
  try {
    const errorMatches = errorMessage.matchAll(/ErrorDetail\(string='([^']+)'/g)
    for (const match of errorMatches) {
      if (match[1]) errors.push(match[1])
    }
    if (errors.length === 0) errors.push(errorMessage)
  } catch {
    errors.push(errorMessage)
  }
  return errors
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json()

    const labName =
      formData.lab_name ||
      [formData.organization_name, formData.display_name].filter(Boolean).join(" — ") ||
      formData.display_name ||
      ""

    const requestBody = {
      admin_details: {
        first_name: formData.first_name || "",
        last_name: formData.last_name || "",
        username: formData.mobile_or_username || "",
        email: formData.email || "",
        designation: formData.designation || "",
        whatsapp_same_as_mobile: Boolean(formData.whatsapp_same_as_mobile ?? true),
      },
      lab_details: {
        lab_name: labName,
        lab_type: formData.lab_type || "",
        license_number: formData.license_number || "",
        license_valid_till: formData.license_valid_till || "",
        certifications: formData.certifications || "",
        service_categories: Array.isArray(formData.service_categories) ? formData.service_categories : [],
        home_sample_collection: Boolean(formData.home_sample_collection),
        pricing_tier: (formData.pricing_tier || "medium").toLowerCase(),
        turnaround_time_hours: Number.parseInt(String(formData.turnaround_time_hours), 10) || 24,
        organization_name: formData.organization_name || "",
        display_name: formData.display_name || "",
        registration_number: formData.registration_number || "",
        walk_in_collection: Boolean(formData.walk_in_collection),
      },
      address_details: {
        address: formData.address_line1 || "",
        address2: formData.address_line2 || "",
        landmark: formData.landmark || "",
        city: formData.city || "",
        state: formData.state || "",
        pincode: formData.pincode || "",
        latitude: Number.parseFloat(String(formData.latitude)) || 0,
        longitude: Number.parseFloat(String(formData.longitude)) || 0,
      },
      kyc_details: {
        kyc_document_type: formData.kyc_document_type || "",
        kyc_document_number: formData.kyc_document_number || "",
        pan_number: formData.pan_number || "",
        gst_number: formData.gst_number || "",
        lab_license_file_name: formData.lab_license_file_name || "",
        nabl_certificate_file_name: formData.nabl_certificate_file_name || "",
        lab_license_file_base64: formData.lab_license_file_base64 || "",
        nabl_certificate_file_base64: formData.nabl_certificate_file_base64 || "",
      },
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const backendUrl = labsOnboardingUrl()

    let response: Response
    try {
      response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          { success: false, error: "Request timeout. Please try again.", errorType: "network" },
          { status: 408 },
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: "Registration service is unavailable. Try again later or contact support.",
          errorType: "network",
          details: fetchError instanceof Error ? fetchError.message : "Unknown",
        },
        { status: 503 },
      )
    }

    const contentType = response.headers.get("content-type")
    let responseData: any

    if (contentType && contentType.includes("application/json")) {
      try {
        responseData = await response.json()
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid response from server.",
            errorType: "server",
            errorDetails: ["Could not parse JSON from registration service"],
          },
          { status: 500 },
        )
      }
    } else {
      const textResponse = await response.text()
      const isHtml = textResponse.includes("<!DOCTYPE") || textResponse.includes("<html")
      const is404 = response.status === 404 || textResponse.includes("Page not found")
      const hint =
        isHtml && is404
          ? "The lab registration API was not found. Use Hospital-Management-API with POST /api/labs/onboarding/ (restart Django after pulling latest)."
          : "Unexpected response from registration service."
      return NextResponse.json(
        {
          success: false,
          error: hint,
          errorType: "server",
          errorDetails: isHtml ? [] : [textResponse.substring(0, 200)],
        },
        { status: response.status },
      )
    }

    if (!response.ok || responseData.error === true || responseData.success === false) {
      const fromErrors = responseData.errors
      const errorDetails = fromErrors
        ? [typeof fromErrors === "string" ? fromErrors : JSON.stringify(fromErrors)]
        : parseErrorMessage(responseData.error_message || "")
      return NextResponse.json(
        {
          success: false,
          error: responseData.message || "Failed to submit registration",
          errorDetails,
          errorType: "validation",
          rawError: responseData.error_message,
        },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: responseData.message || "Registration submitted successfully",
      data: responseData.data || responseData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred. Please try again later.",
        errorType: "server",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
