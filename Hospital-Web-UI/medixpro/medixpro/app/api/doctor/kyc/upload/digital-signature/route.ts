import { type NextRequest, NextResponse } from "next/server"
import { serverLogger } from "@/lib/serverLogger"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const ROUTE = "doctor/kyc/upload/digital-signature"

export async function PATCH(request: NextRequest) {
  
  try {
    const token = request.headers.get("Authorization")
    
    // Check Content-Type header
    const contentType = request.headers.get("Content-Type")
    
    // Parse FormData
    let formData: FormData
    try {
      formData = await request.formData()
      
      // Log FormData entries for debugging
      const entries: string[] = []
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          entries.push(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`)
        } else {
          entries.push(`${key}: ${value}`)
        }
      }
    } catch (formDataError: any) {
      serverLogger.error("Error parsing FormData", formDataError, { route: ROUTE })
      return NextResponse.json(
        { 
          message: "Failed to parse FormData", 
          error: formDataError.message,
          details: "Request body is not valid FormData"
        },
        { status: 400 }
      )
    }

    // Check if digital_signature file is present
    const digitalSignatureFile = formData.get("digital_signature")
    if (!digitalSignatureFile) {
      serverLogger.error("No digital_signature file in FormData", undefined, { route: ROUTE })
      return NextResponse.json(
        { 
          message: "No file provided", 
          error: "digital_signature field is required"
        },
        { status: 400 }
      )
    }

    if (!(digitalSignatureFile instanceof File)) {
      serverLogger.error("digital_signature is not a File object", undefined, { route: ROUTE })
      return NextResponse.json(
        { 
          message: "Invalid file", 
          error: "digital_signature must be a file"
        },
        { status: 400 }
      )
    }

    const djangoUrl = `${DJANGO_API_URL}/api/doctor/kyc/upload/digital-signature/`

    const response = await fetch(djangoUrl, {
      method: "PATCH",
      headers: {
        Authorization: token || "",
        // Don't set Content-Type - let fetch set it automatically with boundary for FormData
      },
      body: formData,
    })

    let data
    const responseContentType = response.headers.get("content-type")
    
    if (responseContentType && responseContentType.includes("application/json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      return NextResponse.json(
        { message: "Failed to upload digital signature", error: text },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      serverLogger.error("Django returned error for digital signature upload", undefined, {
        route: ROUTE,
        status: response.status,
        detail: typeof data?.detail === "string" ? data.detail : typeof data?.message === "string" ? data.message : undefined,
      })
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    serverLogger.error("Error in PATCH digital signature upload", error, { route: ROUTE })
    return NextResponse.json(
      { 
        message: "Failed to upload digital signature", 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

