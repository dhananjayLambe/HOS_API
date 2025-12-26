import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")
    
    // Check if Content-Type is correct for FormData
    const contentType = request.headers.get("Content-Type")
    if (!contentType || (!contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded"))) {
      // Try to get the body as FormData anyway, but log a warning
      console.warn("Content-Type mismatch, attempting to parse FormData:", contentType)
    }
    
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      // If formData parsing fails, try to get the raw body and construct FormData
      console.error("Failed to parse FormData:", error)
      const blob = await request.blob()
      formData = new FormData()
      
      // Try to extract the file from the blob
      // This is a fallback - ideally the request should come with proper FormData
      const fileBlob = new Blob([blob], { type: blob.type })
      const file = new File([fileBlob], "photo.jpg", { type: blob.type || "image/jpeg" })
      formData.append("photo", file)
    }

    // Django endpoint expects PATCH method and is at /api/doctor/upload-photo/
    const response = await fetch(`${DJANGO_API_URL}/api/doctor/upload-photo/`, {
      method: "PATCH",
      headers: {
        Authorization: token || "",
        // Don't set Content-Type header for FormData - let fetch set it with boundary
      },
      body: formData,
    })

    // Check if response is JSON before parsing
    const contentTypeHeader = response.headers.get("Content-Type")
    let data
    if (contentTypeHeader?.includes("application/json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      try {
        data = JSON.parse(text)
      } catch {
        data = { message: text || "Upload failed" }
      }
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Photo upload error:", error)
    return NextResponse.json(
      { 
        message: error.message || "Failed to upload photo",
        error: "Internal server error"
      }, 
      { status: 500 }
    )
  }
}
