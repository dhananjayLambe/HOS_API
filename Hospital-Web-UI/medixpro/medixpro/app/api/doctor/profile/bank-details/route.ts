import { type NextRequest, NextResponse } from "next/server"
import { serverLogger } from "@/lib/serverLogger"
import { getDjangoApiBase } from "@/lib/get-django-api-base"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DJANGO_API_URL = getDjangoApiBase()
const ROUTE = "doctor/profile/bank-details"

// GET - Retrieve bank details
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization") || request.headers.get("authorization")

    const response = await fetch(`${DJANGO_API_URL}doctor/bank-details/`, {
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
    serverLogger.error("Bank details fetch error", error, { route: ROUTE })
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

    const response = await fetch(`${DJANGO_API_URL}doctor/bank-details/`, {
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
    serverLogger.error("Bank details create error", error, { route: ROUTE })
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
    const getResponse = await fetch(`${DJANGO_API_URL}doctor/bank-details/`, {
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
      
      serverLogger.error("[PATCH] Failed to fetch bank details", undefined, {
        route: ROUTE,
        status: getResponse.status,
        detail: typeof getData?.detail === "string" ? getData.detail : typeof getData?.message === "string" ? getData.message : undefined,
      })
      return NextResponse.json(
        {
          status: "error",
          error: getData.message || getData.detail || getData.error || "Bank details not found. Please create bank details first.",
        },
        { status: getResponse.status || 404 }
      )
    }

    const getData = await getResponse.json()
    
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
      serverLogger.error("[PATCH] Bank details ID not found in response", undefined, {
        route: ROUTE,
        hasData: !!getData?.data,
        dataKeyCount: getData?.data ? Object.keys(getData.data).length : 0,
        hasTopLevelId: !!getData?.id,
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

    const updateUrl = `${DJANGO_API_URL}doctor/bank-details/${bankDetailsId}/`
    
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
      serverLogger.error("[PATCH] Bank details update failed", undefined, {
        route: ROUTE,
        status: response.status,
        detail: typeof data?.detail === "string" ? data.detail : typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : undefined,
      })
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
    serverLogger.error("Bank details update error", error, { route: ROUTE })
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
    const getResponse = await fetch(`${DJANGO_API_URL}doctor/bank-details/`, {
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
    
    // Extract ID from response - backend returns { status: "success", data: { id: "...", ... } }
    const responseData = getData?.data || getData
    bankDetailsId = responseData?.id || id

    // Convert to string if it exists (handles UUID strings and numbers)
    if (bankDetailsId) {
      bankDetailsId = String(bankDetailsId).trim()
      bankDetailsId = bankDetailsId.replace(/^["']|["']$/g, '')
    }

    if (!bankDetailsId) {
      serverLogger.error("[DELETE] Bank details ID not found in response", undefined, {
        route: ROUTE,
        hasData: !!getData?.data,
        hasTopLevelId: !!getData?.id,
      })
      return NextResponse.json(
        {
          status: "error",
          error: "Bank details ID not found.",
          debug: { responseData: getData },
        },
        { status: 404 }
      )
    }

    const deleteUrl = `${DJANGO_API_URL}doctor/bank-details/${bankDetailsId}/`

    const response = await fetch(`${DJANGO_API_URL}doctor/bank-details/${bankDetailsId}/`, {
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
    serverLogger.error("Bank details delete error", error, { route: ROUTE })
    return NextResponse.json(
      { 
        status: "error",
        error: error.message || "Internal server error" 
      },
      { status: 500 }
    )
  }
}
