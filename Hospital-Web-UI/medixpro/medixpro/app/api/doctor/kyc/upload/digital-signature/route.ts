import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function PATCH(request: NextRequest) {
  console.log("[Next.js Route] PATCH /api/doctor/kyc/upload/digital-signature - Request received")
  
  try {
    const token = request.headers.get("Authorization")
    console.log("[Next.js Route] Authorization token present:", !!token)
    console.log("[Next.js Route] Token preview:", token ? `${token.substring(0, 20)}...` : "No token")
    
    // Check Content-Type header
    const contentType = request.headers.get("Content-Type")
    console.log("[Next.js Route] Content-Type:", contentType)
    
    // Parse FormData
    let formData: FormData
    try {
      formData = await request.formData()
      console.log("[Next.js Route] FormData parsed successfully")
      
      // Log FormData entries for debugging
      const entries: string[] = []
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          entries.push(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`)
        } else {
          entries.push(`${key}: ${value}`)
        }
      }
      console.log("[Next.js Route] FormData entries:", entries)
    } catch (formDataError: any) {
      console.error("[Next.js Route] Error parsing FormData:", formDataError)
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
      console.error("[Next.js Route] No digital_signature file in FormData")
      return NextResponse.json(
        { 
          message: "No file provided", 
          error: "digital_signature field is required"
        },
        { status: 400 }
      )
    }

    if (!(digitalSignatureFile instanceof File)) {
      console.error("[Next.js Route] digital_signature is not a File object")
      return NextResponse.json(
        { 
          message: "Invalid file", 
          error: "digital_signature must be a file"
        },
        { status: 400 }
      )
    }

    console.log("[Next.js Route] File details:", {
      name: digitalSignatureFile.name,
      size: digitalSignatureFile.size,
      type: digitalSignatureFile.type
    })

    const djangoUrl = `${DJANGO_API_URL}/api/doctor/kyc/upload/digital-signature/`
    console.log("[Next.js Route] Forwarding to Django:", djangoUrl)

    const response = await fetch(djangoUrl, {
      method: "PATCH",
      headers: {
        Authorization: token || "",
        // Don't set Content-Type - let fetch set it automatically with boundary for FormData
      },
      body: formData,
    })

    console.log("[Next.js Route] Django response status:", response.status)
    console.log("[Next.js Route] Django response headers:", Object.fromEntries(response.headers.entries()))

    let data
    const responseContentType = response.headers.get("content-type")
    console.log("[Next.js Route] Response Content-Type:", responseContentType)
    
    if (responseContentType && responseContentType.includes("application/json")) {
      data = await response.json()
      console.log("[Next.js Route] Django response data:", JSON.stringify(data, null, 2))
    } else {
      const text = await response.text()
      console.log("[Next.js Route] Django response text:", text)
      return NextResponse.json(
        { message: "Failed to upload digital signature", error: text },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      console.error("[Next.js Route] Django returned error:", data)
      return NextResponse.json(data, { status: response.status })
    }

    console.log("[Next.js Route] Success - returning data to frontend")
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[Next.js Route] Error in PATCH digital signature upload:", error)
    console.error("[Next.js Route] Error stack:", error.stack)
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


