"use client"

import { useState, useEffect, useRef } from "react"
import { Mail, Phone, Calendar, UserIcon, Info } from "lucide-react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ResponsiveFormGrid } from "@/components/doctor/profile/shared/responsive-form-grid"
import { doctorAPI } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Map frontend gender values to backend values
const GENDER_MAP: Record<string, string> = {
  male: "M",
  female: "F",
  other: "O",
}

const GENDER_MAP_REVERSE: Record<string, string> = {
  M: "male",
  F: "female",
  O: "other",
}

export function PersonalInformationSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToastNotification()
  const isLoadingRef = useRef(false)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    bio: "",
  })

  const [originalData, setOriginalData] = useState(formData)

  // Load profile data from API and localStorage
  useEffect(() => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) return
    
    isLoadingRef.current = true
    
    const loadProfileData = async () => {
      try {
        // Load from localStorage first
        const firstName = localStorage.getItem("first_name") || ""
        const lastName = localStorage.getItem("last_name") || ""
        const email = localStorage.getItem("email") || ""
        const username = localStorage.getItem("username") || ""

        setFormData((prev) => ({
          ...prev,
          firstName,
          lastName,
          email,
          phone: username, // username is the mobile number
        }))

        // Fetch from API
        try {
          const profileResponse = await doctorAPI.getProfile()
          
          // Check for rate limiting or errors
          if (profileResponse?.detail && profileResponse.detail.includes("throttled")) {
            console.warn("Rate limited, using cached data")
            return
          }
          
          const profile = profileResponse?.doctor_profile || profileResponse

          // Debug: Log full response
          console.log("Full API Response:", JSON.stringify(profileResponse, null, 2))
          console.log("Profile object:", profile)

          if (profile?.personal_info && !profile.detail) {
            const personalInfo = profile.personal_info
            
            // Debug logging - always log for now to see what we're getting
            console.log("Personal info from API:", {
              dob: personalInfo.dob,
              gender: personalInfo.gender,
              about: personalInfo.about,
              has_dob: !!personalInfo.dob,
              has_gender: !!personalInfo.gender,
              has_about: !!personalInfo.about,
              fullPersonalInfo: personalInfo
            })

            // Format date of birth - handle various date formats
            let dobFormatted = ""
            if (personalInfo.dob) {
              try {
                // Handle string dates in ISO format (YYYY-MM-DD) or other formats
                let dobStr = personalInfo.dob
                
                // If it's already in YYYY-MM-DD format, use it directly
                if (typeof dobStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
                  dobFormatted = dobStr
                } else {
                  // Parse and format
                  const dob = new Date(dobStr)
                  if (!isNaN(dob.getTime())) {
                    const year = dob.getFullYear()
                    const month = String(dob.getMonth() + 1).padStart(2, '0')
                    const day = String(dob.getDate()).padStart(2, '0')
                    dobFormatted = `${year}-${month}-${day}`
                  }
                }
                console.log("DOB formatted:", dobFormatted, "from:", personalInfo.dob)
              } catch (e) {
                console.error("Error parsing date of birth:", e, personalInfo.dob)
              }
            } else {
              console.log("No DOB in personalInfo:", personalInfo.dob)
            }

            // Map gender - handle both backend format (M/F/O) and frontend format (male/female/other)
            let genderValue = ""
            if (personalInfo.gender) {
              const genderStr = String(personalInfo.gender).trim().toUpperCase()
              console.log("Raw gender from API:", personalInfo.gender, "processed:", genderStr)
              if (genderStr in GENDER_MAP_REVERSE) {
                genderValue = GENDER_MAP_REVERSE[genderStr]
              } else {
                // Try direct mapping
                const lowerGender = genderStr.toLowerCase()
                if (lowerGender === 'm' || lowerGender === 'male') {
                  genderValue = 'male'
                } else if (lowerGender === 'f' || lowerGender === 'female') {
                  genderValue = 'female'
                } else if (lowerGender === 'o' || lowerGender === 'other') {
                  genderValue = 'other'
                } else {
                  genderValue = lowerGender
                }
              }
            } else {
              console.log("Gender is null/empty in API response")
            }

            // Get bio from 'about' field (as per doctor model)
            const bioValue = personalInfo.about || personalInfo.bio || ""
            console.log("Bio value:", bioValue, "from about:", personalInfo.about, "from bio:", personalInfo.bio)

            const newFormData = {
              firstName: personalInfo.first_name || firstName || "",
              lastName: personalInfo.last_name || lastName || "",
              email: personalInfo.email || email || "",
              phone: personalInfo.username || personalInfo.secondary_mobile_number || "",
              dateOfBirth: dobFormatted,
              gender: genderValue,
              bio: bioValue,
            }

            // Debug logging - always log for debugging
            console.log("Form data being set:", {
              dateOfBirth: dobFormatted,
              gender: genderValue,
              bio: bioValue,
              fullFormData: newFormData
            })

            setFormData(newFormData)
            setOriginalData(newFormData)
          } else if (profile?.detail) {
            console.warn("API returned error detail:", profile.detail)
          }
        } catch (apiError: any) {
          // Silently handle errors - localStorage data is already set as fallback
          // Only log detailed error info in development
          if (process.env.NODE_ENV === 'development') {
            console.warn("Profile API error (using cached data):", {
              status: apiError?.status,
              message: apiError?.message,
            })
          }
        }
      } catch (error) {
        console.error("Error loading profile data:", error)
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    }

    loadProfileData()
    
    // Cleanup function to reset ref if component unmounts
    return () => {
      isLoadingRef.current = false
    }
  }, []) // Empty dependency array - only run once on mount

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
      // Prepare data for backend - map to backend field names
      const updatePayload: any = {
        dob: formData.dateOfBirth || null,
        about: formData.bio || "",
      }

      // Always include gender - map to backend format (M/F/O)
      // Allow empty string to clear gender, or map the value
      if (formData.gender) {
        const mappedGender = GENDER_MAP[formData.gender]
        if (mappedGender) {
          updatePayload.gender = mappedGender
        } else if (formData.gender.toUpperCase() === 'M' || formData.gender.toUpperCase() === 'F' || formData.gender.toUpperCase() === 'O') {
          updatePayload.gender = formData.gender.toUpperCase()
        } else {
          // Try to infer from common patterns
          const genderUpper = formData.gender.toUpperCase()
          if (genderUpper.includes('MALE') || genderUpper === 'M') {
            updatePayload.gender = 'M'
          } else if (genderUpper.includes('FEMALE') || genderUpper === 'F') {
            updatePayload.gender = 'F'
          } else {
            updatePayload.gender = 'O'
          }
        }
      } else {
        // If gender is empty, explicitly set to None (but don't send if we want to keep current)
        // For now, we'll only send if it's set
      }

      // Note: firstName, lastName, email, and phone are restricted fields
      // They should not be sent in the update payload

      console.log("Sending update payload:", updatePayload)

      const response = await doctorAPI.updatePersonalInfo(updatePayload)
      
      console.log("Update response:", response)
      
      // Show success notification only on successful response (HTTP 200/204)
      // The API request will throw an error if it fails, so if we reach here, it's successful
      toast.success("Doctor profile updated successfully.", { duration: 2500 })
      setIsEditing(false)
      
      // Update form data from response
      // The response might be the full doctor object or just updated fields
      let dobFormatted = formData.dateOfBirth
      let genderValue = formData.gender
      let bioValue = formData.bio
      
      // Try to extract data from response (handle different response structures)
      const responseData = response?.dob !== undefined ? response : 
                          response?.data || response || {}
      
      if (responseData.dob) {
        try {
          const dob = new Date(responseData.dob)
          if (!isNaN(dob.getTime())) {
            dobFormatted = dob.toISOString().split("T")[0]
          }
        } catch (e) {
          console.warn("Error parsing updated date of birth:", e)
        }
      }
      
      // Handle gender from response
      if (responseData.gender !== undefined && responseData.gender !== null) {
        // Map backend format (M/F/O) to frontend format (male/female/other)
        const genderStr = String(responseData.gender).trim().toUpperCase()
        if (genderStr in GENDER_MAP_REVERSE) {
          genderValue = GENDER_MAP_REVERSE[genderStr]
        } else {
          // Fallback mapping
          if (genderStr === 'M' || genderStr.includes('MALE')) {
            genderValue = 'male'
          } else if (genderStr === 'F' || genderStr.includes('FEMALE')) {
            genderValue = 'female'
          } else {
            genderValue = 'other'
          }
        }
      } else {
        // Keep current formData gender if response doesn't have it
        genderValue = formData.gender
      }
      
      // Handle bio/about from response
      if (responseData.about !== undefined) {
        bioValue = responseData.about || ""
      } else if (responseData.bio !== undefined) {
        bioValue = responseData.bio || ""
      }
      
      const updatedFormData = {
        ...formData,
        dateOfBirth: dobFormatted,
        gender: genderValue,
        bio: bioValue,
      }
      
      setFormData(updatedFormData)
      setOriginalData(updatedFormData)
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update personal information"
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <SimpleFormCard
        title="Personal Information"
        description="Basic information about you"
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
      title="Personal Information"
      description="Basic information about you"
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <ResponsiveFormGrid>
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="firstName"
              value={formData.firstName}
              className="pl-10"
              disabled={true}
              readOnly
            />
            <Alert className="mt-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                To change your name, please contact support.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="lastName"
              value={formData.lastName}
              className="pl-10"
              disabled={true}
              readOnly
            />
            <Alert className="mt-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                To change your name, please contact support.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              className="pl-10"
              value={formData.email}
              disabled={true}
              readOnly
            />
            <Alert className="mt-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                To change your email, please contact support.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              className="pl-10"
              value={formData.phone}
              disabled={true}
              readOnly
            />
            <Alert className="mt-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                To change your phone number, please contact support.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="dateOfBirth"
              type="date"
              className="pl-10"
              value={formData.dateOfBirth || ""}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              disabled={!isEditing}
              placeholder="Select date of birth"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            value={formData.gender || undefined}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
            disabled={!isEditing}
          >
            <SelectTrigger id="gender">
              <SelectValue placeholder={formData.gender ? undefined : "Select gender"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>


        <div className="col-span-full space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={4}
            value={formData.bio || ""}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            disabled={!isEditing}
            placeholder="Tell us about yourself..."
          />
        </div>
      </ResponsiveFormGrid>
    </SimpleFormCard>
  )
}
