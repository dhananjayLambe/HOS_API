import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND_URL = process.env.BACKEND_URL || process.env.DJANGO_API_URL || "http://localhost:8000/api/"

// Helper to get headers with auth
function getHeaders(authHeader: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (authHeader) {
    headers["Authorization"] = authHeader
  }
  return headers
}

// Helper to extract error message from backend response
function extractErrorMessage(errorData: any, defaultMessage: string = "An error occurred"): string {
  if (!errorData || typeof errorData !== 'object') {
    return defaultMessage
  }

  if (errorData.detail) {
    return errorData.detail
  }
  if (errorData.message) {
    return errorData.message
  }
  if (errorData.error) {
    return typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error)
  }
  if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
    return errorData.non_field_errors[0]
  }
  if (typeof errorData === 'string') {
    return errorData
  }
  
  // Get first error from validation errors
  if (Object.keys(errorData).length > 0) {
    const firstKey = Object.keys(errorData)[0]
    const firstError = errorData[firstKey]
    if (Array.isArray(firstError)) {
      return `${firstKey}: ${firstError[0]}`
    }
    return `${firstKey}: ${firstError}`
  }

  return defaultMessage
}

// Helper to extract validation errors
function extractValidationErrors(errorData: any): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  
  if (!errorData || typeof errorData !== 'object') {
    return errors
  }

  Object.keys(errorData).forEach(key => {
    const value = errorData[key]
    if (Array.isArray(value)) {
      errors[key] = value
    } else if (typeof value === 'string') {
      errors[key] = [value]
    } else if (value && typeof value === 'object') {
      errors[key] = [JSON.stringify(value)]
    }
  })

  return errors
}

