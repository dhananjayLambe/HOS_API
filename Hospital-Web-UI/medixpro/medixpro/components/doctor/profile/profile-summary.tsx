"use client"

import { useState, useEffect, useRef } from "react"
import { Briefcase, FileText, Award } from "lucide-react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveFormGrid } from "@/components/doctor/profile/shared/responsive-form-grid"
import { doctorAPI } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"

export function ProfileSummarySection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToastNotification()
  const isLoadingRef = useRef(false)

  const [formData, setFormData] = useState({
    title: "Consultant Physician",
    medicalRegistrationNumber: "",
    yearsOfExperience: "1",
    medicalCouncil: "Medical Council of India", // Store this to preserve it
  })

  const [originalData, setOriginalData] = useState(formData)

  // Load profile summary data from API
  useEffect(() => {
    if (isLoadingRef.current) return
    
    isLoadingRef.current = true
    
    const loadProfileSummary = async () => {
      try {
        const profileResponse = await doctorAPI.getProfile()
        
        if (profileResponse?.detail && profileResponse.detail.includes("throttled")) {
          console.warn("Rate limited, using default values")
          setIsLoading(false)
          isLoadingRef.current = false
          return
        }
        
        const profile = profileResponse?.doctor_profile || profileResponse

        if (profile && !profile.detail) {
          const personalInfo = profile.personal_info || {}
          const registration = profile.kyc?.registration || {}

          const newFormData = {
            title: personalInfo.title || "Consultant Physician",
            medicalRegistrationNumber: registration?.medical_registration_number || "",
            yearsOfExperience: personalInfo.years_of_experience 
              ? String(personalInfo.years_of_experience) 
              : "1",
            medicalCouncil: registration?.medical_council || "Medical Council of India",
          }

          setFormData(newFormData)
          setOriginalData(newFormData)
        }
      } catch (error) {
        // Silently handle errors - use default values
        if (process.env.NODE_ENV === 'development') {
          console.warn("Profile summary API error (using defaults):", error)
        }
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    }

    loadProfileSummary()
    
    return () => {
      isLoadingRef.current = false
    }
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
    setIsSaving(true)
    try {
      // Prepare data for backend
      const updatePayload: any = {
        title: formData.title || "Consultant Physician",
        years_of_experience: parseInt(formData.yearsOfExperience) || 1,
      }

      // Include registration update only if:
      // 1. There's a registration number provided, AND
      // 2. It has changed OR medical council has changed
      const trimmedRegNumber = formData.medicalRegistrationNumber.trim()
      const originalRegNumber = originalData.medicalRegistrationNumber.trim()
      const medicalCouncilChanged = formData.medicalCouncil !== originalData.medicalCouncil
      
      // Only send registration update if the number or council has changed
      // This avoids triggering validation errors when nothing actually changed
      if (trimmedRegNumber && (trimmedRegNumber !== originalRegNumber || medicalCouncilChanged)) {
        updatePayload.registration = {
          medical_registration_number: trimmedRegNumber,
          medical_council: formData.medicalCouncil || "Medical Council of India",
        }
      }
      // If registration number is empty, we still need to handle it
      // But for now, we'll skip registration update if number is empty

      console.log("Sending profile summary update:", JSON.stringify(updatePayload, null, 2))

      const response = await doctorAPI.updatePersonalInfo(updatePayload)
      
      console.log("Update response:", JSON.stringify(response, null, 2))
      
      // Check if update was successful - handle various response structures
      const isSuccess = response?.doctor_profile || 
                       response?.status === "success" || 
                       (response && !response.error && !response.errors) ||
                       (typeof response === 'object' && 'title' in response) // Direct response with fields
      
      if (isSuccess) {
        toast.success("Profile summary updated successfully!")
        setIsEditing(false)
        
        // Refresh profile data to get updated values
        try {
          const profileResponse = await doctorAPI.getProfile()
          const profile = profileResponse?.doctor_profile || profileResponse || {}
          const personalInfo = profile.personal_info || profile
          const registration = profile.kyc?.registration || {}

          const updatedFormData = {
            title: personalInfo.title || formData.title || "Consultant Physician",
            medicalRegistrationNumber: registration?.medical_registration_number || formData.medicalRegistrationNumber || "",
            yearsOfExperience: personalInfo.years_of_experience 
              ? String(personalInfo.years_of_experience) 
              : formData.yearsOfExperience || "1",
            medicalCouncil: registration?.medical_council || formData.medicalCouncil || "Medical Council of India",
          }
          
          setFormData(updatedFormData)
          setOriginalData(updatedFormData)
        } catch (refreshError) {
          console.error("Failed to refresh profile after update:", refreshError)
          // Still mark as successful since the update went through
        }
      } else {
        // Handle error response
        const errorMsg = response?.message || response?.error || response?.detail || "Failed to update profile summary"
        toast.error(errorMsg)
        console.error("Update failed with response:", response)
      }
    } catch (error: any) {
      console.error("Profile summary update error:", error)
      
      // Extract detailed error message from nested error structure
      let errorMessage = "Failed to update profile summary"
      
      // Handle different error response structures
      const errorData = error?.response?.data || error?.errors || error
      
      if (errorData) {
        // Check for nested registration errors
        if (errorData.registration) {
          const regErrors = errorData.registration
          if (typeof regErrors === 'object') {
            if (regErrors.medical_registration_number) {
              const regNumError = Array.isArray(regErrors.medical_registration_number) 
                ? regErrors.medical_registration_number[0]
                : regErrors.medical_registration_number
              errorMessage = `Medical Registration Number: ${regNumError}`
            } else if (regErrors.medical_council) {
              const councilError = Array.isArray(regErrors.medical_council) 
                ? regErrors.medical_council[0]
                : regErrors.medical_council
              errorMessage = `Medical Council: ${councilError}`
            } else if (typeof regErrors === 'string') {
              errorMessage = regErrors
            }
          } else if (typeof regErrors === 'string') {
            errorMessage = regErrors
          }
        } 
        // Check for direct field errors
        else if (errorData.title) {
          const titleError = Array.isArray(errorData.title) ? errorData.title[0] : errorData.title
          errorMessage = `Professional Title: ${titleError}`
        } else if (errorData.years_of_experience) {
          const expError = Array.isArray(errorData.years_of_experience) 
            ? errorData.years_of_experience[0] 
            : errorData.years_of_experience
          errorMessage = `Years of Experience: ${expError}`
        } 
        // Check for general error messages
        else if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        }
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      console.error("Extracted error message:", errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <SimpleFormCard
        title="Profile Summary"
        description="Your professional title, registration, and experience"
        isEditing={false}
        isSaving={false}
        onEdit={() => {}}
        onSave={() => {}}
        onCancel={() => {}}
      >
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </SimpleFormCard>
    )
  }

  return (
    <SimpleFormCard
      title="Profile Summary"
      description="Your professional title, registration, and experience"
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <ResponsiveFormGrid>
        <div className="space-y-2">
          <Label htmlFor="title">Professional Title</Label>
          <div className="relative">
            <Award className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="pl-10"
              disabled={!isEditing}
              placeholder="Consultant Physician"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="medicalRegistrationNumber">Medical Registration Number</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="medicalRegistrationNumber"
              value={formData.medicalRegistrationNumber}
              onChange={(e) => setFormData({ ...formData, medicalRegistrationNumber: e.target.value })}
              className="pl-10"
              disabled={!isEditing}
              placeholder="MH123456"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="yearsOfExperience">Years of Experience</Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="yearsOfExperience"
              type="number"
              min="0"
              max="100"
              value={formData.yearsOfExperience}
              onChange={(e) => {
                const value = e.target.value
                // Only allow positive numbers
                if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
                  setFormData({ ...formData, yearsOfExperience: value })
                }
              }}
              className="pl-10"
              disabled={!isEditing}
              placeholder="1"
            />
          </div>
        </div>
      </ResponsiveFormGrid>
    </SimpleFormCard>
  )
}

