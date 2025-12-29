"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import {
  Building,
  Globe,
  Mail,
  Phone,
  Clock,
  Calendar,
  Languages,
  PaintBucket,
  Upload,
  Save,
  RefreshCcw,
  Shield,
  Lock,
  Key,
  FileJson,
  Database,
  HardDrive,
  Info,
  Loader2,
} from "lucide-react"

// Indian states list
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
]

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
]

interface OperatingHours {
  day: string
  openTime: string
  closeTime: string
  closed: boolean
}

interface FormErrors {
  [key: string]: string
}

export default function SettingsPage() {
  const toast = useToastNotification()
  
  // Form state
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isApproved, setIsApproved] = useState(false) // Track if clinic is approved
  
  // Independent edit states for each section
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [isEditingContact, setIsEditingContact] = useState(false)
  const [isEditingOperatingHours, setIsEditingOperatingHours] = useState(false)
  const [isEditingEmergencyContact, setIsEditingEmergencyContact] = useState(false)
  
  // Store original data for cancel functionality - separate for each section
  const [originalBasicInfo, setOriginalBasicInfo] = useState<any>(null)
  const [originalAddress, setOriginalAddress] = useState<any>(null)
  const [originalContact, setOriginalContact] = useState<any>(null)
  const [originalOperatingHours, setOriginalOperatingHours] = useState<OperatingHours[]>([])
  const [originalEmergencyContact, setOriginalEmergencyContact] = useState<any>(null)
  
  // Basic Information
  const [clinicName, setClinicName] = useState("")
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [gstNumber, setGstNumber] = useState("")
  const [website, setWebsite] = useState("")
  
  // Address Details
  const [addressLine1, setAddressLine1] = useState("")
  const [addressLine2, setAddressLine2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [pincode, setPincode] = useState("")
  const [country, setCountry] = useState("India")
  
  // Contact Details
  const [email, setEmail] = useState("")
  const [primaryPhone, setPrimaryPhone] = useState("")
  const [secondaryPhone, setSecondaryPhone] = useState("")
  
  // Operating Hours
  const [operatingHours, setOperatingHours] = useState<OperatingHours[]>(
    DAYS_OF_WEEK.map(day => ({
      day: day.value,
      openTime: "09:00",
      closeTime: "18:00",
      closed: false,
    }))
  )
  
  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState("")
  const [emergencyPhone, setEmergencyPhone] = useState("")
  const [emergencyInstructions, setEmergencyInstructions] = useState("")
  
  // Load clinic data on mount
  useEffect(() => {
    loadClinicData()
  }, [])
  
  const loadClinicData = async () => {
    setIsLoading(true)
    try {
      // Get access token for authentication
      const accessToken = localStorage.getItem("access_token")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`
      }

      // Get clinic ID from localStorage or fetch from doctor's associated clinics
      let clinicId = localStorage.getItem("clinic_id") || ""
      
      // If clinic_id not in localStorage, fetch it from doctor's associated clinics
      if (!clinicId) {
        console.log("[Clinic Settings] No clinic_id in localStorage, fetching from doctor's clinics...")
        try {
          // Fetch doctor's associated clinics
          const clinicsResponse = await fetch("/api/doctor/profile/clinics", {
            method: "GET",
            headers,
          })
          
          if (clinicsResponse.ok) {
            const clinicsData = await clinicsResponse.json()
            const clinics = clinicsData?.data || clinicsData?.clinics || []
            
            console.log("[Clinic Settings] Doctor's clinics:", clinics)
            
            if (Array.isArray(clinics) && clinics.length > 0) {
              // If doctor has multiple clinics, use the first one
              // In the future, we could add a clinic selector
              const selectedClinic = clinics[0]
              
              // Try different possible structures for clinic_id
              clinicId = selectedClinic?.id || 
                        selectedClinic?.clinic_id || 
                        selectedClinic?.clinic?.id ||
                        selectedClinic?.clinic_id ||
                        (typeof selectedClinic === 'string' ? selectedClinic : null) || ""
              
              console.log("[Clinic Settings] Selected clinic:", {
                clinic: selectedClinic,
                extractedClinicId: clinicId,
                allKeys: selectedClinic ? Object.keys(selectedClinic) : [],
              })
              
              if (clinicId) {
                localStorage.setItem("clinic_id", clinicId)
                console.log("[Clinic Settings] Fetched clinic_id from doctor's clinics:", clinicId)
                
                // If multiple clinics, show info message
                if (clinics.length > 1) {
                  toast.info(`You are associated with ${clinics.length} clinics. Showing details for the first clinic.`, { duration: 4000 })
                }
              } else {
                console.error("[Clinic Settings] Could not extract clinic_id from clinic data:", selectedClinic)
                toast.error("Unable to extract clinic ID from your clinic associations. Please contact support.")
                setIsLoading(false)
                return
              }
            } else {
              console.warn("[Clinic Settings] Doctor has no associated clinics")
              toast.info("You are not associated with any clinic. Please contact support to associate with a clinic.")
              setIsLoading(false)
              return
            }
          } else {
            console.warn("[Clinic Settings] Failed to fetch doctor's clinics:", clinicsResponse.status)
          }
        } catch (clinicsError) {
          console.error("[Clinic Settings] Error fetching doctor's clinics:", clinicsError)
        }
      }

      // If still no clinic_id, show error
      if (!clinicId) {
        const role = localStorage.getItem("role") || ""
        if (role === "doctor") {
          toast.info("Unable to find clinic information. Please ensure you are associated with a clinic.")
        } else {
          toast.info("No clinic ID found. Please ensure you're logged in with a clinic account.")
        }
        setIsLoading(false)
        return
      }

      console.log("[Clinic Settings] Loading clinic data for clinic_id:", clinicId)
      
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`/api/clinic/${clinicId}?t=${Date.now()}`, {
        method: "GET",
        headers,
        cache: "no-store",
      })
      
      console.log("[Clinic Settings] API Response status:", response.status, response.ok)
      
      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (parseError) {
          console.error("Error parsing error response:", parseError)
          toast.error(`Failed to load clinic information (HTTP ${response.status})`)
          setIsLoading(false)
          return
        }
        
        const errorMessage = errorData.error || errorData.message || "Failed to load clinic information"
        
        // Don't show error for 404 if it's expected (new clinic)
        if (response.status === 404) {
          console.log("Clinic not found - may be a new clinic")
          setIsLoading(false)
          return
        }
        
        // Handle validation errors
        if (errorData.validationErrors && Object.keys(errorData.validationErrors).length > 0) {
          const validationMessages = Object.values(errorData.validationErrors)
            .flat()
            .join(", ")
          toast.error(`${errorMessage}: ${validationMessages}`, { duration: 6000 })
        } else {
          toast.error(errorMessage, { duration: 5000 })
        }
        
        setIsLoading(false)
        return
      }
      
      let data: any = {}
      try {
        data = await response.json()
        console.log("[Clinic Settings] Received data:", {
          hasClinic: !!data.clinic,
          hasAddress: !!data.address,
          hasOperatingHours: !!data.operating_hours,
          hasEmergencyContact: !!data.emergency_contact,
          clinicKeys: data.clinic ? Object.keys(data.clinic) : [],
          addressKeys: data.address ? Object.keys(data.address) : [],
        })
      } catch (parseError) {
        console.error("[Clinic Settings] Error parsing response:", parseError)
        toast.error("Received invalid response from server. Please try again.")
        setIsLoading(false)
        return
      }
      
      // Populate form with data - always set values even if empty to ensure form is initialized
      if (data.clinic) {
        console.log("[Clinic Settings] Populating clinic data:", {
          name: data.clinic.name,
          registration_number: data.clinic.registration_number,
          hasData: Object.keys(data.clinic).length > 0,
          allKeys: Object.keys(data.clinic),
        })
        
        // Always set these values, even if empty
        setClinicName(data.clinic.name || "")
        setRegistrationNumber(data.clinic.registration_number || "")
        setGstNumber(data.clinic.gst_number || "")
        setWebsite(data.clinic.website || "")
        setEmail(data.clinic.email_address || "")
        setPrimaryPhone(data.clinic.contact_number_primary || "")
        setSecondaryPhone(data.clinic.contact_number_secondary || "")
        setIsApproved(data.clinic.is_approved || false)
        
        // Note: clinicName state won't be updated immediately, but will be after setState
        console.log("[Clinic Settings] Set clinic form values from data:", {
          name: data.clinic.name,
          registrationNumber: data.clinic.registration_number,
          email: data.clinic.email_address,
          phone: data.clinic.contact_number_primary,
        })
      } else {
        console.warn("[Clinic Settings] No clinic data in response")
      }
      
      // Check if address exists and has data
      if (data.address && typeof data.address === 'object' && Object.keys(data.address).length > 0) {
        console.log("[Clinic Settings] Populating address data:", {
          rawAddress: data.address,
          addressLine1: data.address.addressLine1,
          addressLine2: data.address.addressLine2,
          city: data.address.city,
          state: data.address.state,
          pincode: data.address.pincode,
          country: data.address.country,
          hasData: Object.keys(data.address).length > 0,
          allKeys: Object.keys(data.address),
          addressString: JSON.stringify(data.address, null, 2),
        })
        
        // Extract address data, handling "NA" values and empty strings
        const addr = data.address
        
        // Helper function to clean address values
        const cleanAddressValue = (value: any): string => {
          if (!value || value === "NA" || value === "null" || value === null || value === undefined || value === "") {
            return ""
          }
          const cleaned = String(value).trim()
          return cleaned === "NA" ? "" : cleaned
        }
        
        const cleanedAddressLine1 = cleanAddressValue(addr.addressLine1)
        const cleanedAddressLine2 = cleanAddressValue(addr.addressLine2)
        const cleanedCity = cleanAddressValue(addr.city)
        const cleanedState = cleanAddressValue(addr.state)
        const cleanedPincode = cleanAddressValue(addr.pincode)
        const cleanedCountry = cleanAddressValue(addr.country) || "India"
        
        console.log("[Clinic Settings] Cleaned address values:", {
          addressLine1: cleanedAddressLine1,
          addressLine2: cleanedAddressLine2,
          city: cleanedCity,
          state: cleanedState,
          pincode: cleanedPincode,
          country: cleanedCountry,
        })
        
        // Set the state values - use functional updates to ensure React detects changes
        setAddressLine1(() => cleanedAddressLine1)
        setAddressLine2(() => cleanedAddressLine2)
        setCity(() => cleanedCity)
        setState(() => cleanedState)
        setPincode(() => cleanedPincode)
        setCountry(() => cleanedCountry)
        
        console.log("[Clinic Settings] Address form values set in state using functional updates")
        
        // Verify state was set by checking after a brief delay
        setTimeout(() => {
          console.log("[Clinic Settings] Address state verification (after setState):", {
            addressLine1: addressLine1,
            addressLine2: addressLine2,
            city: city,
            state: state,
            pincode: pincode,
            country: country,
          })
        }, 100)
      } else {
        console.log("[Clinic Settings] No address data in response (may be new clinic or address not set):", {
          hasAddress: !!data.address,
          addressType: data.address ? typeof data.address : 'undefined',
          addressValue: data.address,
        })
        // Initialize with empty values
        setAddressLine1("")
        setAddressLine2("")
        setCity("")
        setState("")
        setPincode("")
        setCountry("India")
      }
      if (data.operating_hours && Array.isArray(data.operating_hours) && data.operating_hours.length > 0) {
        console.log("[Clinic Settings] Processing operating hours:", data.operating_hours.length, "days")
        // Ensure we have all 7 days
        const daysMap = new Map<string, OperatingHours>()
        data.operating_hours.forEach((h: any) => {
          if (h && typeof h === 'object' && h.day) {
            daysMap.set(h.day, {
              day: h.day,
              openTime: h.openTime || "",
              closeTime: h.closeTime || "",
              closed: h.closed || false,
            })
          }
        })
        const completeHours: OperatingHours[] = DAYS_OF_WEEK.map(day => {
          const existing = daysMap.get(day.value)
          if (existing) {
            return existing
          }
          return {
            day: day.value,
            openTime: "09:00",
            closeTime: "18:00",
            closed: false,
          }
        })
        setOperatingHours(completeHours)
        console.log("[Clinic Settings] Set operating hours for", completeHours.length, "days")
      } else {
        console.log("[Clinic Settings] No operating hours in response, using defaults")
      }
      
      if (data.emergency_contact) {
        console.log("[Clinic Settings] Populating emergency contact:", data.emergency_contact)
        setEmergencyName(data.emergency_contact.name || "")
        setEmergencyPhone(data.emergency_contact.phone || "")
        setEmergencyInstructions(data.emergency_contact.instructions || "")
      } else {
        console.log("[Clinic Settings] No emergency contact in response")
        setEmergencyName("")
        setEmergencyPhone("")
        setEmergencyInstructions("")
      }
      
      console.log("[Clinic Settings] Data loading complete")
      
      // Store loaded data as original for cancel functionality
      // Use the data we just loaded, not the state (which may not be updated yet)
      const loadedData = {
        clinicName: data.clinic?.name || "",
        registrationNumber: data.clinic?.registration_number || "",
        gstNumber: data.clinic?.gst_number || "",
        website: data.clinic?.website || "",
        email: data.clinic?.email_address || "",
        primaryPhone: data.clinic?.contact_number_primary || "",
        secondaryPhone: data.clinic?.contact_number_secondary || "",
        addressLine1: data.address?.addressLine1 || "",
        addressLine2: data.address?.addressLine2 || "",
        city: data.address?.city || "",
        state: data.address?.state || "",
        pincode: data.address?.pincode || "",
        country: data.address?.country || "India",
        operatingHours: data.operating_hours && Array.isArray(data.operating_hours) && data.operating_hours.length > 0
          ? data.operating_hours.map((h: any) => ({
              day: h.day,
              openTime: h.openTime || "",
              closeTime: h.closeTime || "",
              closed: h.closed || false,
            }))
          : DAYS_OF_WEEK.map(day => ({
              day: day.value,
              openTime: "09:00",
              closeTime: "18:00",
              closed: false,
            })),
        emergencyName: data.emergency_contact?.name || "",
        emergencyPhone: data.emergency_contact?.phone || "",
        emergencyInstructions: data.emergency_contact?.instructions || "",
      }
      
      // Store original data for each section
      setOriginalBasicInfo({
        clinicName: data.clinic?.name || "",
        registrationNumber: data.clinic?.registration_number || "",
        gstNumber: data.clinic?.gst_number || "",
        website: data.clinic?.website || "",
      })
      setOriginalAddress({
        addressLine1: data.address?.addressLine1 || "",
        addressLine2: data.address?.addressLine2 || "",
        city: data.address?.city || "",
        state: data.address?.state || "",
        pincode: data.address?.pincode || "",
        country: data.address?.country || "India",
      })
      setOriginalContact({
        email: data.clinic?.email_address || "",
        primaryPhone: data.clinic?.contact_number_primary || "",
        secondaryPhone: data.clinic?.contact_number_secondary || "",
      })
      if (data.operating_hours && Array.isArray(data.operating_hours) && data.operating_hours.length > 0) {
        const hours = data.operating_hours.map((h: any) => ({
          day: h.day,
          openTime: h.openTime || "",
          closeTime: h.closeTime || "",
          closed: h.closed || false,
        }))
        setOriginalOperatingHours(hours)
      }
      setOriginalEmergencyContact({
        emergencyName: data.emergency_contact?.name || "",
        emergencyPhone: data.emergency_contact?.phone || "",
        emergencyInstructions: data.emergency_contact?.instructions || "",
      })
    } catch (error: any) {
      console.error("Error loading clinic data:", error)
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error("Network error. Please check your internet connection and try again.", { duration: 5000 })
      } else if (error.message) {
        toast.error(error.message, { duration: 5000 })
      } else {
        toast.error("Failed to load clinic information. Please try again.", { duration: 5000 })
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Validation functions for each section
  const validateBasicInfo = (): string[] => {
    const errors: string[] = []
    if (!clinicName.trim()) {
      errors.push("Clinic Name is required")
    } else if (clinicName.length > 255) {
      errors.push("Clinic Name must be less than 255 characters")
    }
    if (!registrationNumber.trim()) {
      errors.push("Registration Number is required")
    }
    if (website.trim() && !/^https?:\/\/.+/.test(website)) {
      errors.push("Please enter a valid URL (e.g., https://example.com)")
    }
    // GST number must be exactly 15 characters if provided (not empty)
    if (gstNumber.trim() && gstNumber.trim() !== "" && gstNumber.trim().length !== 15) {
      errors.push("GST number must be exactly 15 characters")
    }
    return errors
  }

  const validateAddress = (): string[] => {
    const errors: string[] = []
    if (!addressLine1.trim()) {
      errors.push("Address Line 1 is required")
    } else if (addressLine1.length > 255) {
      errors.push("Address Line 1 must be less than 255 characters")
    }
    if (addressLine2.length > 255) {
      errors.push("Address Line 2 must be less than 255 characters")
    }
    if (!city.trim()) {
      errors.push("City is required")
    }
    if (!state.trim()) {
      errors.push("State is required")
    }
    if (!pincode.trim()) {
      errors.push("Pincode is required")
    } else if (!/^\d{4,10}$/.test(pincode)) {
      errors.push("Please enter a valid pincode (4-10 digits)")
    }
    return errors
  }

  const validateContact = (): string[] => {
    const errors: string[] = []
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Please enter a valid email address")
    }
    if (!primaryPhone.trim()) {
      errors.push("Primary Phone Number is required")
    } else if (!/^[\d\s\-\+\(\)]{10,15}$/.test(primaryPhone.replace(/\s/g, ""))) {
      errors.push("Please enter a valid phone number")
    }
    if (secondaryPhone.trim() && !/^[\d\s\-\+\(\)]{10,15}$/.test(secondaryPhone.replace(/\s/g, ""))) {
      errors.push("Please enter a valid secondary phone number")
    }
    return errors
  }

  const validateEmergencyContact = (): string[] => {
    const errors: string[] = []
    if (emergencyPhone.trim() && !/^[\d\s\-\+\(\)]{10,15}$/.test(emergencyPhone.replace(/\s/g, ""))) {
      errors.push("Please enter a valid emergency phone number")
    }
    return errors
  }
  
  // Edit handlers for each section
  const handleEditBasicInfo = () => {
    setOriginalBasicInfo({
      clinicName,
      registrationNumber,
      gstNumber,
      website,
    })
    setIsEditingBasicInfo(true)
  }

  const handleCancelBasicInfo = () => {
    if (originalBasicInfo) {
      setClinicName(originalBasicInfo.clinicName || "")
      setRegistrationNumber(originalBasicInfo.registrationNumber || "")
      setGstNumber(originalBasicInfo.gstNumber || "")
      setWebsite(originalBasicInfo.website || "")
    }
    setIsEditingBasicInfo(false)
  }

  const handleSaveBasicInfo = async () => {
    const validationErrors = validateBasicInfo()
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(", "), { duration: 5000 })
      return
    }
    
    setIsSaving(true)
    try {
      const clinicId = localStorage.getItem("clinic_id") || ""
      if (!clinicId) {
        toast.error("Clinic ID not found. Please refresh the page.")
        setIsSaving(false)
        return
      }
      
      // Prepare payload matching backend API structure
      // Only send basic info fields - don't include address, operating_hours, or emergency_contact
      // Note: registration_number and name are IMMUTABLE in backend and cannot be updated via PATCH
      // Only send gst_number if clinic is NOT approved (it becomes read-only after approval)
      const clinicPayload: any = {
        website: website.trim() || "", // Frontend uses 'website', API route will map to 'website_url'
      }
      
      // Only include gst_number if clinic is NOT approved (it becomes read-only after approval)
      // registration_number and name are always immutable in backend, so never send them
      if (!isApproved) {
        // GST number must be exactly 15 characters if provided, or "NA" if empty
        const gstValue = gstNumber.trim()
        clinicPayload.gst_number = gstValue || "NA"
      }
      
      const payload: any = {
        clinic: clinicPayload,
        address: {},
      }
      // Don't send operating_hours or emergency_contact if we're not updating them
      
      // Get access token for authentication
      const accessToken = localStorage.getItem("access_token")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`
      }
      
      const response = await fetch(`/api/clinic/${clinicId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      })
      
      let responseData: any = {}
      try {
        responseData = await response.json()
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        toast.error("Received invalid response from server. Please try again.")
        setIsSaving(false)
        return
      }
      
      if (!response.ok) {
        // Handle different error scenarios
        const errorMessage = responseData.error || responseData.message || "Failed to update clinic information"
        
        // Check for partial success (207 status)
        if (response.status === 207 && responseData.partial_success) {
          toast.error(
            `Some updates succeeded, but some failed: ${errorMessage}`,
            { duration: 6000 }
          )
          // Still reload data to show what was successfully updated
          await loadClinicData()
          setIsSaving(false)
          return
        }
        
        // Handle validation errors
        if (responseData.validationErrors && Object.keys(responseData.validationErrors).length > 0) {
          const validationMessages = Object.values(responseData.validationErrors)
            .flat()
            .join(", ")
          toast.error(`${errorMessage}: ${validationMessages}`, { duration: 6000 })
        } else if (responseData.details && Array.isArray(responseData.details)) {
          toast.error(`${errorMessage}: ${responseData.details.join(", ")}`, { duration: 6000 })
        } else {
          toast.error(errorMessage, { duration: 5000 })
        }
        
        setIsSaving(false)
        return
      }
      
      // Success response
      if (responseData.success) {
        toast.success(
          responseData.message || "Basic information updated successfully",
          { duration: 2500 }
        )
        // Reload data to reflect any changes
        await loadClinicData()
        setIsEditingBasicInfo(false)
        setOriginalBasicInfo(null)
      } else {
        // Response OK but success flag is false
        toast.error(
          responseData.message || responseData.error || "Update completed but with warnings",
          { duration: 5000 }
        )
      }
    } catch (error: any) {
      console.error("Error saving basic info:", error)
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error("Network error. Please check your internet connection and try again.", { duration: 5000 })
      } else if (error.message) {
        toast.error(error.message, { duration: 5000 })
      } else {
        toast.error("Failed to save basic information. Please try again.", { duration: 5000 })
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Address section handlers
  const handleEditAddress = () => {
    setOriginalAddress({
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      country,
    })
    setIsEditingAddress(true)
  }

  const handleCancelAddress = () => {
    if (originalAddress) {
      setAddressLine1(originalAddress.addressLine1 || "")
      setAddressLine2(originalAddress.addressLine2 || "")
      setCity(originalAddress.city || "")
      setState(originalAddress.state || "")
      setPincode(originalAddress.pincode || "")
      setCountry(originalAddress.country || "India")
    }
    setIsEditingAddress(false)
  }

  const handleSaveAddress = async () => {
    const validationErrors = validateAddress()
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(", "), { duration: 5000 })
      return
    }
    
    setIsSaving(true)
    try {
      const clinicId = localStorage.getItem("clinic_id") || ""
      if (!clinicId) {
        toast.error("Clinic ID not found. Please refresh the page.")
        setIsSaving(false)
        return
      }
      
      const payload: any = {
        clinic: {},
        address: {
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || "",
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country: country,
        },
      }
      // Don't send operating_hours or emergency_contact if we're not updating them
      
      const accessToken = localStorage.getItem("access_token")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`
      }
      
      const response = await fetch(`/api/clinic/${clinicId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      })
      
      let responseData: any = {}
      try {
        responseData = await response.json()
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        toast.error("Received invalid response from server. Please try again.")
        setIsSaving(false)
        return
      }
      
      if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || "Failed to update address"
        if (responseData.validationErrors && Object.keys(responseData.validationErrors).length > 0) {
          const validationMessages = Object.values(responseData.validationErrors).flat().join(", ")
          toast.error(`${errorMessage}: ${validationMessages}`, { duration: 6000 })
        } else {
          toast.error(errorMessage, { duration: 5000 })
        }
        setIsSaving(false)
        return
      }
      
      if (responseData.success) {
        toast.success("Address updated successfully", { duration: 2500 })
        // Wait a bit to ensure database has committed the changes
        await new Promise(resolve => setTimeout(resolve, 300))
        // Force reload data to show updated address - clear any cached state
        setIsLoading(true)
        try {
          await loadClinicData()
          console.log("[Clinic Settings] Address data reloaded after save")
        } catch (reloadError) {
          console.error("[Clinic Settings] Error reloading address data:", reloadError)
          // Still show success but log the error
        } finally {
          setIsLoading(false)
        }
        setIsEditingAddress(false)
        setOriginalAddress(null)
      }
    } catch (error: any) {
      console.error("Error saving address:", error)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error("Network error. Please check your internet connection and try again.", { duration: 5000 })
      } else {
        toast.error(error.message || "Failed to save address. Please try again.", { duration: 5000 })
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Contact section handlers
  const handleEditContact = () => {
    setOriginalContact({
      email,
      primaryPhone,
      secondaryPhone,
    })
    setIsEditingContact(true)
  }

  const handleCancelContact = () => {
    if (originalContact) {
      setEmail(originalContact.email || "")
      setPrimaryPhone(originalContact.primaryPhone || "")
      setSecondaryPhone(originalContact.secondaryPhone || "")
    }
    setIsEditingContact(false)
  }

  const handleSaveContact = async () => {
    const validationErrors = validateContact()
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(", "), { duration: 5000 })
      return
    }
    
    setIsSaving(true)
    try {
      const clinicId = localStorage.getItem("clinic_id") || ""
      if (!clinicId) {
        toast.error("Clinic ID not found. Please refresh the page.")
        setIsSaving(false)
        return
      }
      
      const payload: any = {
        clinic: {
          email_address: email.trim() || "",
          contact_number_primary: primaryPhone.trim(),
          contact_number_secondary: secondaryPhone.trim() || "",
        },
        address: {},
      }
      // Don't send operating_hours or emergency_contact if we're not updating them
      
      const accessToken = localStorage.getItem("access_token")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`
      }
      
      const response = await fetch(`/api/clinic/${clinicId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      })
      
      let responseData: any = {}
      try {
        responseData = await response.json()
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        toast.error("Received invalid response from server. Please try again.")
        setIsSaving(false)
        return
      }
      
      if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || "Failed to update contact information"
        if (responseData.validationErrors && Object.keys(responseData.validationErrors).length > 0) {
          const validationMessages = Object.values(responseData.validationErrors).flat().join(", ")
          toast.error(`${errorMessage}: ${validationMessages}`, { duration: 6000 })
        } else {
          toast.error(errorMessage, { duration: 5000 })
        }
        setIsSaving(false)
        return
      }
      
      if (responseData.success) {
        toast.success("Contact information updated successfully", { duration: 2500 })
        await loadClinicData()
        setIsEditingContact(false)
        setOriginalContact(null)
      }
    } catch (error: any) {
      console.error("Error saving contact:", error)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error("Network error. Please check your internet connection and try again.", { duration: 5000 })
      } else {
        toast.error(error.message || "Failed to save contact information. Please try again.", { duration: 5000 })
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Operating Hours section handlers
  const handleEditOperatingHours = () => {
    setOriginalOperatingHours(JSON.parse(JSON.stringify(operatingHours)))
    setIsEditingOperatingHours(true)
  }

  const handleCancelOperatingHours = () => {
    if (originalOperatingHours.length > 0) {
      setOperatingHours(JSON.parse(JSON.stringify(originalOperatingHours)))
    }
    setIsEditingOperatingHours(false)
  }

  const handleSaveOperatingHours = async () => {
    // Validate operating hours before saving
    const validationErrors: string[] = []
    operatingHours.forEach((hours, index) => {
      if (!hours.closed) {
        if (!hours.openTime || !hours.closeTime) {
          validationErrors.push(`${hours.day.charAt(0).toUpperCase() + hours.day.slice(1)}: Both open and close times are required when clinic is open`)
        } else {
          // Validate time format and that open time is before close time
          const openTimeParts = hours.openTime.split(':')
          const closeTimeParts = hours.closeTime.split(':')
          if (openTimeParts.length !== 2 || closeTimeParts.length !== 2) {
            validationErrors.push(`${hours.day.charAt(0).toUpperCase() + hours.day.slice(1)}: Invalid time format. Use HH:MM format`)
          } else {
            const openMinutes = parseInt(openTimeParts[0]) * 60 + parseInt(openTimeParts[1])
            const closeMinutes = parseInt(closeTimeParts[0]) * 60 + parseInt(closeTimeParts[1])
            if (openMinutes >= closeMinutes) {
              validationErrors.push(`${hours.day.charAt(0).toUpperCase() + hours.day.slice(1)}: Open time must be earlier than close time`)
            }
          }
        }
      }
    })
    
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(", "), { duration: 5000 })
      return
    }
    
    setIsSaving(true)
    try {
      const clinicId = localStorage.getItem("clinic_id") || ""
      if (!clinicId) {
        toast.error("Clinic ID not found. Please refresh the page.")
        setIsSaving(false)
        return
      }
      
      const payload: any = {
        clinic: {},
        address: {},
        operating_hours: operatingHours.map(hours => ({
          day: hours.day,
          openTime: hours.closed ? "" : hours.openTime,
          closeTime: hours.closed ? "" : hours.closeTime,
          closed: hours.closed,
        })),
      }
      // Don't send emergency_contact if we're not updating it
      
      const accessToken = localStorage.getItem("access_token")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`
      }
      
      const response = await fetch(`/api/clinic/${clinicId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      })
      
      let responseData: any = {}
      try {
        responseData = await response.json()
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        toast.error("Received invalid response from server. Please try again.", { duration: 5000 })
        setIsSaving(false)
        return
      }
      
      if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || "Failed to update operating hours"
        if (responseData.validationErrors && Object.keys(responseData.validationErrors).length > 0) {
          const validationMessages = Object.values(responseData.validationErrors).flat().join(", ")
          toast.error(`${errorMessage}: ${validationMessages}`, { duration: 6000 })
        } else if (responseData.errors && Array.isArray(responseData.errors)) {
          toast.error(`${errorMessage}: ${responseData.errors.join(", ")}`, { duration: 6000 })
        } else {
          toast.error(errorMessage, { duration: 5000 })
        }
        setIsSaving(false)
        return
      }
      
      if (responseData.success) {
        toast.success("Operating hours updated successfully", { duration: 2500 })
        // Wait a bit to ensure database has committed the changes
        await new Promise(resolve => setTimeout(resolve, 200))
        // Reload data to show updated operating hours
        await loadClinicData()
        setIsEditingOperatingHours(false)
        setOriginalOperatingHours([])
      } else {
        // Handle partial success or other response formats
        const errorMessage = responseData.message || responseData.error || "Failed to update operating hours"
        if (responseData.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          toast.error(`${errorMessage}: ${responseData.errors.join(", ")}`, { duration: 6000 })
        } else {
          toast.error(errorMessage, { duration: 5000 })
        }
      }
    } catch (error: any) {
      console.error("Error saving operating hours:", error)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error("Network error. Please check your internet connection and try again.", { duration: 5000 })
      } else {
        toast.error(error.message || "Failed to save operating hours. Please try again.", { duration: 5000 })
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Emergency Contact section handlers
  const handleEditEmergencyContact = () => {
    setOriginalEmergencyContact({
      emergencyName,
      emergencyPhone,
      emergencyInstructions,
    })
    setIsEditingEmergencyContact(true)
  }

  const handleCancelEmergencyContact = () => {
    if (originalEmergencyContact) {
      setEmergencyName(originalEmergencyContact.emergencyName || "")
      setEmergencyPhone(originalEmergencyContact.emergencyPhone || "")
      setEmergencyInstructions(originalEmergencyContact.emergencyInstructions || "")
    }
    setIsEditingEmergencyContact(false)
  }

  const handleSaveEmergencyContact = async () => {
    const validationErrors = validateEmergencyContact()
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(", "), { duration: 5000 })
      return
    }
    
    setIsSaving(true)
    try {
      const clinicId = localStorage.getItem("clinic_id") || ""
      if (!clinicId) {
        toast.error("Clinic ID not found. Please refresh the page.")
        setIsSaving(false)
        return
      }
      
      const payload: any = {
        clinic: {},
        address: {},
        emergency_contact: {
          name: emergencyName.trim() || "",
          phone: emergencyPhone.trim() || "",
          // Don't send email field - backend will keep existing value
          // Only send email if user provides a valid email address
          instructions: emergencyInstructions.trim() || "",
        },
      }
      // Don't send operating_hours if we're not updating them
      
      const accessToken = localStorage.getItem("access_token")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`
      }
      
      const response = await fetch(`/api/clinic/${clinicId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      })
      
      let responseData: any = {}
      try {
        responseData = await response.json()
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        toast.error("Received invalid response from server. Please try again.")
        setIsSaving(false)
        return
      }
      
      if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || "Failed to update emergency contact"
        toast.error(errorMessage, { duration: 5000 })
        setIsSaving(false)
        return
      }
      
      if (responseData.success) {
        toast.success("Emergency contact updated successfully", { duration: 2500 })
        await loadClinicData()
        setIsEditingEmergencyContact(false)
        setOriginalEmergencyContact(null)
      }
    } catch (error: any) {
      console.error("Error saving emergency contact:", error)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error("Network error. Please check your internet connection and try again.", { duration: 5000 })
      } else {
        toast.error(error.message || "Failed to save emergency contact. Please try again.", { duration: 5000 })
      }
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleOperatingHoursChange = (index: number, field: keyof OperatingHours, value: any) => {
    const updated = [...operatingHours]
    updated[index] = { ...updated[index], [field]: value }
    if (field === "closed" && value) {
      updated[index].openTime = ""
      updated[index].closeTime = ""
    }
    setOperatingHours(updated)
  }
  
  const copyMondayToWeekdays = () => {
    const mondayHours = operatingHours.find(h => h.day === "monday")
    if (!mondayHours || mondayHours.closed) {
      toast.error("Monday hours must be set and not closed")
      return
    }
    
    const updated = operatingHours.map(h => {
      if (["tuesday", "wednesday", "thursday", "friday"].includes(h.day)) {
        return {
          ...h,
          openTime: mondayHours.openTime,
          closeTime: mondayHours.closeTime,
          closed: false,
        }
      }
      return h
    })
    setOperatingHours(updated)
    toast.info("Monday timings applied to all weekdays")
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">General Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your clinic settings and preferences</p>
      </div>

      <Tabs defaultValue="clinic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="clinic">Clinic Info</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Clinic Information Tab */}
        <TabsContent value="clinic" className="space-y-4">
          {/* Basic Information Section */}
          <SimpleFormCard
            title="Basic Information"
            description="Update your clinic's basic identity and registration details"
            isEditing={isEditingBasicInfo}
            onEdit={handleEditBasicInfo}
            onSave={handleSaveBasicInfo}
            onCancel={handleCancelBasicInfo}
            isSaving={isSaving}
          >
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clinic-name" className="flex items-center gap-1">
                    Clinic Name
                    <span className="text-destructive">*</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This cannot be changed once set</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="clinic-name"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Enter clinic name"
                    maxLength={255}
                    readOnly={true}
                    disabled={true}
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration-number" className="flex items-center gap-1">
                    Clinic ID / Registration Number
                    <span className="text-destructive">*</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This cannot be changed once set (immutable field)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="registration-number"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="Enter registration number"
                    readOnly={true}
                    disabled={true}
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-1">
                    <Globe className="mr-2 h-4 w-4" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    disabled={!isEditingBasicInfo}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst-number" className="flex items-center gap-1">
                    GST Number
                    {isApproved && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This cannot be changed after approval</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </Label>
                  <Input
                    id="gst-number"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="Enter GST/Tax ID"
                    readOnly={isApproved || !isEditingBasicInfo}
                    disabled={isApproved || !isEditingBasicInfo}
                  />
                </div>
              </div>
            </div>
          </SimpleFormCard>

          {/* Address Details Section */}
          <SimpleFormCard
            title="Address Details"
            description="Update your clinic's physical address"
            isEditing={isEditingAddress}
            onEdit={handleEditAddress}
            onSave={handleSaveAddress}
            onCancel={handleCancelAddress}
            isSaving={isSaving}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address-line1" className="flex items-center gap-1">
                  Address Line 1
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="address-line1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Enter street address"
                  maxLength={255}
                  disabled={!isEditingAddress}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address-line2">Address Line 2</Label>
                <Textarea
                  id="address-line2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                  maxLength={255}
                  disabled={!isEditingAddress}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-1">
                    City
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter city"
                    disabled={!isEditingAddress}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="flex items-center gap-1">
                    State
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select value={state} onValueChange={setState} disabled={!isEditingAddress}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((stateName) => (
                        <SelectItem key={stateName} value={stateName}>
                          {stateName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pincode" className="flex items-center gap-1">
                    Pincode
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter pincode"
                    maxLength={10}
                    disabled={!isEditingAddress}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={country} onValueChange={setCountry} disabled={!isEditingAddress}>
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="India">India</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </SimpleFormCard>

          {/* Contact Details Section */}
          <SimpleFormCard
            title="Contact Details"
            description="Update your clinic's contact information"
            isEditing={isEditingContact}
            onEdit={handleEditContact}
            onSave={handleSaveContact}
            onCancel={handleCancelContact}
            isSaving={isSaving}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@clinic.com"
                  disabled={!isEditingContact}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary-phone" className="flex items-center gap-1">
                    <Phone className="mr-2 h-4 w-4" />
                    Primary Phone Number
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="primary-phone"
                    type="tel"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    disabled={!isEditingContact}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary-phone" className="flex items-center gap-1">
                    <Phone className="mr-2 h-4 w-4" />
                    Secondary Phone Number
                  </Label>
                  <Input
                    id="secondary-phone"
                    type="tel"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    disabled={!isEditingContact}
                  />
                </div>
              </div>
            </div>
          </SimpleFormCard>

          {/* Operating Hours Section */}
          <SimpleFormCard
            title="Operating Hours"
            description="Configure operating hours for each day of the week"
            isEditing={isEditingOperatingHours}
            onEdit={handleEditOperatingHours}
            onSave={handleSaveOperatingHours}
            onCancel={handleCancelOperatingHours}
            isSaving={isSaving}
          >
            <div className="space-y-4">
              {isEditingOperatingHours && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyMondayToWeekdays}
                    disabled={isSaving}
                  >
                    Apply Monday to Weekdays
                  </Button>
                </div>
              )}
              <div className="space-y-3">
                {operatingHours.map((hours, index) => {
                  const dayLabel = DAYS_OF_WEEK.find(d => d.value === hours.day)?.label || hours.day
                  return (
                    <div key={hours.day} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-12 sm:col-span-2">
                        <Label className="font-medium">{dayLabel}</Label>
                      </div>
                      <div className="col-span-12 sm:col-span-3">
                        <Input
                          type="time"
                          value={hours.openTime}
                          onChange={(e) => handleOperatingHoursChange(index, "openTime", e.target.value)}
                          disabled={hours.closed || !isEditingOperatingHours}
                          className="w-full"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-3">
                        <Input
                          type="time"
                          value={hours.closeTime}
                          onChange={(e) => handleOperatingHoursChange(index, "closeTime", e.target.value)}
                          disabled={hours.closed || !isEditingOperatingHours}
                          className="w-full"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
                        <Checkbox
                          id={`closed-${hours.day}`}
                          checked={hours.closed}
                          onCheckedChange={(checked) => handleOperatingHoursChange(index, "closed", checked)}
                          disabled={!isEditingOperatingHours}
                        />
                        <Label htmlFor={`closed-${hours.day}`} className="cursor-pointer">
                          Closed
                        </Label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </SimpleFormCard>

          {/* Emergency Contact Section */}
          <SimpleFormCard
            title="Emergency Contact"
            description="Set up emergency contact information for your clinic"
            isEditing={isEditingEmergencyContact}
            onEdit={handleEditEmergencyContact}
            onSave={handleSaveEmergencyContact}
            onCancel={handleCancelEmergencyContact}
            isSaving={isSaving}
          >
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergency-name">Emergency Contact Name</Label>
                  <Input
                    id="emergency-name"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Dr. John Doe"
                    disabled={!isEditingEmergencyContact}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency-phone">Emergency Phone Number</Label>
                  <Input
                    id="emergency-phone"
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    disabled={!isEditingEmergencyContact}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-instructions">Emergency Instructions</Label>
                <Textarea
                  id="emergency-instructions"
                  value={emergencyInstructions}
                  onChange={(e) => setEmergencyInstructions(e.target.value)}
                  placeholder="Call ambulance / Contact nearest hospital / Follow SOP..."
                  rows={4}
                  disabled={!isEditingEmergencyContact}
                />
              </div>
            </div>
          </SimpleFormCard>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Regional Settings
              </CardTitle>
              <CardDescription>Configure time, date, and regional preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="america_new_york">
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="america_new_york">America/New York (UTC-05:00)</SelectItem>
                      <SelectItem value="america_chicago">America/Chicago (UTC-06:00)</SelectItem>
                      <SelectItem value="america_denver">America/Denver (UTC-07:00)</SelectItem>
                      <SelectItem value="america_los_angeles">America/Los Angeles (UTC-08:00)</SelectItem>
                      <SelectItem value="europe_london">Europe/London (UTC+00:00)</SelectItem>
                      <SelectItem value="asia_tokyo">Asia/Tokyo (UTC+09:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select defaultValue="mm_dd_yyyy">
                    <SelectTrigger id="date-format">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm_dd_yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dd_mm_yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="yyyy_mm_dd">YYYY/MM/DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="time-format">Time Format</Label>
                  <Select defaultValue="12h">
                    <SelectTrigger id="time-format">
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first-day">First Day of Week</Label>
                  <Select defaultValue="sunday">
                    <SelectTrigger id="first-day">
                      <SelectValue placeholder="Select first day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger id="language" className="flex items-center">
                    <Languages className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Calendar Settings</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="calendar-view">Default Calendar View</Label>
                    <Select defaultValue="week">
                      <SelectTrigger id="calendar-view">
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slot-duration">Default Appointment Duration</Label>
                    <Select defaultValue="30">
                      <SelectTrigger id="slot-duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="show-weekends" defaultChecked />
                  <Label htmlFor="show-weekends">Show weekends in calendar</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 flex-wrap">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Appointment Settings
              </CardTitle>
              <CardDescription>Configure appointment scheduling preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="allow-online-booking" defaultChecked />
                  <Label className="leading-tight" htmlFor="allow-online-booking">Allow online appointment booking</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="require-approval" />
                  <Label className="leading-tight" htmlFor="require-approval">Require approval for online bookings</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="send-reminders" defaultChecked />
                  <Label className="leading-tight" htmlFor="send-reminders">Send appointment reminders</Label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reminder-time">Reminder Time</Label>
                  <Select defaultValue="24h">
                    <SelectTrigger id="reminder-time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 hour before</SelectItem>
                      <SelectItem value="3h">3 hours before</SelectItem>
                      <SelectItem value="12h">12 hours before</SelectItem>
                      <SelectItem value="24h">24 hours before</SelectItem>
                      <SelectItem value="48h">48 hours before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buffer-time">Buffer Time Between Appointments</Label>
                  <Select defaultValue="15">
                    <SelectTrigger id="buffer-time">
                      <SelectValue placeholder="Select buffer time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No buffer</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PaintBucket className="mr-2 h-5 w-5" />
                Branding & Appearance
              </CardTitle>
              <CardDescription>Customize your clinic's visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Clinic Logo</Label>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="h-24 w-24 rounded-md border border-dashed border-muted-foreground flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-12 w-12 text-primary"
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="flex items-center">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload New Logo
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Recommended size: 512x512px. Max file size: 2MB. Formats: PNG, JPG, SVG
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Favicon</Label>
                <div className="flex items-center flex-wrap gap-4">
                  <div className="h-12 w-12 rounded-md border border-dashed border-muted-foreground flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6 text-primary"
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="flex items-center">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Favicon
                    </Button>
                    <p className="text-xs text-muted-foreground">Recommended size: 32x32px. Format: ICO, PNG</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Color Scheme</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary"></div>
                      <Input id="primary-color" defaultValue="#0284c7" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-secondary"></div>
                      <Input id="secondary-color" defaultValue="#7c3aed" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme-mode">Theme Mode</Label>
                  <Select defaultValue="dark">
                    <SelectTrigger id="theme-mode">
                      <SelectValue placeholder="Select theme mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Template</h3>
                <div className="space-y-2">
                  <Label htmlFor="email-header">Email Header Text</Label>
                  <Input id="email-header" defaultValue="MedixPro Clinic - Your Health, Our Priority" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-footer">Email Footer Text</Label>
                  <Textarea
                    id="email-footer"
                    defaultValue="© 2023 MedixPro Clinic. All rights reserved. 123 Medical Plaza, Healthcare District, City, State, 12345"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 flex-wrap">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Branding</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure security and privacy settings for your clinic</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Password Policy</h3>

                <div className="space-y-2">
                  <Label htmlFor="password-expiry">Password Expiry</Label>
                  <Select defaultValue="90">
                    <SelectTrigger id="password-expiry">
                      <SelectValue placeholder="Select expiry period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-length">Minimum Password Length</Label>
                  <Select defaultValue="8">
                    <SelectTrigger id="min-length">
                      <SelectValue placeholder="Select minimum length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 characters</SelectItem>
                      <SelectItem value="8">8 characters</SelectItem>
                      <SelectItem value="10">10 characters</SelectItem>
                      <SelectItem value="12">12 characters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="require-uppercase" defaultChecked />
                    <Label htmlFor="require-uppercase">Require uppercase letters</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="require-numbers" defaultChecked />
                    <Label htmlFor="require-numbers">Require numbers</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="require-special" defaultChecked />
                    <Label htmlFor="require-special">Require special characters</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Login Security</h3>

                <div className="flex items-center space-x-2">
                  <Switch id="two-factor" />
                  <Label htmlFor="two-factor">Enforce two-factor authentication</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout</Label>
                  <Select defaultValue="30">
                    <SelectTrigger id="session-timeout">
                      <SelectValue placeholder="Select timeout period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-attempts">Maximum Login Attempts</Label>
                  <Select defaultValue="5">
                    <SelectTrigger id="max-attempts">
                      <SelectValue placeholder="Select maximum attempts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 attempts</SelectItem>
                      <SelectItem value="5">5 attempts</SelectItem>
                      <SelectItem value="10">10 attempts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Protection</h3>

                <div className="flex items-center space-x-2">
                  <Switch id="encrypt-data" defaultChecked />
                  <Label htmlFor="encrypt-data">Encrypt sensitive data</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="audit-logs" defaultChecked />
                  <Label htmlFor="audit-logs">Enable audit logs</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="log-retention">Log Retention Period</Label>
                  <Select defaultValue="365">
                    <SelectTrigger id="log-retention">
                      <SelectValue placeholder="Select retention period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="730">2 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end flex-wrap gap-2">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>
                  <Lock className="mr-2 h-4 w-4" />
                  Save Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5" />
                API Access
              </CardTitle>
              <CardDescription>Manage API keys and external integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="enable-api" defaultChecked />
                  <Label htmlFor="enable-api">Enable API access</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input id="api-key" type="password" value="••••••••••••••••••••••••••••••" readOnly />
                    <Button variant="outline" size="sm">
                      Show
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Last generated: 2023-10-15</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">API Rate Limits</h3>

                <div className="space-y-2">
                  <Label htmlFor="rate-limit">Requests per Minute</Label>
                  <Select defaultValue="100">
                    <SelectTrigger id="rate-limit">
                      <SelectValue placeholder="Select rate limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">60 requests</SelectItem>
                      <SelectItem value="100">100 requests</SelectItem>
                      <SelectItem value="500">500 requests</SelectItem>
                      <SelectItem value="1000">1000 requests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowed-origins">Allowed Origins</Label>
                  <Textarea
                    id="allowed-origins"
                    defaultValue="https://medixpro-clinic.com&#10;https://api.medixpro-clinic.com"
                  />
                  <p className="text-xs text-muted-foreground">Enter one domain per line</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save API Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileJson className="mr-2 h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>Advanced system settings and maintenance options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Maintenance</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <Button variant="outline" className="flex items-center justify-center">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Clear Cache
                  </Button>
                  <Button variant="outline" className="flex items-center justify-center">
                    <Database className="mr-2 h-4 w-4" />
                    Optimize Database
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  <div className="flex items-center gap-4">
                    <Switch id="maintenance-mode" />
                    <div>
                      <p className="text-sm">Enable maintenance mode</p>
                      <p className="text-xs text-muted-foreground">
                        This will make the system inaccessible to regular users
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Backup & Restore</h3>

                <div className="space-y-2">
                  <Label htmlFor="backup-frequency">Automatic Backup Frequency</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger id="backup-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-retention">Backup Retention</Label>
                  <Select defaultValue="30">
                    <SelectTrigger id="backup-retention">
                      <SelectValue placeholder="Select retention period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Button variant="outline" className="flex items-center justify-center">
                    <HardDrive className="mr-2 h-4 w-4" />
                    Create Manual Backup
                  </Button>
                  <Button variant="outline" className="flex items-center justify-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Restore from Backup
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Information</h3>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Version</span>
                    <span className="text-sm">v2.5.3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Last Updated</span>
                    <span className="text-sm">2023-11-10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Database Size</span>
                    <span className="text-sm">1.2 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Storage Usage</span>
                    <span className="text-sm">45.8 GB / 100 GB</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end flex-wrap gap-2">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save System Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
