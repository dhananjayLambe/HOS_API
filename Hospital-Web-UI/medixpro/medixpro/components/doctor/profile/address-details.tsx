"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin } from "lucide-react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveFormGrid } from "@/components/doctor/profile/shared/responsive-form-grid"
import { doctorAPI } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { validatePincode } from "@/lib/validation"

export function AddressDetailsSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToastNotification()
  const isLoadingRef = useRef(false)

  const [formData, setFormData] = useState({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
    country: "India",
  })

  const [originalData, setOriginalData] = useState(formData)

  // Load address data from API
  useEffect(() => {
    if (isLoadingRef.current) return
    
    isLoadingRef.current = true
    
    const loadAddressData = async () => {
      try {
        setIsLoading(true)
        const addressResponse = await doctorAPI.getAddress()
        
        if (addressResponse?.status === "success" && addressResponse?.data) {
          const address = addressResponse.data
          setFormData({
            addressLine1: address.address || "",
            addressLine2: address.address2 || "",
            city: address.city || "",
            state: address.state || "Maharashtra",
            pincode: address.pincode || "",
            country: address.country || "India",
          })
          setOriginalData({
            addressLine1: address.address || "",
            addressLine2: address.address2 || "",
            city: address.city || "",
            state: address.state || "Maharashtra",
            pincode: address.pincode || "",
            country: address.country || "India",
          })
        } else {
          // No address exists yet, use defaults
          setFormData({
            addressLine1: "",
            addressLine2: "",
            city: "",
            state: "Maharashtra",
            pincode: "",
            country: "India",
          })
        }
      } catch (error: any) {
        // Handle different error scenarios
        // Try multiple ways to extract error information
        let status: number | undefined
        let errorMessage: string = "Unknown error"
        
        // Check if it's an APIError instance
        if (error && typeof error === 'object') {
          status = error.status || error.response?.status || error.response?.data?.status
          errorMessage = error.message || error.response?.data?.message || error.response?.data?.error || error.toString() || "Unknown error"
        } else if (error) {
          errorMessage = String(error)
        }
        
        // Log comprehensive error details for debugging
        try {
          const errorDetails: any = {
            status: status ?? 'undefined',
            message: errorMessage,
            errorType: error?.constructor?.name || typeof error,
            hasStatus: 'status' in (error || {}),
            hasResponse: 'response' in (error || {}),
            errorKeys: error ? Object.keys(error) : [],
          }
          
          // Try to stringify the error (might fail for circular references)
          try {
            errorDetails.errorJSON = JSON.stringify(error, null, 2)
          } catch (e) {
            errorDetails.errorJSON = "Could not stringify error (circular reference?)"
          }
          
          // Add error properties if they exist
          if (error) {
            if ('status' in error) errorDetails.statusProperty = error.status
            if ('message' in error) errorDetails.messageProperty = error.message
            if ('response' in error) {
              errorDetails.responseStatus = error.response?.status
              errorDetails.responseData = error.response?.data
            }
          }
          
          console.error("Error loading address - Full details:", errorDetails)
        } catch (logError) {
          // Fallback if logging fails
          console.error("Error loading address - Could not log details:", logError)
          console.error("Original error:", error)
        }
        
        // Handle different error scenarios
        if (status === 404) {
          // Address doesn't exist - that's okay, use defaults
          // This is expected for new users
          console.log("Address not found (404), using default values")
        } else if (status === 503 || errorMessage?.includes('Connection refused') || errorMessage?.includes('ECONNREFUSED')) {
          // Backend not running
          console.warn("Backend server not available. Using default address values.")
        } else {
          // Other errors (500, etc.)
          console.error(`Error loading address (status: ${status ?? 'unknown'}):`, errorMessage)
        }
        // Keep default values in all error cases
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    }

    loadAddressData()
  }, [])

  const handleEdit = () => {
    setOriginalData(formData)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setFormData(originalData)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!validatePincode(formData.pincode)) {
      toast.error("Please enter a valid pincode")
      return
    }

    setIsSaving(true)
    try {
      // Map frontend field names to backend field names
      const addressData = {
        address: formData.addressLine1,
        address2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country,
      }

      await doctorAPI.updateAddress(addressData)
      toast.success("Address updated successfully!")
      setIsEditing(false)
      setOriginalData(formData)
      
      // Reload address data to ensure UI is up-to-date
      try {
        const addressResponse = await doctorAPI.getAddress()
        if (addressResponse?.status === "success" && addressResponse?.data) {
          const address = addressResponse.data
          setFormData({
            addressLine1: address.address || "",
            addressLine2: address.address2 || "",
            city: address.city || "",
            state: address.state || "Maharashtra",
            pincode: address.pincode || "",
            country: address.country || "India",
          })
          setOriginalData({
            addressLine1: address.address || "",
            addressLine2: address.address2 || "",
            city: address.city || "",
            state: address.state || "Maharashtra",
            pincode: address.pincode || "",
            country: address.country || "India",
          })
        }
      } catch (reloadError) {
        // Silently handle reload errors
        console.warn("Failed to reload address after save:", reloadError)
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || "Failed to update address"
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SimpleFormCard
      title="Address Details"
      description="Your contact address"
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <ResponsiveFormGrid>
        <div className="col-span-full space-y-2">
          <Label htmlFor="addressLine1">Address Line 1</Label>
          <Input
            id="addressLine1"
            value={formData.addressLine1}
            onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
            disabled={!isEditing}
          />
        </div>

        <div className="col-span-full space-y-2">
          <Label htmlFor="addressLine2">Address Line 2</Label>
          <Input
            id="addressLine2"
            value={formData.addressLine2}
            onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            disabled={!isEditing}
            placeholder="Maharashtra"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pincode">Pincode</Label>
          <Input
            id="pincode"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select
            value={formData.country}
            onValueChange={(value) => setFormData({ ...formData, country: value })}
            disabled={!isEditing}
          >
            <SelectTrigger id="country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="India">India</SelectItem>
              <SelectItem value="USA">United States</SelectItem>
              <SelectItem value="UK">United Kingdom</SelectItem>
              <SelectItem value="Canada">Canada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ResponsiveFormGrid>
    </SimpleFormCard>
  )
}
