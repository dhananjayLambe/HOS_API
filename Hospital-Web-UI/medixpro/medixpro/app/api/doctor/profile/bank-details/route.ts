import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// GET - Retrieve bank details
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization") || request.headers.get("authorization")

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/bank-details/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      credentials: "include",
    })

    let data
    try {
      data = await response.json()
    } catch (e) {
      return NextResponse.json(
        { 
          status: "error",
          error: "Invalid response from server", 
          detail: response.statusText 
        },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          error: data.message || data.detail || data.error || "Failed to fetch bank details",
          ...data,
        },
        { status: response.status }
      )
    }

    // Backend returns: { status: "success", data: {...} }
    const bankDetails = data?.data || data

    // Ensure verification_status and rejection_reason are included, and ID is preserved
    const bankDetailsResponse = bankDetails ? {
      ...bankDetails,
      id: bankDetails.id || null, // Ensure ID is included
      verification_status: bankDetails.verification_status || "not_submitted",
      rejection_reason: bankDetails.rejection_reason || null,
      account_number_masked: bankDetails.account_number_masked || bankDetails.masked_account_number || null,
    } : null

    const nextRes = NextResponse.json(
      {
        status: "success",
        data: bankDetailsResponse,
      },
      { status: response.status }
    )
    
    const setCookies = response.headers.get("set-cookie")
    if (setCookies) {
      const cookies = setCookies.split(/,(?=[^ ]*?=)/)
      cookies.forEach((cookie) => {
        nextRes.headers.append("Set-Cookie", cookie)
      })
    }
    return nextRes
  } catch (error: any) {
    console.error("Bank details fetch error:", error)
    return NextResponse.json(
      { 
        status: "error",
        error: error.message || "Internal server error" 
      },
      { status: 500 }
    )
  }
}

// POST - Create bank details
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization") || request.headers.get("authorization")
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/bank-details/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify(body),
      credentials: "include",
    })

    let data
    try {
      data = await response.json()
    } catch (e) {
      return NextResponse.json(
        { 
          status: "error",
          error: "Invalid response from server", 
          detail: response.statusText 
        },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          error: data.message || data.detail || data.error || "Failed to create bank details",
          errors: data.errors || data,
          ...data,
        },
        { status: response.status }
      )
    }

    // Backend returns: { status: "success", message: "...", data: {...} }
    const nextRes = NextResponse.json(data, { status: response.status })
    const setCookies = response.headers.get("set-cookie")
    if (setCookies) {
      const cookies = setCookies.split(/,(?=[^ ]*?=)/)
      cookies.forEach((cookie) => {
        nextRes.headers.append("Set-Cookie", cookie)
      })
    }
    return nextRes
  } catch (error: any) {
    console.error("Bank details create error:", error)
    return NextResponse.json(
      { 
        status: "error",
        error: error.message || "Internal server error" 
      },
      { status: 500 }
    )
  }
}