// Get clinic ID from backend
async function getClinicId(authHeader: string | null): Promise<string | null> {
  try {
    const headers = getHeaders(authHeader)
    const response = await fetch(`${BACKEND_URL}clinic/clinic-admin/my-clinic/`, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.clinic_id || data.data?.clinic_id || data.clinic?.id || null
  } catch (error) {
    console.error("[Clinic Preferences API] Error fetching clinic ID:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = request.headers.get("authorization")
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header is required" },
        { status: 401 }
      )
    }

    // Get clinic ID
    const clinicId = await getClinicId(authHeader)
    if (!clinicId) {
      return NextResponse.json(
        { error: "Clinic not found for current user" },
        { status: 404 }
      )
    }

    const headers = getHeaders(authHeader)

    // Fetch preferences from backend
    const response = await fetch(`${BACKEND_URL}clinic/clinics/${clinicId}/preferences/`, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    if (response.status === 404) {
      // No preferences exist yet, return empty object
      return NextResponse.json({
        success: true,
        data: {},
      }, { status: 200 })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        {
          success: false,
          error: extractErrorMessage(errorData, "Failed to fetch clinic preferences"),
          message: extractErrorMessage(errorData, "Failed to fetch clinic preferences"),
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Handle different response structures
    const preferences = data.data || data.preferences || data || {}

    return NextResponse.json({
      success: true,
      data: preferences,
    }, { status: 200 })
  } catch (error: any) {
    console.error("[Clinic Preferences API] Error fetching preferences:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch clinic preferences",
        message: error.message || "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = request.headers.get("authorization")
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header is required" },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Get clinic ID
    const clinicId = await getClinicId(authHeader)
    if (!clinicId) {
      return NextResponse.json(
        { error: "Clinic not found for current user" },
        { status: 404 }
      )
    }

    const headers = getHeaders(authHeader)

    // Validate request body structure
    const validSections = ['appointment', 'language', 'privacy', 'system']
    const providedSections = Object.keys(body)
    const invalidSections = providedSections.filter(section => !validSections.includes(section))
    
    if (invalidSections.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid section(s): ${invalidSections.join(', ')}. Valid sections are: ${validSections.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Validate appointment section if provided
    if (body.appointment) {
      if (body.appointment.grace_period !== undefined) {
        const gracePeriod = parseInt(body.appointment.grace_period)
        if (isNaN(gracePeriod) || gracePeriod < 0 || gracePeriod > 60) {
          return NextResponse.json(
            {
              success: false,
              error: "Grace period must be between 0 and 60 minutes",
            },
            { status: 400 }
          )
        }
      }
      if (body.appointment.allow_walkins !== undefined && typeof body.appointment.allow_walkins !== 'boolean') {
        return NextResponse.json(
          {
            success: false,
            error: "allow_walkins must be a boolean",
          },
          { status: 400 }
        )
      }
      if (body.appointment.allow_overlap !== undefined && typeof body.appointment.allow_overlap !== 'boolean') {
        return NextResponse.json(
          {
            success: false,
            error: "allow_overlap must be a boolean",
          },
          { status: 400 }
        )
      }
    }

    // Validate language section if provided
    if (body.language) {
      // Supported prescription languages (including Indian regional languages)
      const validLanguages = [
        'English',
        'Hindi',
        'Marathi',
        'Tamil',
        'Telugu',
        'Kannada',
        'Malayalam',
        'Bengali',
        'Gujarati',
        'Punjabi',
        'Urdu',
        'Odia',
        'Assamese',
      ]
      const validUnits = ['Metric'] // Future: 'Imperial'
      const validDateFormats = ['DD/MM/YYYY'] // Future: 'MM/DD/YYYY'
      
      if (body.language.prescription_language && !validLanguages.includes(body.language.prescription_language)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid prescription language. Valid options: ${validLanguages.join(', ')}`,
          },
          { status: 400 }
        )
      }
      if (body.language.measurement_units && !validUnits.includes(body.language.measurement_units)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid measurement units. Valid options: ${validUnits.join(', ')}`,
          },
          { status: 400 }
        )
      }
      if (body.language.date_format && !validDateFormats.includes(body.language.date_format)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid date format. Valid options: ${validDateFormats.join(', ')}`,
          },
          { status: 400 }
        )
      }
    }

    // Validate privacy section if provided
    if (body.privacy) {
      if (body.privacy.mask_patient_mobile !== undefined && typeof body.privacy.mask_patient_mobile !== 'boolean') {
        return NextResponse.json(
          {
            success: false,
            error: "mask_patient_mobile must be a boolean",
          },
          { status: 400 }
        )
      }
      if (body.privacy.allow_patient_data_export !== undefined && typeof body.privacy.allow_patient_data_export !== 'boolean') {
        return NextResponse.json(
          {
            success: false,
            error: "allow_patient_data_export must be a boolean",
          },
          { status: 400 }
        )
      }
    }

    // Validate system section if provided
    if (body.system) {
      if (body.system.auto_save_consultation_draft !== undefined && typeof body.system.auto_save_consultation_draft !== 'boolean') {
        return NextResponse.json(
          {
            success: false,
            error: "auto_save_consultation_draft must be a boolean",
          },
          { status: 400 }
        )
      }
      if (body.system.lock_consultation_after_completion !== undefined && typeof body.system.lock_consultation_after_completion !== 'boolean') {
        return NextResponse.json(
          {
            success: false,
            error: "lock_consultation_after_completion must be a boolean",
          },
          { status: 400 }
        )
      }
    }

    // Send partial update to backend (backend should merge, not overwrite)
    const response = await fetch(`${BACKEND_URL}clinic/clinics/${clinicId}/preferences/`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        {
          success: false,
          error: extractErrorMessage(errorData, "Failed to update clinic preferences"),
          message: extractErrorMessage(errorData, "Failed to update clinic preferences"),
          errors: extractValidationErrors(errorData),
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Handle different response structures
    const updatedPreferences = data.data || data.preferences || data || {}

    return NextResponse.json({
      success: true,
      message: "Clinic preferences updated successfully",
      data: updatedPreferences,
    }, { status: 200 })
  } catch (error: any) {
    console.error("[Clinic Preferences API] Error updating preferences:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update clinic preferences",
        message: error.message || "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    )
  }
}

