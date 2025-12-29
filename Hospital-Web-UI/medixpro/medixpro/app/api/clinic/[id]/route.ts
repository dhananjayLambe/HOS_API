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

  // Try multiple ways to extract error message
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
      // Nested errors
      errors[key] = [JSON.stringify(value)]
    }
  })

  return errors
}

// Map backend day names to frontend day values
const DAY_MAP: Record<string, string> = {
  "Monday": "monday",
  "Tuesday": "tuesday",
  "Wednesday": "wednesday",
  "Thursday": "thursday",
  "Friday": "friday",
  "Saturday": "saturday",
  "Sunday": "sunday",
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clinicId } = await params

    if (!clinicId) {
      return NextResponse.json(
        { error: "Clinic ID is required" },
        { status: 400 }
      )
    }

    // Get auth token from request headers
    const authHeader = request.headers.get("authorization")
    const headers = getHeaders(authHeader)

    // Fetch clinic details, address, and schedules in parallel
    const [clinicRes, addressRes, schedulesRes] = await Promise.allSettled([
      fetch(`${BACKEND_URL}clinic/clinics/${clinicId}/`, {
        method: "GET",
        headers,
        cache: "no-store",
      }),
      fetch(`${BACKEND_URL}clinic/clinics/${clinicId}/address/?t=${Date.now()}`, {
        method: "GET",
        headers,
        cache: "no-store",
      }),
      fetch(`${BACKEND_URL}clinic/clinics/${clinicId}/schedules/`, {
        method: "GET",
        headers,
        cache: "no-store",
      }),
    ])

    // Process clinic data
    let clinicData: any = {}
    let clinicError: any = null
    
    if (clinicRes.status === "fulfilled") {
      if (clinicRes.value.ok) {
        try {
          const clinicResponse = await clinicRes.value.json()
          console.log("[Clinic API] Clinic response:", {
            success: clinicResponse.success,
            hasData: !!clinicResponse.data,
            dataKeys: clinicResponse.data ? Object.keys(clinicResponse.data) : [],
            message: clinicResponse.message,
          })
          
          if (clinicResponse.success && clinicResponse.data) {
            const data = clinicResponse.data
            console.log("[Clinic API] Raw clinic data from backend:", {
              name: data.name,
              hasName: !!data.name,
              registration_number: data.registration_number,
              website_url: data.website_url,
              email_address: data.email_address,
              contact_number_primary: data.contact_number_primary,
              allKeys: Object.keys(data),
            })
            
            clinicData = {
              name: data.name || "",
              registration_number: data.registration_number || "",
              gst_number: data.gst_number === "NA" ? "" : data.gst_number || "",
              website: data.website_url === "NA" ? "" : data.website_url || "",
              email_address: data.email_address === "NA" ? "" : data.email_address || "",
              contact_number_primary: data.contact_number_primary === "NA" ? "" : data.contact_number_primary || "",
              contact_number_secondary: data.contact_number_secondary === "NA" ? "" : data.contact_number_secondary || "",
              is_approved: data.is_approved || false,
              emergency_contact_name: data.emergency_contact_name === "NA" ? "" : data.emergency_contact_name || "",
              emergency_contact_number: data.emergency_contact_number === "NA" ? "" : data.emergency_contact_number || "",
              emergency_email_address: data.emergency_email_address === "NA" ? "" : data.emergency_email_address || "",
              emergency_instructions_text: data.emergency_instructions_text || "",
            }
            console.log("[Clinic API] Processed clinic data:", {
              name: clinicData.name,
              hasName: !!clinicData.name,
              registration_number: clinicData.registration_number,
              website: clinicData.website,
              email: clinicData.email_address,
              phone: clinicData.contact_number_primary,
            })
          } else {
            console.warn("[Clinic API] Clinic response missing success or data:", clinicResponse)
            clinicError = {
              message: clinicResponse.message || "Failed to fetch clinic data",
              status: clinicRes.value.status,
            }
          }
        } catch (parseError) {
          console.error("[Clinic API] Error parsing clinic response:", parseError)
          clinicError = {
            message: "Invalid response format from clinic endpoint",
            status: clinicRes.value.status,
          }
        }
      } else {
        // Handle non-OK response
        try {
          const errorData = await clinicRes.value.json().catch(() => ({}))
          clinicError = {
            message: extractErrorMessage(errorData, "Failed to fetch clinic data"),
            status: clinicRes.value.status,
            details: errorData,
            validationErrors: extractValidationErrors(errorData),
          }
        } catch (parseError) {
          clinicError = {
            message: `Failed to fetch clinic data (HTTP ${clinicRes.value.status})`,
            status: clinicRes.value.status,
          }
        }
      }
    } else if (clinicRes.status === "rejected") {
      clinicError = {
        message: "Network error while fetching clinic data",
        status: 0,
        details: clinicRes.reason?.message || "Connection failed",
      }
    }

    // If clinic fetch failed critically (not 404), return error
    if (clinicError && clinicError.status !== 404) {
      return NextResponse.json(
        {
          success: false,
          error: clinicError.message,
          message: clinicError.message,
          status: clinicError.status,
          details: clinicError.details,
          validationErrors: clinicError.validationErrors,
        },
        { status: clinicError.status || 500 }
      )
    }

    // Process address data (404 is acceptable - address may not exist yet)
    let addressData: any = {
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    }
    if (addressRes.status === "fulfilled" && addressRes.value.ok) {
      try {
        const addressResponse = await addressRes.value.json()
        console.log("[Clinic API] Raw address response:", JSON.stringify(addressResponse, null, 2))
        console.log("[Clinic API] Address response structure:", {
          success: addressResponse.success,
          hasData: !!addressResponse.data,
          responseKeys: addressResponse ? Object.keys(addressResponse) : [],
          dataType: addressResponse.data ? typeof addressResponse.data : 'undefined',
          dataKeys: addressResponse.data && typeof addressResponse.data === 'object' ? Object.keys(addressResponse.data) : [],
        })
        
        // Handle different response structures
        let addr: any = null
        if (addressResponse.success && addressResponse.data) {
          addr = addressResponse.data
          console.log("[Clinic API] Using addressResponse.data:", addr)
        } else if (addressResponse.data) {
          // Sometimes data is directly in response.data
          addr = addressResponse.data
          console.log("[Clinic API] Using addressResponse.data (no success check):", addr)
        } else if (addressResponse.status && addressResponse.data) {
          // Sometimes wrapped in status: true, data: {...}
          addr = addressResponse.data
          console.log("[Clinic API] Using addressResponse.data (status check):", addr)
        } else if (addressResponse.address) {
          // Sometimes address is directly in response
          addr = addressResponse.address
          console.log("[Clinic API] Using addressResponse.address:", addr)
        } else if (addressResponse && typeof addressResponse === 'object' && !addressResponse.success) {
          // Response might be the address data directly
          addr = addressResponse
          console.log("[Clinic API] Using addressResponse directly:", addr)
        }
        
        if (addr && typeof addr === 'object') {
          console.log("[Clinic API] Parsed address object:", JSON.stringify(addr, null, 2))
          console.log("[Clinic API] Address object keys:", Object.keys(addr))
          console.log("[Clinic API] Address field values:", {
            address: addr.address,
            address2: addr.address2,
            addressLine1: addr.addressLine1,
            addressLine2: addr.addressLine2,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            country: addr.country,
          })
          
          // Backend model uses 'address' and 'address2' fields
          // Frontend expects 'addressLine1' and 'addressLine2'
          // Helper to clean value
          const cleanValue = (value: any): string => {
            if (value === null || value === undefined || value === "NA" || value === "null" || value === "") {
              return ""
            }
            return String(value).trim()
          }
          
          addressData = {
            addressLine1: cleanValue(addr.address || addr.addressLine1),
            addressLine2: cleanValue(addr.address2 || addr.addressLine2),
            city: cleanValue(addr.city),
            state: cleanValue(addr.state),
            pincode: cleanValue(addr.pincode),
            country: cleanValue(addr.country) || "India",
          }
          
          console.log("[Clinic API] Processed address data for frontend:", JSON.stringify(addressData, null, 2))
          console.log("[Clinic API] Address data object:", addressData)
        } else {
          console.warn("[Clinic API] Could not extract address data from response. addr:", addr, "type:", typeof addr)
        }
      } catch (parseError) {
        console.error("[Clinic API] Error parsing address response:", parseError)
        // Continue with default address data
      }
    } else if (addressRes.status === "fulfilled" && addressRes.value.status === 404) {
      // 404 is acceptable - address may not exist yet
      console.log("[Clinic API] Address not found (404) - using default empty address")
    } else if (addressRes.status === "rejected") {
      console.warn("[Clinic API] Error fetching address:", addressRes.reason)
      // Continue with default address data
    } else if (addressRes.status === "fulfilled") {
      console.warn("[Clinic API] Address fetch returned non-OK status:", addressRes.value.status)
      try {
        const errorData = await addressRes.value.json().catch(() => ({}))
        console.warn("[Clinic API] Address error response:", errorData)
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Process schedules/operating hours (404 is acceptable - schedules may not exist yet)
    let operatingHours: any[] = []
    if (schedulesRes.status === "fulfilled" && schedulesRes.value.ok) {
      try {
        const schedulesResponse = await schedulesRes.value.json()
        console.log("[Clinic API] Schedules response:", {
          success: schedulesResponse.success,
          hasData: !!schedulesResponse.data,
          dataIsArray: Array.isArray(schedulesResponse.data),
          dataLength: Array.isArray(schedulesResponse.data) ? schedulesResponse.data.length : 0,
          response: schedulesResponse,
        })
        
        if (schedulesResponse.success && Array.isArray(schedulesResponse.data)) {
          operatingHours = schedulesResponse.data.map((schedule: any) => {
            // Map backend day (capitalized) to frontend day (lowercase)
            const frontendDay = DAY_MAP[schedule.day_of_week] || schedule.day_of_week?.toLowerCase() || ""
            const openTime = schedule.open_time 
              ? (schedule.open_time.includes(':') ? schedule.open_time.substring(0, 5) : schedule.open_time)
              : ""
            const closeTime = schedule.close_time 
              ? (schedule.close_time.includes(':') ? schedule.close_time.substring(0, 5) : schedule.close_time)
              : ""
            
            return {
              day: frontendDay,
              openTime: openTime,
              closeTime: closeTime,
              closed: schedule.is_closed || false,
            }
          })
          console.log("[Clinic API] Processed operating hours:", operatingHours)
        } else if (schedulesResponse.data && !Array.isArray(schedulesResponse.data)) {
          // Handle single schedule object
          const schedule = schedulesResponse.data
          operatingHours = [{
            day: DAY_MAP[schedule.day_of_week] || schedule.day_of_week?.toLowerCase() || "",
            openTime: schedule.open_time ? schedule.open_time.substring(0, 5) : "",
            closeTime: schedule.close_time ? schedule.close_time.substring(0, 5) : "",
            closed: schedule.is_closed || false,
          }]
        }
      } catch (parseError) {
        console.error("[Clinic API] Error parsing schedules response:", parseError)
        // Continue with empty operating hours
      }
    } else if (schedulesRes.status === "fulfilled" && schedulesRes.value.status === 404) {
      // 404 is acceptable - schedules may not exist yet
      console.log("[Clinic API] Schedules not found (404) - using default empty schedules")
    } else if (schedulesRes.status === "rejected") {
      console.warn("[Clinic API] Error fetching schedules:", schedulesRes.reason)
      // Continue with empty operating hours
    } else if (schedulesRes.status === "fulfilled") {
      console.warn("[Clinic API] Schedules fetch returned non-OK status:", schedulesRes.value.status)
      try {
        const errorData = await schedulesRes.value.json().catch(() => ({}))
        console.warn("[Clinic API] Schedules error response:", errorData)
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Combine all data
    const responseData = {
      success: true,
      clinic: clinicData,
      address: addressData,
      operating_hours: operatingHours,
      emergency_contact: {
        name: clinicData.emergency_contact_name || "",
        phone: clinicData.emergency_contact_number || "",
        email: clinicData.emergency_email_address || "",
        instructions: clinicData.emergency_instructions_text || "",
      },
    }

    console.log("[Clinic API] Final response data:", {
      hasClinic: Object.keys(clinicData).length > 0,
      hasAddress: Object.keys(addressData).length > 0,
      operatingHoursCount: operatingHours.length,
      clinicName: clinicData.name,
      clinicDataKeys: Object.keys(clinicData),
      addressDataKeys: Object.keys(addressData),
      addressDataFull: JSON.stringify(addressData, null, 2),
      sampleClinicData: {
        name: clinicData.name,
        email: clinicData.email_address,
        phone: clinicData.contact_number_primary,
      },
      sampleAddressData: {
        addressLine1: addressData.addressLine1,
        addressLine2: addressData.addressLine2,
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode,
        country: addressData.country,
      },
    })

    return NextResponse.json(responseData, { status: 200 })
  } catch (error: any) {
    console.error("[Clinic API] Error fetching clinic data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch clinic data",
        message: error.message || "An unexpected error occurred. Please try again later.",
        details: error.stack || undefined,
      },
      { status: 500 }
    )
  }
}

// Reverse day map: frontend to backend
const REVERSE_DAY_MAP: Record<string, string> = {
  "monday": "Monday",
  "tuesday": "Tuesday",
  "wednesday": "Wednesday",
  "thursday": "Thursday",
  "friday": "Friday",
  "saturday": "Saturday",
  "sunday": "Sunday",
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clinicId } = await params
    const body = await request.json()

    if (!clinicId) {
      return NextResponse.json(
        { error: "Clinic ID is required" },
        { status: 400 }
      )
    }

    // Get auth token from request headers
    const authHeader = request.headers.get("authorization")
    const headers = getHeaders(authHeader)

    const results: any = {
      clinic: null,
      address: null,
      schedules: null,
    }
    const errors: string[] = []

    // 1. Update clinic basic information
    if (body.clinic || body.name || body.email_address || body.contact_number_primary) {
      const clinicPayload: any = {}
      
      if (body.clinic) {
        Object.assign(clinicPayload, body.clinic)
        // Map website to website_url if present
        if (clinicPayload.website !== undefined) {
          clinicPayload.website_url = clinicPayload.website || "NA"
          delete clinicPayload.website
        }
      } else {
        // Support direct fields for backward compatibility
        if (body.name !== undefined) clinicPayload.name = body.name
        if (body.registration_number !== undefined) clinicPayload.registration_number = body.registration_number
        if (body.gst_number !== undefined) clinicPayload.gst_number = body.gst_number || "NA"
        if (body.website !== undefined) clinicPayload.website_url = body.website || "NA"
        if (body.email_address !== undefined) clinicPayload.email_address = body.email_address || "NA"
        if (body.contact_number_primary !== undefined) clinicPayload.contact_number_primary = body.contact_number_primary
        if (body.contact_number_secondary !== undefined) clinicPayload.contact_number_secondary = body.contact_number_secondary || "NA"
      }

      // Handle emergency contact fields - only if emergency_contact object exists and is not empty
      // Check if emergency_contact has any actual data (not just empty object)
      const hasEmergencyContactData = body.emergency_contact && 
        Object.keys(body.emergency_contact).length > 0 &&
        (body.emergency_contact.name || body.emergency_contact.phone || body.emergency_contact.email || body.emergency_contact.instructions)
      
      if (hasEmergencyContactData) {
        clinicPayload.emergency_contact_name = body.emergency_contact.name || "NA"
        clinicPayload.emergency_contact_number = body.emergency_contact.phone || "NA"
        // For email, only include if it's a valid email format
        // Don't send "NA" as it's not a valid email format for Django EmailField
        // If empty, don't include the field - let backend keep existing value
        const emergencyEmail = body.emergency_contact.email
        if (emergencyEmail && emergencyEmail.trim() !== "" && emergencyEmail.trim() !== "NA") {
          // Validate email format before sending
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (emailRegex.test(emergencyEmail.trim())) {
            clinicPayload.emergency_email_address = emergencyEmail.trim()
          }
          // If invalid email format, don't include it - backend will keep existing value
        }
        // Only set instructions if provided
        if (body.emergency_contact.instructions !== undefined) {
          clinicPayload.emergency_instructions_text = body.emergency_contact.instructions || ""
        }
      }

      // Clean up "NA" values - convert empty strings to "NA" for required fields
      if (clinicPayload.gst_number === "") clinicPayload.gst_number = "NA"
      if (clinicPayload.website_url === "") clinicPayload.website_url = "NA"
      if (clinicPayload.email_address === "") clinicPayload.email_address = "NA"
      if (clinicPayload.contact_number_secondary === "") clinicPayload.contact_number_secondary = "NA"
      if (clinicPayload.emergency_contact_name === "") clinicPayload.emergency_contact_name = "NA"
      if (clinicPayload.emergency_contact_number === "") clinicPayload.emergency_contact_number = "NA"
      // Don't set emergency_email_address to "NA" - it's not a valid email format
      // If it's empty or undefined, remove it from payload so backend keeps existing value
      if (clinicPayload.emergency_email_address === "" || clinicPayload.emergency_email_address === undefined || clinicPayload.emergency_email_address === "NA") {
        delete clinicPayload.emergency_email_address
      }

      try {
        const clinicRes = await fetch(`${BACKEND_URL}clinic/clinics/${clinicId}/`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(clinicPayload),
        })

        if (clinicRes.ok) {
          try {
            const clinicData = await clinicRes.json()
            results.clinic = clinicData
          } catch (parseError: any) {
            console.error("[Clinic API] Error parsing clinic update response:", parseError)
            errors.push("Clinic update succeeded but received invalid response")
          }
        } else {
          try {
            const errorData = await clinicRes.json().catch(() => ({}))
            const errorMessage = extractErrorMessage(errorData, "Unknown error")
            errors.push(`Clinic update failed: ${errorMessage}`)
            console.error("[Clinic API] Clinic update error:", {
              status: clinicRes.status,
              error: errorMessage,
              details: errorData,
            })
          } catch (parseError) {
            errors.push(`Clinic update failed: HTTP ${clinicRes.status}`)
          }
        }
      } catch (error: any) {
        console.error("[Clinic API] Clinic update network error:", error)
        errors.push(`Clinic update network error: ${error.message || "Connection failed"}`)
      }
    }

    // 2. Update address
    if (body.address) {
      const addressPayload = {
        address: body.address.addressLine1 || "NA",
        address2: body.address.addressLine2 || "NA",
        city: body.address.city || "NA",
        state: body.address.state || "NA",
        pincode: body.address.pincode || "NA",
        country: body.address.country || "India",
      }

      try {
        const addressRes = await fetch(`${BACKEND_URL}clinic/clinics/${clinicId}/address/`, {
          method: "PUT",
          headers,
          body: JSON.stringify(addressPayload),
        })

        if (addressRes.ok) {
          try {
            const addressData = await addressRes.json()
            results.address = addressData
          } catch (parseError: any) {
            console.error("[Clinic API] Error parsing address update response:", parseError)
            errors.push("Address update succeeded but received invalid response")
          }
        } else {
          try {
            const errorData = await addressRes.json().catch(() => ({}))
            const errorMessage = extractErrorMessage(errorData, "Unknown error")
            errors.push(`Address update failed: ${errorMessage}`)
            console.error("[Clinic API] Address update error:", {
              status: addressRes.status,
              error: errorMessage,
              details: errorData,
            })
          } catch (parseError) {
            errors.push(`Address update failed: HTTP ${addressRes.status}`)
          }
        }
      } catch (error: any) {
        console.error("[Clinic API] Address update network error:", error)
        errors.push(`Address update network error: ${error.message || "Connection failed"}`)
      }
    }

    // 3. Update operating hours/schedules
    if (body.operating_hours && Array.isArray(body.operating_hours) && body.operating_hours.length > 0) {
      console.log("[Clinic API] Processing operating hours update:", body.operating_hours.length, "days")
      
      const schedulePromises = body.operating_hours.map(async (hours: any) => {
        // Map frontend day (lowercase) to backend day (capitalized)
        const dayOfWeek = REVERSE_DAY_MAP[hours.day] || hours.day.charAt(0).toUpperCase() + hours.day.slice(1).toLowerCase()
        const schedulePayload: any = {
          day_of_week: dayOfWeek,
          is_closed: hours.closed || false,
        }

        // If clinic is closed, set times to null
        if (schedulePayload.is_closed) {
          schedulePayload.open_time = null
          schedulePayload.close_time = null
        } else {
          // If clinic is open, both times are required
          if (hours.openTime && hours.closeTime) {
            // Ensure time format is HH:MM:SS
            schedulePayload.open_time = hours.openTime.includes(':') && hours.openTime.length === 5 
              ? `${hours.openTime}:00` 
              : hours.openTime
            schedulePayload.close_time = hours.closeTime.includes(':') && hours.closeTime.length === 5 
              ? `${hours.closeTime}:00` 
              : hours.closeTime
          } else {
            // If times are missing but not closed, this is an error
            return { 
              error: `Both open time and close time are required for ${dayOfWeek} when clinic is open.`,
              day: dayOfWeek
            }
          }
        }

        console.log(`[Clinic API] Updating schedule for ${dayOfWeek}:`, schedulePayload)

        try {
          const scheduleRes = await fetch(`${BACKEND_URL}clinic/clinics/${clinicId}/schedules/`, {
            method: "POST",
            headers,
            body: JSON.stringify(schedulePayload),
          })

          if (!scheduleRes.ok) {
            try {
              const errorData = await scheduleRes.json().catch(() => ({}))
              const errorMessage = extractErrorMessage(errorData, "Unknown error")
              console.error(`[Clinic API] Schedule update error for ${dayOfWeek}:`, {
                status: scheduleRes.status,
                error: errorMessage,
                details: errorData,
              })
              return { 
                error: errorMessage || `Schedule update failed for ${dayOfWeek}`,
                day: dayOfWeek
              }
            } catch (parseError) {
              return { 
                error: `Schedule update failed for ${dayOfWeek}: HTTP ${scheduleRes.status}`,
                day: dayOfWeek
              }
            }
          }

          try {
            const scheduleData = await scheduleRes.json()
            console.log(`[Clinic API] Schedule updated successfully for ${dayOfWeek}:`, scheduleData)
            return { success: true, data: scheduleData, day: dayOfWeek }
          } catch (parseError: any) {
            console.error(`[Clinic API] Error parsing schedule response for ${dayOfWeek}:`, parseError)
            return { 
              error: `Schedule update succeeded for ${dayOfWeek} but received invalid response`,
              day: dayOfWeek
            }
          }
        } catch (error: any) {
          console.error(`[Clinic API] Schedule update network error for ${dayOfWeek}:`, error)
          return { 
            error: `Network error for ${dayOfWeek}: ${error.message || "Connection failed"}`,
            day: dayOfWeek
          }
        }
      })

      const scheduleResults = await Promise.all(schedulePromises)
      const scheduleErrors = scheduleResults.filter((r: any) => r.error)
      const scheduleSuccesses = scheduleResults.filter((r: any) => r.success)
      
      console.log("[Clinic API] Schedule update results:", {
        total: scheduleResults.length,
        successes: scheduleSuccesses.length,
        errorCount: scheduleErrors.length,
        errors: scheduleErrors
      })
      
      if (scheduleErrors.length > 0) {
        // Collect all error messages
        const errorMessages = scheduleErrors.map((r: any) => r.error || `Failed to update ${r.day || 'schedule'}`)
        errors.push(...errorMessages)
      }
      
      if (scheduleSuccesses.length > 0) {
        results.schedules = scheduleSuccesses.map((r: any) => r.data)
      }
    }

    // Return response
    if (errors.length > 0) {
      const hasPartialSuccess = Object.values(results).some(r => r !== null)
      const statusCode = hasPartialSuccess ? 207 : 400 // 207 Multi-Status for partial success
      
      return NextResponse.json(
        {
          success: false,
          error: errors.join("; "),
          message: hasPartialSuccess 
            ? "Some updates succeeded, but some failed. Please check the details."
            : "Failed to update clinic information",
          details: errors,
          partial_success: hasPartialSuccess,
          results,
          validationErrors: errors.reduce((acc, err, idx) => {
            acc[`error_${idx}`] = [err]
            return acc
          }, {} as Record<string, string[]>),
        },
        { status: statusCode }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Clinic information updated successfully",
        results,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("[Clinic API] Unexpected error updating clinic data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update clinic information",
        message: error.message || "An unexpected error occurred. Please try again later.",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

