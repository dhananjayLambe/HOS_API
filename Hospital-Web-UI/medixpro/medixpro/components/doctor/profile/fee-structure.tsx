"use client"

import { useState, useEffect } from "react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { apiClient } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

// Combined interface for all three models
interface FeeStructureData {
  // DoctorFeeStructure fields
  first_time_consultation_fee: string
  follow_up_fee: string
  case_paper_duration: string
  case_paper_renewal_fee: string
  emergency_consultation_fee: string
  online_consultation_fee: string
  cancellation_fee: string
  rescheduling_fee: string
  night_consultation_fee: string
  night_hours_start: string
  night_hours_end: string
  is_active: boolean

  // FollowUpPolicy fields
  follow_up_duration: string
  max_follow_up_visits: string
  allow_online_follow_up: boolean
  online_follow_up_fee: string
  allow_free_follow_up: boolean
  free_follow_up_days: string
  auto_apply_case_paper: boolean
  access_past_appointments: boolean
  access_past_prescriptions: boolean
  access_past_reports: boolean
  access_other_clinic_history: boolean

  // CancellationPolicy fields
  allow_cancellation: boolean
  cancellation_window_hours: string
  allow_refund: boolean
  refund_percentage: string
}

interface Clinic {
  id?: string
  name?: string
  clinic?: {
    id: string
    name: string
  }
  clinic_id?: string
  clinic_name?: string
}