// PATCH - Update bank details
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization") || request.headers.get("authorization")
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    // Always fetch current bank details to get the ID (backend retrieve doesn't need ID in URL)
    // Don't rely on query parameter - always fetch fresh from backend
    let bankDetailsId: string | null = null

    // Fetch current bank details to get the ID
    const getResponse = await fetch(`${DJANGO_API_URL}/api/doctor/bank-details/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      credentials: "include",
    })

    if (!getResponse.ok) {
      // If bank details don't exist, return error
      let getData
      try {
        getData = await getResponse.json()
      } catch (e) {
        getData = {}
      }
      
      console.error("[PATCH] Failed to fetch bank details:", getResponse.status, getData)
      return NextResponse.json(
        {
          status: "error",
          error: getData.message || getData.detail || getData.error || "Bank details not found. Please create bank details first.",
        },
        { status: getResponse.status || 404 }
      )
    }

    const getData = await getResponse.json()
    console.log("[PATCH] Bank details GET response:", JSON.stringify(getData, null, 2))
    
    // Extract ID from response - backend returns { status: "success", data: { id: "...", ... } }
    // The ID should be in getData.data.id
    const responseData = getData?.data || getData
    bankDetailsId = responseData?.id || null
    
    // Convert to string if it exists (handles UUID strings and numbers)
    if (bankDetailsId) {
      bankDetailsId = String(bankDetailsId).trim()
      // Remove any quotes or extra characters
      bankDetailsId = bankDetailsId.replace(/^["']|["']$/g, '')
    }

    if (!bankDetailsId) {
      console.error("[PATCH] Bank details ID not found in response:", JSON.stringify(getData, null, 2))
      console.error("[PATCH] Response data structure:", {
        hasData: !!getData?.data,
        dataKeys: getData?.data ? Object.keys(getData.data) : [],
        hasId: !!getData?.id,
        fullResponse: getData
      })
      return NextResponse.json(
        {
          status: "error",
          error: "Bank details ID not found. Please create bank details first.",
          debug: { 
            responseData: getData,
            extractedId: bankDetailsId,
            responseStructure: {
              hasData: !!getData?.data,
              dataKeys: getData?.data ? Object.keys(getData.data) : [],
            }
          },
        },
        { status: 404 }
      )
    }

    console.log(`[PATCH] Updating bank details with ID: ${bankDetailsId} (type: ${typeof bankDetailsId})`)
    const updateUrl = `${DJANGO_API_URL}/api/doctor/bank-details/${bankDetailsId}/`
    console.log(`[PATCH] Update URL: ${updateUrl}`)
    
    const response = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify(body),
      credentials: "include",
    })

    let data
    try {
      data = await response.json()
    } catch (e) {
      return NextResponse.json(
        { 
          status: "error",
          error: "Invalid response from server", 
          detail: response.statusText 
        },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      console.error(`[PATCH] Update failed with status ${response.status}:`, JSON.stringify(data, null, 2))
      return NextResponse.json(
        {
          status: "error",
          error: data.message || data.detail || data.error || "Failed to update bank details",
          errors: data.errors || data,
          ...data,
        },
        { status: response.status }
      )
    }
    
    console.log(`[PATCH] Update successful:`, JSON.stringify(data, null, 2))

    // Backend returns: { status: "success", message: "...", data: {...} }
    const nextRes = NextResponse.json(data, { status: response.status })
    const setCookies = response.headers.get("set-cookie")
    if (setCookies) {
      const cookies = setCookies.split(/,(?=[^ ]*?=)/)
      cookies.forEach((cookie) => {
        nextRes.headers.append("Set-Cookie", cookie)
      })
    }
    return nextRes
  } catch (error: any) {
    console.error("Bank details update error:", error)
    return NextResponse.json(
      { 
        status: "error",
        error: error.message || "Internal server error" 
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete bank details
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization") || request.headers.get("authorization")
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    // Always fetch current bank details to get the ID (backend retrieve doesn't need ID in URL)
    let bankDetailsId = id

    // Fetch current bank details to get the ID
    const getResponse = await fetch(`${DJANGO_API_URL}/api/doctor/bank-details/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      credentials: "include",
    })

    if (!getResponse.ok) {
      // If bank details don't exist, return error
      let getData
      try {
        getData = await getResponse.json()
      } catch (e) {
        getData = {}
      }
      
      return NextResponse.json(
        {
          status: "error",
          error: getData.message || getData.detail || getData.error || "Bank details not found.",
        },
        { status: getResponse.status || 404 }
      )
    }

    const getData = await getResponse.json()
    console.log("[DELETE] Bank details GET response:", JSON.stringify(getData, null, 2))
    
    // Extract ID from response - backend returns { status: "success", data: { id: "...", ... } }
    const responseData = getData?.data || getData
    bankDetailsId = responseData?.id || id

    // Convert to string if it exists (handles UUID strings and numbers)
    if (bankDetailsId) {
      bankDetailsId = String(bankDetailsId).trim()
      bankDetailsId = bankDetailsId.replace(/^["']|["']$/g, '')
    }

    if (!bankDetailsId) {
      console.error("[DELETE] Bank details ID not found in response:", JSON.stringify(getData, null, 2))
      return NextResponse.json(
        {
          status: "error",
          error: "Bank details ID not found.",
          debug: { responseData: getData },
        },
        { status: 404 }
      )
    }

    console.log(`[DELETE] Deleting bank details with ID: ${bankDetailsId}`)
    const deleteUrl = `${DJANGO_API_URL}/api/doctor/bank-details/${bankDetailsId}/`
    console.log(`[DELETE] Delete URL: ${deleteUrl}`)

    const response = await fetch(`${DJANGO_API_URL}/api/doctor/bank-details/${bankDetailsId}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
      },
      credentials: "include",
    })

    if (!response.ok) {
      let data
      try {
        data = await response.json()
      } catch (e) {
        return NextResponse.json(
          { 
            status: "error",
            error: "Failed to delete bank details",
            detail: response.statusText 
          },
          { status: response.status || 500 }
        )
      }

      return NextResponse.json(
        {
          status: "error",
          error: data.message || data.detail || data.error || "Failed to delete bank details",
          ...data,
        },
        { status: response.status }
      )
    }

    // Backend returns: { status: "success", message: "..." }
    let data
    try {
      data = await response.json()
    } catch (e) {
      // If no JSON response, return success
      data = { status: "success", message: "Bank details deleted successfully" }
    }

    const nextRes = NextResponse.json(data, { status: response.status || 200 })
    const setCookies = response.headers.get("set-cookie")
    if (setCookies) {
      const cookies = setCookies.split(/,(?=[^ ]*?=)/)
      cookies.forEach((cookie) => {
        nextRes.headers.append("Set-Cookie", cookie)
      })
    }
    return nextRes
  } catch (error: any) {
    console.error("Bank details delete error:", error)
    return NextResponse.json(
      { 
        status: "error",
        error: error.message || "Internal server error" 
      },
      { status: 500 }
    )
  }
}
