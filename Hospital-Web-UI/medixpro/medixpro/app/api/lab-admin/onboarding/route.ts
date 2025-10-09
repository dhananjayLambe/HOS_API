import { type NextRequest, NextResponse } from "next/server"

// Backend API endpoint
const BACKEND_API_URL = "http://127.0.0.1:8000/api/diagnostic/lab-onboard/"

function parseErrorMessage(errorMessage: string): string[] {
  const errors: string[] = []

  try {
    // Try to extract error details from the error_message string
    // The error_message is a string representation of a Python dict
    const errorMatches = errorMessage.matchAll(/ErrorDetail\(string='([^']+)'/g)

    for (const match of errorMatches) {
      if (match[1]) {
        errors.push(match[1])
      }
    }

    // If no specific errors found, return the original message
    if (errors.length === 0) {
      errors.push(errorMessage)
    }
  } catch (e) {
    errors.push(errorMessage)
  }

  return errors
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ========== API ROUTE CALLED ==========")
    console.log("[v0] Timestamp:", new Date().toISOString())

    // Parse the incoming request body
    const formData = await request.json()
    console.log("[v0] Received form data from client:", formData)

    // Transform the data to match backend API format
    const requestBody = {
      admin_details: {
        first_name: formData.first_name || "",
        last_name: formData.last_name || "",
        username: formData.mobile_or_username || "",
        email: formData.email || "",
        designation: formData.designation || "",
      },
      lab_details: {
        lab_name: formData.lab_name || "",
        lab_type: formData.lab_type || "",
        license_number: formData.license_number || "",
        license_valid_till: formData.license_valid_till || "",
        certifications: formData.certifications || "",
        service_categories: formData.service_categories || [],
        home_sample_collection: formData.home_sample_collection || false,
        pricing_tier: formData.pricing_tier?.toLowerCase() || "medium",
        turnaround_time_hours: Number.parseInt(formData.turnaround_time_hours) || 24,
      },
      address_details: {
        address: formData.address_line1 || "",
        address2: formData.address_line2 || "",
        city: formData.city || "",
        state: formData.state || "",
        pincode: formData.pincode || "",
        latitude: Number.parseFloat(formData.latitude) || 0,
        longitude: Number.parseFloat(formData.longitude) || 0,
      },
      kyc_details: {
        kyc_document_type: formData.kyc_document_type || "",
        kyc_document_number: formData.kyc_document_number || "",
      },
    }

    console.log("[v0] ========== CALLING BACKEND API ==========")
    console.log("[v0] Backend URL:", BACKEND_API_URL)
    console.log("[v0] Request body:", JSON.stringify(requestBody, null, 2))

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    let response: Response
    try {
      response = await fetch(BACKEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          return NextResponse.json(
            {
              success: false,
              error: "Request timeout. Please check your connection and try again.",
              errorType: "network",
            },
            { status: 408 },
          )
        }

        return NextResponse.json(
          {
            success: false,
            error: "Network error. Please check if the backend server is running.",
            errorType: "network",
            details: fetchError.message,
          },
          { status: 503 },
        )
      }

      throw fetchError
    }

    console.log("[v0] Backend response status:", response.status)
    console.log("[v0] Backend response content-type:", response.headers.get("content-type"))

    const contentType = response.headers.get("content-type")
    let responseData: any

    if (contentType && contentType.includes("application/json")) {
      try {
        responseData = await response.json()
        console.log("[v0] ========== BACKEND RESPONSE (JSON) ==========")
        console.log("[v0] Response data:", JSON.stringify(responseData, null, 2))
      } catch (jsonError) {
        console.error("[v0] ========== JSON PARSE ERROR ==========")
        console.error("[v0] Failed to parse JSON response:", jsonError)
        const textResponse = await response.text()
        console.log("[v0] Raw response text:", textResponse)

        return NextResponse.json(
          {
            success: false,
            error: "Invalid response from server. Please try again later.",
            errorType: "server",
            errorDetails: [`Server returned invalid JSON: ${textResponse.substring(0, 100)}`],
          },
          { status: 500 },
        )
      }
    } else {
      // Response is not JSON, read as text
      const textResponse = await response.text()
      console.log("[v0] ========== BACKEND RESPONSE (NON-JSON) ==========")
      console.log("[v0] Content-Type:", contentType)
      console.log("[v0] Response text:", textResponse)

      return NextResponse.json(
        {
          success: false,
          error: "Server returned an unexpected response format.",
          errorType: "server",
          errorDetails: [textResponse.substring(0, 200)],
        },
        { status: response.status },
      )
    }

    if (!response.ok || responseData.error === true) {
      console.log("[v0] ========== BACKEND RETURNED ERROR ==========")
      const errorDetails = parseErrorMessage(responseData.error_message || "")
      console.log("[v0] Parsed error details:", errorDetails)

      const errorResponse = {
        success: false,
        error: responseData.message || "Failed to submit onboarding request",
        errorDetails: errorDetails,
        errorType: "validation",
        rawError: responseData.error_message,
      }

      console.log("[v0] Returning error response:", JSON.stringify(errorResponse, null, 2))

      return NextResponse.json(errorResponse, { status: response.status })
    }

    // Return success response
    console.log("[v0] ========== SUCCESS ==========")
    console.log("[v0] Returning success response to client")
    return NextResponse.json({
      success: true,
      message: responseData.message || "Onboarding request submitted successfully",
      data: responseData.data || responseData,
    })
  } catch (error) {
    console.error("[v0] ========== UNEXPECTED ERROR ==========")
    console.error("[v0] Error in onboarding API route:", error)

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