export function FeeStructureSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [selectedClinicId, setSelectedClinicId] = useState<string>("")
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState<number>(0) // Key to force re-render (integer counter)
  const toast = useToastNotification()

  // Store IDs for update operations
  const [feeStructureId, setFeeStructureId] = useState<string | null>(null)
  const [followUpPolicyId, setFollowUpPolicyId] = useState<string | null>(null)
  const [cancellationPolicyId, setCancellationPolicyId] = useState<string | null>(null)

  const [feeData, setFeeData] = useState<FeeStructureData>({
    // DoctorFeeStructure defaults
    first_time_consultation_fee: "1000",
    follow_up_fee: "500",
    case_paper_duration: "7",
    case_paper_renewal_fee: "200",
    emergency_consultation_fee: "0",
    online_consultation_fee: "0",
    cancellation_fee: "0",
    rescheduling_fee: "0",
    night_consultation_fee: "0",
    night_hours_start: "21:00",
    night_hours_end: "07:00",
    is_active: true,

    // FollowUpPolicy defaults
    follow_up_duration: "7",
    max_follow_up_visits: "1",
    allow_online_follow_up: true,
    online_follow_up_fee: "0",
    allow_free_follow_up: false,
    free_follow_up_days: "3",
    auto_apply_case_paper: true,
    access_past_appointments: true,
    access_past_prescriptions: true,
    access_past_reports: true,
    access_other_clinic_history: false,

    // CancellationPolicy defaults
    allow_cancellation: true,
    cancellation_window_hours: "6",
    allow_refund: false,
    refund_percentage: "0",
  })

  const [originalData, setOriginalData] = useState<FeeStructureData>({ ...feeData })

  // Fetch doctor ID and clinics on mount
  useEffect(() => {
    const initializeData = async () => {
      await fetchDoctorId()
      await fetchClinics()
      // Auto-select first clinic and fetch data
      if (selectedClinicId) {
        await fetchFeeStructureData()
      }
    }
    initializeData()
  }, [])

  // Fetch doctor ID from profile
  const fetchDoctorId = async () => {
    try {
      const profileResponse = await apiClient.getProfile()
      const profile = profileResponse?.doctor_profile || profileResponse
      
      // Try multiple possible locations for doctor ID
      // The DoctorFullProfileSerializer returns personal_info with id field from DoctorBasicSerializer
      const doctorIdFromProfile = 
        profile?.personal_info?.id ||  // Most likely location based on serializer
        profile?.id || 
        profile?.doctor_id || 
        profile?.personal_info?.doctor_id ||
        profileResponse?.doctor_profile?.personal_info?.id ||
        profileResponse?.id ||
        profileResponse?.doctor_id
      
      
      if (doctorIdFromProfile) {
        setDoctorId(doctorIdFromProfile)
        // Also store in localStorage for future use
        localStorage.setItem("doctor_id", doctorIdFromProfile)
      } else {
        // Try to get from localStorage as fallback
        const storedDoctorId = localStorage.getItem("doctor_id")
        if (storedDoctorId) {
          setDoctorId(storedDoctorId)
        } else {
          console.warn("Could not find doctor ID in profile response or localStorage")
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch doctor ID:", error)
      // Try to get from localStorage as fallback
      const storedDoctorId = localStorage.getItem("doctor_id")
      if (storedDoctorId) {
        setDoctorId(storedDoctorId)
      }
    }
  }

  // Fetch fee structure data when clinic is auto-selected
  useEffect(() => {
    if (selectedClinicId) {
      fetchFeeStructureData()
    } else {
      // Reset to defaults when no clinic available
      resetToDefaults()
    }
  }, [selectedClinicId])

  const fetchClinics = async () => {
    try {
      const response = await apiClient.getClinics()
      // Handle different response formats
      let clinicsData = []
      if (response?.data) {
        clinicsData = Array.isArray(response.data) ? response.data : []
      } else if (Array.isArray(response)) {
        clinicsData = response
      } else if (response?.doctor_profile?.clinic_association) {
        clinicsData = response.doctor_profile.clinic_association
      } else if (response?.clinic_association) {
        clinicsData = response.clinic_association
      }

      if (clinicsData.length > 0) {
        setClinics(clinicsData)
        // Auto-select first clinic silently (no UI selector)
        const firstClinic = clinicsData[0]
        const clinicId = firstClinic.id || firstClinic.clinic?.id || firstClinic.clinic_id
        if (clinicId && clinicId !== selectedClinicId) {
          setSelectedClinicId(clinicId)
        }
      } else {
        // No clinics found - set empty array
        setClinics([])
        setSelectedClinicId("")
      }
    } catch (error: any) {
      console.error("Failed to fetch clinics:", error)
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to load clinics"
      toast.error(errorMessage)
    }
  }

  const fetchFeeStructureData = async () => {
    if (!selectedClinicId) return

    setIsFetching(true)
    try {
      
      // Fetch all three models for the selected clinic and doctor
      // Use Promise.allSettled to handle individual failures gracefully
      // Add timestamp to prevent caching
      const [feeStructuresResult, followUpPoliciesResult, cancellationPoliciesResult] = await Promise.allSettled([
        apiClient.getFeeStructures(selectedClinicId, doctorId ?? undefined),
        apiClient.getFollowUpPolicies(selectedClinicId, doctorId ?? undefined),
        apiClient.getCancellationPolicies(selectedClinicId, doctorId ?? undefined),
      ])
      

      // Extract data from responses, handling both fulfilled and rejected promises
      const feeStructuresRes = feeStructuresResult.status === 'fulfilled' ? feeStructuresResult.value : null
      const followUpPoliciesRes = followUpPoliciesResult.status === 'fulfilled' ? followUpPoliciesResult.value : null
      const cancellationPoliciesRes = cancellationPoliciesResult.status === 'fulfilled' ? cancellationPoliciesResult.value : null
      
      // Log raw responses for debugging - FULL response to see structure

      // Log errors for debugging but don't fail the entire operation
      // Only log non-404 errors (404 means no data exists yet, which is expected)
      if (feeStructuresResult.status === 'rejected') {
        const error = feeStructuresResult.reason
        const status = error?.status ?? error?.response?.status
        if (status && status !== 404) {
          console.warn("Failed to fetch fee structures:", error)
        }
      }
      if (followUpPoliciesResult.status === 'rejected') {
        const error = followUpPoliciesResult.reason
        const status = error?.status ?? error?.response?.status
        if (status && status !== 404) {
          console.warn("Failed to fetch follow-up policies:", error)
        }
      }
      if (cancellationPoliciesResult.status === 'rejected') {
        const error = cancellationPoliciesResult.reason
        const status = error?.status ?? error?.response?.status
        if (status && status !== 404) {
          console.warn("Failed to fetch cancellation policies:", error)
        }
      }

      // Extract data from responses (handle null cases)
      // Django returns: { status: "success", message: "...", data: [...] }
      // Next.js API route returns this object directly
      // apiRequest returns response.data, which is the Django response object
      // So we receive: { status: "success", message: "...", data: [...] }
      const extractDataArray = (response: any, name: string = "Response"): any[] => {
        
        if (!response) {
          console.warn(`⚠️ ${name}: Response is null/undefined`)
          return []
        }
        
        // If response is already an array, return it
        if (Array.isArray(response)) {
          return response
        }
        
        // If response has a data property that is an array
        if (response?.data && Array.isArray(response.data)) {
          return response.data
        }
        
        // If response has a data property that is a single object
        if (response?.data && !Array.isArray(response.data) && typeof response.data === 'object') {
          return [response.data]
        }
        
        // If response itself is an object (single record)
        if (response && typeof response === 'object' && response.id) {
          return [response]
        }
        
        console.warn(`⚠️ ${name}: Could not extract data array from response:`, response)
        return []
      }
      
      const feeStructures = extractDataArray(feeStructuresRes, "Fee Structures")
      const followUpPolicies = extractDataArray(followUpPoliciesRes, "Follow-up Policies")
      const cancellationPolicies = extractDataArray(cancellationPoliciesRes, "Cancellation Policies")
      

      // Get the first record for each (since unique_together ensures one per doctor-clinic)
      // When filtered by both doctor_id and clinic_id, we should get exactly 0 or 1 record
      const feeStructure = Array.isArray(feeStructures) && feeStructures.length > 0 ? feeStructures[0] : null
      const followUpPolicy = Array.isArray(followUpPolicies) && followUpPolicies.length > 0 ? followUpPolicies[0] : null
      const cancellationPolicy = Array.isArray(cancellationPolicies) && cancellationPolicies.length > 0 ? cancellationPolicies[0] : null
      
      // CRITICAL: If we have records but extraction returned empty arrays, log a warning
      // This indicates a data extraction issue, not a missing data issue
      if ((feeStructuresRes || followUpPoliciesRes || cancellationPoliciesRes) && 
          feeStructures.length === 0 && followUpPolicies.length === 0 && cancellationPolicies.length === 0) {
        console.warn("⚠️ API returned responses but data extraction returned empty arrays. This may indicate a response structure mismatch.")
        console.warn("⚠️ Response structures:", {
          feeStructuresRes: feeStructuresRes,
          followUpPoliciesRes: followUpPoliciesRes,
          cancellationPoliciesRes: cancellationPoliciesRes,
        })
      }
      
      
      
      // Log full records for debugging

      // Update IDs for update operations - ALWAYS set (null if no record exists)
      if (feeStructure?.id) {
        setFeeStructureId(feeStructure.id)
      } else {
        setFeeStructureId(null)
      }
      if (followUpPolicy?.id) {
        setFollowUpPolicyId(followUpPolicy.id)
      } else {
        setFollowUpPolicyId(null)
      }
      if (cancellationPolicy?.id) {
        setCancellationPolicyId(cancellationPolicy.id)
      } else {
        setCancellationPolicyId(null)
      }

      // Helper to safely convert value to string, handling null/undefined/0
      const safeToString = (value: any, defaultValue: string, fieldName: string = "field"): string => {
        // CRITICAL: Check for null/undefined first, but allow 0 as a valid value
        if (value === null || value === undefined) {
          return defaultValue
        }
        // Convert to string, handling decimal formatting (e.g., "1005.00" -> "1005")
        const str = value.toString()
        // Remove trailing zeros after decimal point for cleaner display
        if (str.includes('.')) {
          const parsed = parseFloat(str)
          if (isNaN(parsed)) {
            console.warn(`⚠️ ${fieldName}: Could not parse "${str}" as number, using default: ${defaultValue}`)
            return defaultValue
          }
          const result = parsed.toString()
          return result
        }
        // If it's a number, convert to string
        if (typeof value === 'number') {
          return value.toString()
        }
        return str
      }
      
      // Helper to safely get time string
      const safeTimeString = (value: any, defaultValue: string): string => {
        if (!value) return defaultValue
        const str = value.toString()
        // Handle "21:00:00" format from database -> "21:00" for input
        if (str.includes(':') && str.split(':').length === 3) {
          return str.substring(0, 5) // Take only HH:MM
        }
        return str
      }

      // Merge data from all three models - USE ACTUAL VALUES FROM DATABASE, not defaults
      // CRITICAL: Only use defaults if record doesn't exist, otherwise use actual database values
      
      const mergedData: FeeStructureData = {
        // DoctorFeeStructure fields - Use actual values from database
        first_time_consultation_fee: feeStructure ? safeToString(feeStructure.first_time_consultation_fee, "1000", "first_time_consultation_fee") : "1000",
        follow_up_fee: feeStructure ? safeToString(feeStructure.follow_up_fee, "500", "follow_up_fee") : "500",
        case_paper_duration: feeStructure ? safeToString(feeStructure.case_paper_duration, "7", "case_paper_duration") : "7",
        case_paper_renewal_fee: feeStructure ? safeToString(feeStructure.case_paper_renewal_fee, "200", "case_paper_renewal_fee") : "200",
        emergency_consultation_fee: feeStructure ? safeToString(feeStructure.emergency_consultation_fee, "0", "emergency_consultation_fee") : "0",
        online_consultation_fee: feeStructure ? safeToString(feeStructure.online_consultation_fee, "0", "online_consultation_fee") : "0",
        cancellation_fee: feeStructure ? safeToString(feeStructure.cancellation_fee, "0", "cancellation_fee") : "0",
        rescheduling_fee: feeStructure ? safeToString(feeStructure.rescheduling_fee, "0", "rescheduling_fee") : "0",
        night_consultation_fee: feeStructure ? safeToString(feeStructure.night_consultation_fee, "0", "night_consultation_fee") : "0",
        night_hours_start: feeStructure ? safeTimeString(feeStructure.night_hours_start, "21:00") : "21:00",
        night_hours_end: feeStructure ? safeTimeString(feeStructure.night_hours_end, "07:00") : "07:00",
        is_active: feeStructure?.is_active ?? true,

        // FollowUpPolicy fields - Use actual values from database
        follow_up_duration: followUpPolicy ? safeToString(followUpPolicy.follow_up_duration, "7", "follow_up_duration") : "7",
        max_follow_up_visits: followUpPolicy ? safeToString(followUpPolicy.max_follow_up_visits, "1", "max_follow_up_visits") : "1",
        allow_online_follow_up: followUpPolicy?.allow_online_follow_up ?? true,
        online_follow_up_fee: followUpPolicy ? safeToString(followUpPolicy.online_follow_up_fee, "0", "online_follow_up_fee") : "0",
        allow_free_follow_up: followUpPolicy?.allow_free_follow_up ?? false,
        free_follow_up_days: followUpPolicy ? safeToString(followUpPolicy.free_follow_up_days, "3", "free_follow_up_days") : "3",
        auto_apply_case_paper: followUpPolicy?.auto_apply_case_paper ?? true,
        access_past_appointments: followUpPolicy?.access_past_appointments ?? true,
        access_past_prescriptions: followUpPolicy?.access_past_prescriptions ?? true,
        access_past_reports: followUpPolicy?.access_past_reports ?? true,
        access_other_clinic_history: followUpPolicy?.access_other_clinic_history ?? false,

        // CancellationPolicy fields - Use actual values from database
        allow_cancellation: cancellationPolicy?.allow_cancellation ?? true,
        cancellation_window_hours: cancellationPolicy ? safeToString(cancellationPolicy.cancellation_window_hours, "6", "cancellation_window_hours") : "6",
        allow_refund: cancellationPolicy?.allow_refund ?? false,
        refund_percentage: cancellationPolicy ? safeToString(cancellationPolicy.refund_percentage, "0", "refund_percentage") : "0",
      }
      
      

      // Set the state with the fresh data from database - this will update the UI
      // Create a new object reference to ensure React detects the change
      const freshMergedData = { ...mergedData }
      
      
      // CRITICAL: Verify we're not using defaults when we have actual data
      const hasActualData = feeStructure || followUpPolicy || cancellationPolicy
      if (!hasActualData) {
        console.warn("⚠️ No actual data found in any of the three models - using defaults")
      } else {
      }
      
      // Use functional update to ensure we're setting the latest data
      // CRITICAL: Use a completely new object reference to force React to detect the change
      const newFeeData = JSON.parse(JSON.stringify(freshMergedData)) // Deep clone to ensure new reference
      setFeeData(newFeeData)
      setOriginalData(JSON.parse(JSON.stringify(newFeeData))) // Also deep clone for originalData
      
      // Force a re-render by updating the refresh key (increment by 1 as integer)
      setRefreshKey(prev => Math.floor(prev) + 1)
      
      
      // Show success message if data was loaded (optional, can be removed if too verbose)
      // Only show if we actually got data
      if (feeStructure || followUpPolicy || cancellationPolicy) {
        // Silently loaded - no need to show success for data fetch
      }
    } catch (error: any) {
      // If no data exists or there's an error, use defaults (this is expected for new clinic)
      // Don't show error toast for 404s (no data exists yet)
      const status = error?.status ?? error?.response?.status
      if (status !== 404) {
        console.error("Failed to fetch fee structure data:", error)
        // Only show error for non-404 errors (server errors, network issues, etc.)
        const errorMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.response?.data?.detail ||
          error?.message ||
          "Failed to load fee structure data. Please try again."
        toast.error(errorMessage, { duration: 4000 })
      }
      // CRITICAL: Only reset to defaults if:
      // 1. It's a 404 (no data exists yet) AND we don't have existing data in state
      // 2. It's a real error (not 404) AND we don't have existing data in state
      // DO NOT reset if we have existing data - preserve it!
      const hasExistingData = feeStructureId || followUpPolicyId || cancellationPolicyId
      if (!hasExistingData) {
        resetToDefaults()
      } else {
        console.warn("⚠️ Fetch failed but existing data found in state. Preserving current state to avoid data loss.")
      }
    } finally {
      setIsFetching(false)
    }
  }

  const resetToDefaults = () => {
    const defaults: FeeStructureData = {
      first_time_consultation_fee: "1000",
      follow_up_fee: "500",
      case_paper_duration: "7",
      case_paper_renewal_fee: "200",
      emergency_consultation_fee: "0",
      online_consultation_fee: "0",
      cancellation_fee: "0",
      rescheduling_fee: "0",
      night_consultation_fee: "0",
      night_hours_start: "21:00",
      night_hours_end: "07:00",
      is_active: true,
      follow_up_duration: "7",
      max_follow_up_visits: "1",
      allow_online_follow_up: true,
      online_follow_up_fee: "0",
      allow_free_follow_up: false,
      free_follow_up_days: "3",
      auto_apply_case_paper: true,
      access_past_appointments: true,
      access_past_prescriptions: true,
      access_past_reports: true,
      access_other_clinic_history: false,
      allow_cancellation: true,
      cancellation_window_hours: "6",
      allow_refund: false,
      refund_percentage: "0",
    }
    setFeeData(defaults)
    setOriginalData({ ...defaults })
    setFeeStructureId(null)
    setFollowUpPolicyId(null)
    setCancellationPolicyId(null)
  }

  const handleEdit = () => {
    if (!selectedClinicId) {
      toast.error("No clinic associated. Please add a clinic first.")
      return
    }
    setOriginalData({ ...feeData })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setFeeData({ ...originalData })
    setIsEditing(false)
  }

  const handleSave = async () => {
    
    if (!selectedClinicId) {
      toast.error("No clinic associated. Please add a clinic association first to manage fee structures.")
      return
    }

    // Validate required fields
    if (!feeData.first_time_consultation_fee || parseFloat(feeData.first_time_consultation_fee) <= 0) {
      toast.error("First consultation fee is required and must be greater than 0")
      return
    }

    if (!feeData.follow_up_fee || parseFloat(feeData.follow_up_fee) < 0) {
      toast.error("Follow-up fee is required")
      return
    }

    if (!feeData.case_paper_duration || parseInt(feeData.case_paper_duration) <= 0) {
      toast.error("Case paper validity duration is required and must be greater than 0")
      return
    }

    if (!feeData.follow_up_duration || parseInt(feeData.follow_up_duration) <= 0) {
      toast.error("Follow-up validity duration is required and must be greater than 0")
      return
    }

    if (!feeData.max_follow_up_visits || parseInt(feeData.max_follow_up_visits) <= 0) {
      toast.error("Maximum follow-up visits is required and must be greater than 0")
      return
    }

    // If doctorId is not available, try to fetch it first
    let currentDoctorId = doctorId
    if (!currentDoctorId) {
      console.warn("Doctor ID not available, attempting to fetch...")
      try {
        const profileResponse = await apiClient.getProfile()
        const profile = profileResponse?.doctor_profile || profileResponse
        currentDoctorId = 
          profile?.personal_info?.id || 
          profile?.id || 
          profile?.doctor_id || 
          profile?.personal_info?.doctor_id ||
          profileResponse?.doctor_profile?.personal_info?.id ||
          profileResponse?.id ||
          profileResponse?.doctor_id
        
        if (currentDoctorId) {
          setDoctorId(currentDoctorId)
          localStorage.setItem("doctor_id", currentDoctorId)
        }
      } catch (error) {
        console.error("Failed to fetch doctor ID:", error)
        // Try localStorage as last resort
        const storedDoctorId = localStorage.getItem("doctor_id")
        if (storedDoctorId) {
          currentDoctorId = storedDoctorId
          setDoctorId(storedDoctorId)
        }
      }
      
      if (!currentDoctorId) {
        toast.error("Doctor information not available. Please refresh the page.")
        return
      }
    }

    
    // ALWAYS fetch existing records before save to ensure we update instead of creating duplicates
    // This is critical to prevent unique constraint errors
    let currentFeeStructureId = feeStructureId
    let currentFollowUpPolicyId = followUpPolicyId
    let currentCancellationPolicyId = cancellationPolicyId
    
    try {
      const [feeStructures, followUpPolicies, cancellationPolicies] = await Promise.allSettled([
        apiClient.getFeeStructures(selectedClinicId, currentDoctorId ?? undefined),
        apiClient.getFollowUpPolicies(selectedClinicId, currentDoctorId ?? undefined),
        apiClient.getCancellationPolicies(selectedClinicId, currentDoctorId ?? undefined),
      ])
      
      // Extract and set IDs if found - ALWAYS use fetched IDs if they exist (overrides state)
      // Since we're filtering by both doctor_id and clinic_id, we should get exactly one record (or empty array)
      
      // Fee Structure
      if (feeStructures.status === 'fulfilled') {
        const response = feeStructures.value
        
        // Django returns: { status: "success", message: "...", data: [...] }
        // Next.js API route returns the same structure
        // apiRequest returns response.data, which is the Django response object
        let feeData: any[] = []
        if (Array.isArray(response)) {
          feeData = response
        } else if (response?.data && Array.isArray(response.data)) {
          feeData = response.data
        } else if (response?.data && !Array.isArray(response.data)) {
          // Single object wrapped in data
          feeData = [response.data]
        } else {
          console.warn("⚠️ Fee Structure: Could not extract data from response structure:", {
            response,
            hasData: !!response?.data,
            dataType: response?.data ? typeof response?.data : 'undefined',
            isDataArray: Array.isArray(response?.data)
          })
        }
        
        
        if (feeData.length > 0) {
          const feeRecord = feeData[0] // First (and only) record
          
          if (feeRecord?.id) {
            currentFeeStructureId = feeRecord.id
            setFeeStructureId(feeRecord.id)
          } else {
            console.error("❌ Fee structure record found but no ID! Record:", feeRecord)
            console.error("❌ This means the record exists but we can't update it. This is a CRITICAL issue!")
            currentFeeStructureId = null
            setFeeStructureId(null)
          }
        } else {
          currentFeeStructureId = null
          setFeeStructureId(null)
        }
      } else {
        const err = feeStructures.reason
        const errStatus = err?.status ?? err?.response?.status
        if (errStatus !== 404) {
          console.warn("⚠️ Failed to fetch fee structures:", {
            status: errStatus,
            message: err?.message,
            error: err
          })
        }
        // Don't fail - will try create/update anyway
        currentFeeStructureId = null
      }
      
      // Follow-up Policy
      if (followUpPolicies.status === 'fulfilled') {
        const response = followUpPolicies.value
        
        let followUpData: any[] = []
        if (Array.isArray(response)) {
          followUpData = response
        } else if (response?.data && Array.isArray(response.data)) {
          followUpData = response.data
        } else if (response?.data && !Array.isArray(response.data)) {
          followUpData = [response.data]
        } else {
          console.warn("⚠️ Follow-up Policy: Could not extract data from response structure:", {
            response,
            hasData: !!response?.data,
            dataType: response?.data ? typeof response?.data : 'undefined',
            isDataArray: Array.isArray(response?.data)
          })
        }
        
        
        if (followUpData.length > 0) {
          const followUpRecord = followUpData[0]
          
          if (followUpRecord?.id) {
            currentFollowUpPolicyId = followUpRecord.id
            setFollowUpPolicyId(followUpRecord.id)
          } else {
            console.error("❌ Follow-up policy record found but no ID! Record:", followUpRecord)
            console.error("❌ This means the record exists but we can't update it. This is a CRITICAL issue!")
            currentFollowUpPolicyId = null
            setFollowUpPolicyId(null)
          }
        } else {
          currentFollowUpPolicyId = null
          setFollowUpPolicyId(null)
        }
      } else {
        const err = followUpPolicies.reason
        console.warn("⚠️ Failed to fetch follow-up policies:", {
          status: err?.response?.status || err?.status,
          message: err?.message,
          error: err
        })
        // Don't fail - will try create/update anyway
        currentFollowUpPolicyId = null
      }
      
      // Cancellation Policy
      if (cancellationPolicies.status === 'fulfilled') {
        const response = cancellationPolicies.value
        
        let cancellationData: any[] = []
        if (Array.isArray(response)) {
          cancellationData = response
        } else if (response?.data && Array.isArray(response.data)) {
          cancellationData = response.data
        } else if (response?.data && !Array.isArray(response.data)) {
          cancellationData = [response.data]
        } else {
          console.warn("⚠️ Cancellation Policy: Could not extract data from response structure:", {
            response,
            hasData: !!response?.data,
            dataType: response?.data ? typeof response?.data : 'undefined',
            isDataArray: Array.isArray(response?.data)
          })
        }
        
        
        if (cancellationData.length > 0) {
          const cancellationRecord = cancellationData[0]
          
          if (cancellationRecord?.id) {
            currentCancellationPolicyId = cancellationRecord.id
            setCancellationPolicyId(cancellationRecord.id)
          } else {
            console.error("❌ Cancellation policy record found but no ID! Record:", cancellationRecord)
            console.error("❌ This means the record exists but we can't update it. This is a CRITICAL issue!")
            currentCancellationPolicyId = null
            setCancellationPolicyId(null)
          }
        } else {
          currentCancellationPolicyId = null
          setCancellationPolicyId(null)
        }
      } else {
        const err = cancellationPolicies.reason
        console.warn("⚠️ Failed to fetch cancellation policies:", {
          status: err?.response?.status || err?.status,
          message: err?.message,
          error: err
        })
        // Don't fail - will try create/update anyway
        currentCancellationPolicyId = null
      }
      
      
      // CRITICAL: If any ID is missing but records exist, we MUST fetch them
      // This prevents duplicate creation attempts
      if (!currentFeeStructureId || !currentFollowUpPolicyId || !currentCancellationPolicyId) {
        console.warn("⚠️ Some IDs are missing! This might cause duplicate creation. IDs:", {
          feeStructure: currentFeeStructureId,
          followUp: currentFollowUpPolicyId,
          cancellation: currentCancellationPolicyId
        })
      }
    } catch (fetchError: any) {
      console.error("❌ Error pre-fetching existing records:", fetchError)
      // Don't fail - will try create/update anyway, and createOrUpdate will handle unique constraint
      // Continue to save operation
    }

    setIsLoading(true)
    try {
      // Prepare data for backend (convert strings to numbers where needed)
      // Include doctor ID for create operations only (when ID doesn't exist)
      // Use currentFeeStructureId (from pre-fetch) not feeStructureId (from state)
      const feeStructurePayload = {
        ...(currentFeeStructureId ? {} : { doctor: currentDoctorId }), // Only include doctor for create
        clinic: selectedClinicId,
        first_time_consultation_fee: parseFloat(feeData.first_time_consultation_fee) || 0,
        follow_up_fee: parseFloat(feeData.follow_up_fee) || 0,
        case_paper_duration: parseInt(feeData.case_paper_duration) || 0,
        case_paper_renewal_fee: parseFloat(feeData.case_paper_renewal_fee) || 0,
        emergency_consultation_fee: parseFloat(feeData.emergency_consultation_fee) || 0,
        online_consultation_fee: parseFloat(feeData.online_consultation_fee) || 0,
        cancellation_fee: parseFloat(feeData.cancellation_fee) || 0,
        rescheduling_fee: parseFloat(feeData.rescheduling_fee) || 0,
        night_consultation_fee: parseFloat(feeData.night_consultation_fee) || 0,
        night_hours_start: feeData.night_hours_start || null,
        night_hours_end: feeData.night_hours_end || null,
        is_active: feeData.is_active,
      }

      const followUpPolicyPayload = {
        ...(currentFollowUpPolicyId ? {} : { doctor: currentDoctorId }), // Only include doctor for create
        clinic: selectedClinicId,
        follow_up_duration: parseInt(feeData.follow_up_duration) || 0,
        follow_up_fee: parseFloat(feeData.follow_up_fee) || 0, // Required field - was missing!
        max_follow_up_visits: parseInt(feeData.max_follow_up_visits) || 1,
        allow_online_follow_up: feeData.allow_online_follow_up,
        online_follow_up_fee: parseFloat(feeData.online_follow_up_fee) || 0,
        allow_free_follow_up: feeData.allow_free_follow_up,
        free_follow_up_days: feeData.allow_free_follow_up ? (parseInt(feeData.free_follow_up_days) || null) : null,
        auto_apply_case_paper: feeData.auto_apply_case_paper,
        access_past_appointments: feeData.access_past_appointments,
        access_past_prescriptions: feeData.access_past_prescriptions,
        access_past_reports: feeData.access_past_reports,
        access_other_clinic_history: feeData.access_other_clinic_history,
      }

      const cancellationPolicyPayload = {
        ...(currentCancellationPolicyId ? {} : { doctor: currentDoctorId }), // Only include doctor for create
        clinic: selectedClinicId,
        allow_cancellation: feeData.allow_cancellation,
        cancellation_window_hours: parseInt(feeData.cancellation_window_hours) || 0,
        cancellation_fee: parseFloat(feeData.cancellation_fee) || 0,
        allow_refund: feeData.allow_refund,
        refund_percentage: feeData.allow_refund ? (parseInt(feeData.refund_percentage) || 0) : 0,
        rescheduling_fee: parseFloat(feeData.rescheduling_fee) || 0,
        is_active: feeData.is_active,
      }

      // Create or update all three models with better error handling
      // Use PATCH for updates (partial updates) instead of PUT
      // If create fails with unique constraint, retry with update
      
      // Helper function to handle create/update with retry on unique constraint
      const createOrUpdate = async (
        createFn: () => Promise<any>,
        updateFn: () => Promise<any>,
        id: string | null,
        name: string,
        fetchFn?: () => Promise<any> // Optional: function to fetch existing record
      ) => {
        
        if (id) {
          // ID exists, use PATCH to update existing record
          return updateFn()
        } else {
          // No ID found - but records might exist! Try to fetch one more time before creating
          
          // Final check: try to fetch existing record before attempting POST
          if (fetchFn) {
            try {
              const finalCheck = await fetchFn()
              const finalData = finalCheck?.data || (Array.isArray(finalCheck) ? finalCheck : [])
              const finalRecord = Array.isArray(finalData) && finalData.length > 0 ? finalData[0] : null
              
              if (finalRecord?.id) {
                // Update the ID in state for future use
                if (name === "Fee Structure") {
                  setFeeStructureId(finalRecord.id)
                  return apiClient.patchFeeStructure(finalRecord.id, feeStructurePayload)
                } else if (name === "Follow-up Policy") {
                  setFollowUpPolicyId(finalRecord.id)
                  return apiClient.patchFollowUpPolicy(finalRecord.id, followUpPolicyPayload)
                } else if (name === "Cancellation Policy") {
                  setCancellationPolicyId(finalRecord.id)
                  return apiClient.patchCancellationPolicy(finalRecord.id, cancellationPolicyPayload)
                }
              } else {
              }
            } catch (fetchError: any) {
              console.warn(`${name}: Final fetch check failed, will try POST (unique constraint retry will handle if record exists):`, fetchError)
              // Continue to POST attempt - unique constraint retry will handle it
            }
          }
          
          // No ID and final check didn't find record - try to create new record
          try {
            return await createFn()
          } catch (error: any) {
            // If unique constraint error, fetch existing record and update
            // Try multiple ways to extract error data (APIError, axios error, etc.)
            // APIError structure: { message, status, errors: { non_field_errors: [...] } }
            // Axios error structure: { response: { data: { non_field_errors: [...] } } }
            const errorData = 
              error?.errors ||           // APIError.errors property (contains the data object)
              error?.response?.data ||   // Axios error response data
              error?.data ||             // Direct data property
              {}
            
            const errorMessage = 
              error?.message || 
              errorData?.message || 
              errorData?.detail || 
              errorData?.error ||
              ""
            
            // Extract non_field_errors from multiple possible locations
            // For APIError: error.errors.non_field_errors
            // For Axios: error.response.data.non_field_errors
            const nonFieldErrors = 
              errorData?.non_field_errors ||           // Direct non_field_errors (most common)
              (error?.errors && typeof error.errors === 'object' && error.errors.non_field_errors) ||  // APIError.errors.non_field_errors
              errorData?.errors?.non_field_errors ||  // Nested in errors object
              (Array.isArray(errorData) ? errorData : []) ||
              []
            
            
            // Check if this is a unique constraint error - check all possible locations
            const errorString = JSON.stringify(errorData).toLowerCase()
            const messageString = (errorMessage || "").toLowerCase()
            
            // Check for unique constraint error in multiple ways
            const hasUniqueInNonFieldErrors = Array.isArray(nonFieldErrors) && nonFieldErrors.length > 0 && 
              nonFieldErrors.some((msg: any) => 
                typeof msg === 'string' && (
                  msg.toLowerCase().includes("unique") || 
                  msg.toLowerCase().includes("already exists") ||
                  msg.includes("must make a unique set")
                )
              )
            
            const hasUniqueInMessage = messageString.includes("unique") ||
              messageString.includes("already exists") ||
              messageString.includes("must make a unique set")
            
            const hasUniqueInErrorString = errorString.includes("unique") && 
              (errorString.includes("must make a unique set") || errorString.includes("already exists"))
            
            // Check APIError.errors.non_field_errors directly
            const apiErrorNonFieldErrors = error?.errors && typeof error.errors === 'object' && 
              error.errors.non_field_errors &&
              Array.isArray(error.errors.non_field_errors) &&
              error.errors.non_field_errors.some((msg: any) => 
                typeof msg === 'string' && (
                  msg.includes("must make a unique set") ||
                  msg.toLowerCase().includes("unique") ||
                  msg.toLowerCase().includes("already exists")
                )
              )
            
            // Also check if status is 400 and error string contains unique constraint
            const is400WithUnique = error?.status === 400 && (
              errorString.includes("must make a unique set") ||
              (errorString.includes("unique") && errorString.includes("doctor") && errorString.includes("clinic"))
            )
            
            const isUniqueError = hasUniqueInNonFieldErrors || hasUniqueInMessage || hasUniqueInErrorString || apiErrorNonFieldErrors || is400WithUnique
            
            
            if (isUniqueError) {
              // Fetch existing records to get IDs
              try {
                let existing: any = null
                let existingRecord: any = null
                
                // Fetch by both doctor_id and clinic_id to get the exact record
                // Since there's only one record per doctor-clinic combination
                if (name === "Fee Structure") {
                  try {
                    // Fetch using both doctor_id and clinic_id for precise matching
                    existing = await apiClient.getFeeStructures(selectedClinicId, currentDoctorId ?? undefined)
                    const existingData = existing?.data || existing
                    // Should return array with one record (or empty if not found)
                    if (Array.isArray(existingData) && existingData.length > 0) {
                      existingRecord = existingData[0] // Get first (and only) record
                    } else if (existingData && !Array.isArray(existingData)) {
                      existingRecord = existingData
                    }
                    if (existingRecord?.id) {
                      setFeeStructureId(existingRecord.id)
                      const patchResult = await apiClient.patchFeeStructure(existingRecord.id, feeStructurePayload)
                      return patchResult
                    } else {
                      console.warn(`${name}: No record found with doctor_id=${currentDoctorId} and clinic_id=${selectedClinicId}`, {
                        existing,
                        existingData,
                        existingRecord
                      })
                      throw new Error(`${name} record exists but could not be retrieved. Please refresh the page.`)
                    }
                  } catch (fetchErr: any) {
                    console.error(`Failed to fetch ${name} by doctor+clinic:`, fetchErr)
                    throw new Error(`${name} already exists but could not be retrieved. Please refresh the page and try again.`)
                  }
                } else if (name === "Follow-up Policy") {
                  try {
                    existing = await apiClient.getFollowUpPolicies(selectedClinicId, currentDoctorId ?? undefined)
                    const existingData = existing?.data || existing
                    if (Array.isArray(existingData) && existingData.length > 0) {
                      existingRecord = existingData[0]
                    } else if (existingData && !Array.isArray(existingData)) {
                      existingRecord = existingData
                    }
                    if (existingRecord?.id) {
                      setFollowUpPolicyId(existingRecord.id)
                      const patchResult = await apiClient.patchFollowUpPolicy(existingRecord.id, followUpPolicyPayload)
                      return patchResult
                    } else {
                      console.warn(`${name}: No record found with doctor_id=${currentDoctorId} and clinic_id=${selectedClinicId}`, {
                        existing,
                        existingData,
                        existingRecord
                      })
                      throw new Error(`${name} record exists but could not be retrieved. Please refresh the page.`)
                    }
                  } catch (fetchErr: any) {
                    console.error(`Failed to fetch ${name} by doctor+clinic:`, fetchErr)
                    throw new Error(`${name} already exists but could not be retrieved. Please refresh the page and try again.`)
                  }
                } else if (name === "Cancellation Policy") {
                  try {
                    existing = await apiClient.getCancellationPolicies(selectedClinicId, currentDoctorId ?? undefined)
                    const existingData = existing?.data || existing
                    if (Array.isArray(existingData) && existingData.length > 0) {
                      existingRecord = existingData[0]
                    } else if (existingData && !Array.isArray(existingData)) {
                      existingRecord = existingData
                    }
                    if (existingRecord?.id) {
                      setCancellationPolicyId(existingRecord.id)
                      const patchResult = await apiClient.patchCancellationPolicy(existingRecord.id, cancellationPolicyPayload)
                      return patchResult
                    } else {
                      console.warn(`${name}: No record found with doctor_id=${currentDoctorId} and clinic_id=${selectedClinicId}`, {
                        existing,
                        existingData,
                        existingRecord
                      })
                      throw new Error(`${name} record exists but could not be retrieved. Please refresh the page.`)
                    }
                  } catch (fetchErr: any) {
                    console.error(`Failed to fetch ${name} by doctor+clinic:`, fetchErr)
                    throw new Error(`${name} already exists but could not be retrieved. Please refresh the page and try again.`)
                  }
                }
              } catch (fetchError: any) {
                console.error(`Failed to fetch existing ${name}:`, fetchError)
                // If we can't fetch, re-throw the original unique constraint error with better message
                const originalMsg = errorMessage || "Record already exists"
                throw new Error(`${name}: ${originalMsg}. Please refresh the page and try again.`)
              }
            }
            throw error // Re-throw if not unique constraint error
          }
        }
      }
      
      const results = await Promise.allSettled([
        // Fee Structure
        createOrUpdate(
          () => apiClient.createFeeStructure(feeStructurePayload),
          () => apiClient.patchFeeStructure(currentFeeStructureId!, feeStructurePayload),
          currentFeeStructureId,
          "Fee Structure",
          () => apiClient.getFeeStructures(selectedClinicId, currentDoctorId ?? undefined) // Final fetch check before POST
        ),
        // Follow-up Policy
        createOrUpdate(
          () => apiClient.createFollowUpPolicy(followUpPolicyPayload),
          () => apiClient.patchFollowUpPolicy(currentFollowUpPolicyId!, followUpPolicyPayload),
          currentFollowUpPolicyId,
          "Follow-up Policy",
          () => apiClient.getFollowUpPolicies(selectedClinicId, currentDoctorId ?? undefined) // Final fetch check before POST
        ),
        // Cancellation Policy
        createOrUpdate(
          () => apiClient.createCancellationPolicy(cancellationPolicyPayload),
          () => apiClient.patchCancellationPolicy(currentCancellationPolicyId!, cancellationPolicyPayload),
          currentCancellationPolicyId,
          "Cancellation Policy",
          () => apiClient.getCancellationPolicies(selectedClinicId, currentDoctorId ?? undefined) // Final fetch check before POST
        ),
      ])
      

      // Check for failures
      const failures: string[] = []
      const errorMessages: string[] = []
      
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const names = ["Fee Structure", "Follow-up Policy", "Cancellation Policy"]
          failures.push(names[index])
          
          const error = result.reason
          const errorData = error?.response?.data || {}
          let errorMsg = 
            errorData.non_field_errors?.[0] ||
            errorData.detail ||
            errorData.message ||
            errorData.error ||
            error?.message ||
            "Unknown error"
          
          // Format field-specific errors
          if (errorData && typeof errorData === 'object' && !errorData.non_field_errors) {
            const fieldErrors = Object.entries(errorData)
              .map(([field, messages]: [string, any]) => {
                const msg = Array.isArray(messages) ? messages[0] : messages
                return `${field}: ${msg}`
              })
              .join(", ")
            if (fieldErrors) errorMsg = fieldErrors
          }
          
          errorMessages.push(errorMsg)
        }
      })

      if (failures.length > 0) {
        // Some operations failed
        const errorDetails = failures.join(", ")
        const combinedErrorMsg = errorMessages.join("; ")
        
        toast.error(`Failed to save ${errorDetails}. ${combinedErrorMsg}`, { duration: 5000 })
        throw new Error(`Failed to save: ${errorDetails}`)
      }

      // All operations succeeded
      // Refresh data to get updated records with latest values from database
      
      // Force a fresh fetch by clearing any cached state
      // Wait a bit to ensure database has committed the changes
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await fetchFeeStructureData()
      
      // Double-check: verify the state was actually updated
      
      // NOTE: fetchFeeStructureData() already sets both feeData and originalData from fresh database data
      // So we don't need to set originalData here - it would use stale feeData anyway

      toast.success("Fee structure and policies saved successfully!", { duration: 2500 })
      setIsEditing(false)
    } catch (error: any) {
      console.error("Failed to save fee structure:", error)
      
      // Extract detailed error message
      let errorMessage = "Failed to save fee structure and policies"
      
      if (error?.response?.data) {
        const data = error.response.data
        
        // Handle validation errors
        if (data.errors && typeof data.errors === 'object') {
          const fieldErrors = Object.entries(data.errors)
            .map(([field, messages]: [string, any]) => {
              const msg = Array.isArray(messages) ? messages[0] : messages
              return `${field}: ${msg}`
            })
            .join(", ")
          errorMessage = `Validation errors: ${fieldErrors}`
        } else if (data.detail) {
          errorMessage = data.detail
        } else if (data.message) {
          errorMessage = data.message
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        } else if (typeof data === 'string') {
          errorMessage = data
        }
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, { duration: 4000 })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedClinicId) {
      toast.error("No clinic associated. Cannot delete fee structure.")
      return
    }

    if (!hasExistingData) {
      toast.error("No fee structure data to delete.")
      return
    }

    if (!confirm("Are you sure you want to delete the fee structure and all policies for this clinic? This action cannot be undone.")) {
      return
    }

    setIsLoading(true)
    try {
      // Delete all three models with better error handling
      const deletePromises = []
      const deleteLabels: string[] = []

      if (feeStructureId) {
        deletePromises.push(apiClient.deleteFeeStructure(feeStructureId))
        deleteLabels.push("Fee Structure")
      }
      if (followUpPolicyId) {
        deletePromises.push(apiClient.deleteFollowUpPolicy(followUpPolicyId))
        deleteLabels.push("Follow-up Policy")
      }
      if (cancellationPolicyId) {
        deletePromises.push(apiClient.deleteCancellationPolicy(cancellationPolicyId))
        deleteLabels.push("Cancellation Policy")
      }

      if (deletePromises.length === 0) {
        toast.error("No data found to delete.")
        return
      }

      const results = await Promise.allSettled(deletePromises)

      // Check for failures
      const failures: string[] = []
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failures.push(deleteLabels[index])
        }
      })

      if (failures.length > 0) {
        // Some deletions failed
        const errorDetails = failures.join(", ")
        const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult
        const errorMessage =
          firstError?.reason?.response?.data?.message ||
          firstError?.reason?.response?.data?.error ||
          firstError?.reason?.message ||
          "Some deletions failed"
        
        toast.error(`Failed to delete ${errorDetails}. ${errorMessage}`, { duration: 4000 })
        throw new Error(`Failed to delete: ${errorDetails}`)
      }

      // All deletions succeeded
      toast.success("Fee structure and policies deleted successfully.", { duration: 2500 })
      resetToDefaults()
      setIsEditing(false)
    } catch (error: any) {
      console.error("Failed to delete fee structure:", error)
      
      // Extract detailed error message
      let errorMessage = "Failed to delete fee structure and policies"
      
      if (error?.response?.data) {
        const data = error.response.data
        if (data.detail) {
          errorMessage = data.detail
        } else if (data.message) {
          errorMessage = data.message
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        }
      } else if (error?.message && !error.message.includes("Failed to delete:")) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, { duration: 4000 })
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = (field: keyof FeeStructureData, value: string | boolean) => {
    setFeeData({ ...feeData, [field]: value })
  }

  // Helper to check if emergency consultation is enabled
  const isEmergencyEnabled = parseFloat(feeData.emergency_consultation_fee) > 0

  // Helper to check if online consultation is enabled
  const isOnlineEnabled = parseFloat(feeData.online_consultation_fee) > 0

  // Helper to check if night consultation is enabled
  const isNightEnabled = parseFloat(feeData.night_consultation_fee) > 0

  const hasExistingData = feeStructureId || followUpPolicyId || cancellationPolicyId

  return (
    <SimpleFormCard
      key={refreshKey} // Force re-render when data is refreshed
      title="Fee Structure & Policies"
      description="Manage your consultation fees and policies"
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={isLoading}
    >
      <div className="space-y-6" key={`content-${refreshKey}`}>
        {isFetching && (
          <div className="text-center py-4 text-sm text-muted-foreground">Loading fee structure data...</div>
        )}

        {!selectedClinicId && !isFetching && (
          <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg p-4">
            <p>No clinic associated with your profile.</p>
            <p className="mt-2">Please add a clinic association first to manage fee structures.</p>
          </div>
        )}

        {selectedClinicId && !isFetching && (
          <>
            {hasExistingData && (
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isLoading || isEditing}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Fee Structure
                </Button>
              </div>
            )}

            <div className="space-y-8">
              {/* SECTION 1: Consultation Fees (Core OPD) */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold mb-1">Consultation Fees</h3>
                  <p className="text-sm text-muted-foreground">Core OPD fees and case paper rules</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-consultation-fee">First Consultation Fee (₹) *</Label>
                    <Input
                      id="first-consultation-fee"
                      type="number"
                      step="1"
                      min="0"
                      value={feeData.first_time_consultation_fee}
                      onChange={(e) => updateField("first_time_consultation_fee", e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="follow-up-fee">Follow-up Fee (₹) *</Label>
                    <Input
                      id="follow-up-fee"
                      type="number"
                      step="1"
                      min="0"
                      value={feeData.follow_up_fee}
                      onChange={(e) => updateField("follow_up_fee", e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="case-paper-duration">Case Paper Validity (days) *</Label>
                    <Input
                      id="case-paper-duration"
                      type="number"
                      min="1"
                      value={feeData.case_paper_duration}
                      onChange={(e) => updateField("case_paper_duration", e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Follow-up allowed within this duration</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="case-paper-renewal-fee">Case Paper Renewal Fee (₹) *</Label>
                    <Input
                      id="case-paper-renewal-fee"
                      type="number"
                      step="1"
                      min="0"
                      value={feeData.case_paper_renewal_fee}
                      onChange={(e) => updateField("case_paper_renewal_fee", e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* SECTION 2: Additional Consultation Types */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold mb-1">Additional Consultation Types</h3>
                  <p className="text-sm text-muted-foreground">Optional consultation fees</p>
                </div>

                <div className="space-y-4">
                  {/* Emergency Consultation */}
                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="pt-1">
                      <Switch
                        checked={isEmergencyEnabled}
                        onCheckedChange={(checked) =>
                          updateField("emergency_consultation_fee", checked ? "2000" : "0")
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="emergency-fee" className="font-normal cursor-pointer">
                          Emergency Consultation
                        </Label>
                      </div>
                      {isEmergencyEnabled && (
                        <Input
                          id="emergency-fee"
                          type="number"
                          step="1"
                          min="0"
                          value={feeData.emergency_consultation_fee}
                          onChange={(e) => updateField("emergency_consultation_fee", e.target.value)}
                          disabled={!isEditing}
                          placeholder="Enter fee"
                        />
                      )}
                    </div>
                  </div>

                  {/* Online Consultation */}
                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="pt-1">
                      <Switch
                        checked={isOnlineEnabled}
                        onCheckedChange={(checked) =>
                          updateField("online_consultation_fee", checked ? "800" : "0")
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="online-fee" className="font-normal cursor-pointer">
                          Online Consultation
                        </Label>
                      </div>
                      {isOnlineEnabled && (
                        <Input
                          id="online-fee"
                          type="number"
                          step="1"
                          min="0"
                          value={feeData.online_consultation_fee}
                          onChange={(e) => updateField("online_consultation_fee", e.target.value)}
                          disabled={!isEditing}
                          placeholder="Enter fee"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* SECTION 3: Night / Time-Based Fee */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold mb-1">Night / Time-Based Fee</h3>
                  <p className="text-sm text-muted-foreground">Late-night consultation charges</p>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="pt-1">
                    <Switch
                      checked={isNightEnabled}
                      onCheckedChange={(checked) =>
                        updateField("night_consultation_fee", checked ? "300" : "0")
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <Label className="font-normal cursor-pointer">Enable Night Consultation Charges</Label>
                    </div>
                    {isNightEnabled && (
                      <div className="space-y-4 pl-0">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="night-start">Night Time From</Label>
                            <Input
                              id="night-start"
                              type="time"
                              value={feeData.night_hours_start}
                              onChange={(e) => updateField("night_hours_start", e.target.value)}
                              disabled={!isEditing}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="night-end">Night Time To</Label>
                            <Input
                              id="night-end"
                              type="time"
                              value={feeData.night_hours_end}
                              onChange={(e) => updateField("night_hours_end", e.target.value)}
                              disabled={!isEditing}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="night-fee">Night Consultation Fee (₹)</Label>
                          <Input
                            id="night-fee"
                            type="number"
                            step="1"
                            min="0"
                            value={feeData.night_consultation_fee}
                            onChange={(e) => updateField("night_consultation_fee", e.target.value)}
                            disabled={!isEditing}
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* SECTION 4: Follow-up Policy */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold mb-1">Follow-up Policy</h3>
                  <p className="text-sm text-muted-foreground">Follow-up rules and patient history access</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="follow-up-duration">Follow-up Validity (days) *</Label>
                    <Input
                      id="follow-up-duration"
                      type="number"
                      min="1"
                      value={feeData.follow_up_duration}
                      onChange={(e) => updateField("follow_up_duration", e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-follow-up-visits">Max Follow-up Visits *</Label>
                    <Input
                      id="max-follow-up-visits"
                      type="number"
                      min="1"
                      value={feeData.max_follow_up_visits}
                      onChange={(e) => updateField("max_follow_up_visits", e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                </div>

                {/* Free Follow-up Sub-section */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={feeData.allow_free_follow_up}
                      onCheckedChange={(checked) => updateField("allow_free_follow_up", checked)}
                      disabled={!isEditing}
                    />
                    <Label className="font-normal cursor-pointer">Allow Free Follow-up</Label>
                  </div>
                  {feeData.allow_free_follow_up && (
                    <div className="space-y-2 pl-0">
                      <Label htmlFor="free-follow-up-days">Free within (days)</Label>
                      <Input
                        id="free-follow-up-days"
                        type="number"
                        min="1"
                        value={feeData.free_follow_up_days}
                        onChange={(e) => updateField("free_follow_up_days", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  )}
                </div>

                {/* Online Follow-up Sub-section */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={feeData.allow_online_follow_up}
                      onCheckedChange={(checked) => updateField("allow_online_follow_up", checked)}
                      disabled={!isEditing}
                    />
                    <Label className="font-normal cursor-pointer">Allow Online Follow-up</Label>
                  </div>
                  {feeData.allow_online_follow_up && (
                    <div className="space-y-2 pl-0">
                      <Label htmlFor="online-follow-up-fee">Online Follow-up Fee (₹)</Label>
                      <Input
                        id="online-follow-up-fee"
                        type="number"
                        step="1"
                        min="0"
                        value={feeData.online_follow_up_fee}
                        onChange={(e) => updateField("online_follow_up_fee", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  )}
                </div>

                {/* Case Paper Logic */}
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Switch
                    checked={feeData.auto_apply_case_paper}
                    onCheckedChange={(checked) => updateField("auto_apply_case_paper", checked)}
                    disabled={!isEditing}
                  />
                  <Label className="font-normal cursor-pointer">Auto apply case paper validity</Label>
                </div>

                {/* Patient History Access Sub-section */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <Label className="text-sm font-medium">Patient History Access</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={feeData.access_past_appointments}
                        onCheckedChange={(checked) =>
                          updateField("access_past_appointments", checked as boolean)
                        }
                        disabled={!isEditing}
                      />
                      <Label className="font-normal cursor-pointer">Past Appointments</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={feeData.access_past_prescriptions}
                        onCheckedChange={(checked) =>
                          updateField("access_past_prescriptions", checked as boolean)
                        }
                        disabled={!isEditing}
                      />
                      <Label className="font-normal cursor-pointer">Past Prescriptions</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={feeData.access_past_reports}
                        onCheckedChange={(checked) => updateField("access_past_reports", checked as boolean)}
                        disabled={!isEditing}
                      />
                      <Label className="font-normal cursor-pointer">Past Reports</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={feeData.access_other_clinic_history}
                        onCheckedChange={(checked) =>
                          updateField("access_other_clinic_history", checked as boolean)
                        }
                        disabled={!isEditing}
                      />
                      <Label className="font-normal cursor-pointer">Other Clinic History</Label>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* SECTION 5: Cancellation & Refund Policy */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold mb-1">Cancellation & Refund Policy</h3>
                  <p className="text-sm text-muted-foreground">Cancellation rules and refund policies</p>
                </div>

                {/* Cancellation Policy */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={feeData.allow_cancellation}
                      onCheckedChange={(checked) => updateField("allow_cancellation", checked)}
                      disabled={!isEditing}
                    />
                    <Label className="font-normal cursor-pointer">Allow Cancellation</Label>
                  </div>
                  {feeData.allow_cancellation && (
                    <div className="space-y-4 pl-0">
                      <div className="space-y-2">
                        <Label htmlFor="cancellation-window">Cancellation allowed before (hours)</Label>
                        <Input
                          id="cancellation-window"
                          type="number"
                          min="0"
                          value={feeData.cancellation_window_hours}
                          onChange={(e) => updateField("cancellation_window_hours", e.target.value)}
                          disabled={!isEditing}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cancellation-fee">Cancellation Fee (₹)</Label>
                        <Input
                          id="cancellation-fee"
                          type="number"
                          step="1"
                          min="0"
                          value={feeData.cancellation_fee}
                          onChange={(e) => updateField("cancellation_fee", e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Refund Policy Sub-section */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={feeData.allow_refund}
                      onCheckedChange={(checked) => updateField("allow_refund", checked)}
                      disabled={!isEditing}
                    />
                    <Label className="font-normal cursor-pointer">Allow Refund</Label>
                  </div>
                  {feeData.allow_refund && (
                    <div className="space-y-2 pl-0">
                      <Label htmlFor="refund-percentage">Refund Percentage (%)</Label>
                      <Input
                        id="refund-percentage"
                        type="number"
                        min="0"
                        max="100"
                        value={feeData.refund_percentage}
                        onChange={(e) => updateField("refund_percentage", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  )}
                </div>

                {/* Rescheduling Sub-section */}
                <div className="space-y-2 p-4 border rounded-lg">
                  <Label htmlFor="rescheduling-fee">Rescheduling Fee (₹)</Label>
                  <Input
                    id="rescheduling-fee"
                    type="number"
                    step="1"
                    min="0"
                    value={feeData.rescheduling_fee}
                    onChange={(e) => updateField("rescheduling_fee", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <Separator />

              {/* SECTION 6: Status */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold mb-1">Status</h3>
                  <p className="text-sm text-muted-foreground">Activate or deactivate fee structure</p>
                </div>
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Switch
                    checked={feeData.is_active}
                    onCheckedChange={(checked) => updateField("is_active", checked)}
                    disabled={!isEditing}
                  />
                  <Label className="font-normal cursor-pointer">Active for booking</Label>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SimpleFormCard>
  )
}
