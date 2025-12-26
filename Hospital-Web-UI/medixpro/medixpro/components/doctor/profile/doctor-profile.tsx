"use client"

import { useState, useRef, useEffect } from "react"
import {
  User,
  Shield,
  FileText,
  Building2,
  Briefcase,
  GraduationCap,
  CreditCard,
  Camera,
  Loader2,
  Menu,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PersonalInformationSection } from "@/components/doctor/profile/personal-information"
import { AddressDetailsSection } from "@/components/doctor/profile/address-details"
import { ProfessionalDetailsSection } from "@/components/doctor/profile/professional-details"
import { KYCVerificationSection } from "@/components/doctor/profile/kyc-verification"
import { ClinicAssociationSection } from "@/components/doctor/profile/clinic-association"
import { FeeStructureSection } from "@/components/doctor/profile/fee-structure"
import { ServicesOfferedSection } from "@/components/doctor/profile/services-offered"
import { MembershipsSection } from "@/components/doctor/profile/memberships"
import { BankDetailsSection } from "@/components/doctor/profile/bank-details"
import { ProfileSummarySection } from "@/components/doctor/profile/profile-summary"
import { Progress } from "@/components/ui/progress"
import { doctorAPI, APIError } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

interface DoctorProfileData {
  name: string
  role: string
  email: string
  phone: string
  registrationNumber: string
  experience: string
  profilePhoto: string | null
  isVerified: boolean
  profileCompletion: number
}

export function DoctorProfile() {
  const [activeTab, setActiveTab] = useState("personal")
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [doctorData, setDoctorData] = useState<DoctorProfileData>({
    name: "",
    role: "Consultant Physician",
    email: "",
    phone: "",
    registrationNumber: "",
    experience: "0 years",
    profilePhoto: null,
    isVerified: false,
    profileCompletion: 0,
  })
  const toast = useToastNotification()
  const isLoadingRef = useRef(false)

  // Load doctor profile data from localStorage and API
  useEffect(() => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) return
    
    isLoadingRef.current = true
    
    const loadDoctorProfile = async () => {
      try {
        // First, try to load from localStorage
        const firstName = localStorage.getItem("first_name") || ""
        const lastName = localStorage.getItem("last_name") || ""
        const email = localStorage.getItem("email") || ""
        const userId = localStorage.getItem("user_id") || ""
        const username = localStorage.getItem("username") || "" // username is the mobile number

        // Initialize with localStorage data
        setDoctorData((prev) => ({
          ...prev,
          name: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "Doctor",
          email: email || "",
          phone: username, // username is the mobile number
        }))

        // Fetch full profile from API
        try {
          const profileResponse = await doctorAPI.getProfile()
          
          // Check for rate limiting or errors
          if (profileResponse?.detail && profileResponse.detail.includes("throttled")) {
            console.warn("Rate limited, using cached data")
            return
          }
          
          const profile = profileResponse?.doctor_profile || profileResponse

          if (profile && !profile.detail) {
            const personalInfo = profile.personal_info || {}
            const registration = profile.kyc?.registration || {}
            const progress = profile.profile_progress || 0

            // Format name from first_name and last_name
            const fullName = personalInfo.first_name && personalInfo.last_name
              ? `${personalInfo.first_name} ${personalInfo.last_name}`
              : personalInfo.first_name || personalInfo.last_name || firstName || lastName || "Doctor"

            setDoctorData({
              name: fullName,
              role: personalInfo.title || "Consultant Physician",
              email: personalInfo.email || email || "",
              phone: personalInfo.username || personalInfo.secondary_mobile_number || "",
              registrationNumber: registration?.medical_registration_number || "",
              experience: personalInfo.years_of_experience
                ? `${personalInfo.years_of_experience} years`
                : "0 years",
              profilePhoto: personalInfo.profile_photo || null,
              isVerified: profile.kyc?.kyc_status || false,
              profileCompletion: typeof progress === "number" ? progress : 0,
            })
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
        console.error("Error loading doctor profile:", error)
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    }

    loadDoctorProfile()
    
    // Cleanup function to reset ref if component unmounts
    return () => {
      isLoadingRef.current = false
    }
  }, []) // Empty dependency array - only run once on mount

  const handlePhotoUpload = async () => {
    const file = photoInputRef.current?.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo size must be less than 2MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append("photo", file)

      const response = await doctorAPI.uploadPhoto(formData)
      
      // Extract photo URL from Django response structure
      // Django returns: { status: "success", message: "...", data: { photo_url: "..." } }
      const photoUrl = response?.data?.photo_url || response?.photo_url || response?.profile_photo || response?.photo
      
      if (photoUrl) {
        setDoctorData((prev) => ({
          ...prev,
          profilePhoto: photoUrl,
        }))
        toast.success("Profile photo updated successfully!")
      } else if (!isLoadingRef.current) {
        // If no photo URL in response, refresh profile to get updated photo
        toast.success("Profile photo updated successfully!")
        // Only refresh if not already loading
        isLoadingRef.current = true
        try {
          const profileResponse = await doctorAPI.getProfile()
          if (profileResponse?.detail?.includes("throttled")) {
            console.warn("Rate limited after photo upload")
            return
          }
          const profile = profileResponse?.doctor_profile || profileResponse
          if (profile?.personal_info?.profile_photo) {
            setDoctorData((prev) => ({
              ...prev,
              profilePhoto: profile.personal_info.profile_photo,
            }))
          }
        } catch (error) {
          console.error("Failed to refresh profile after photo upload:", error)
        } finally {
          isLoadingRef.current = false
        }
      }
    } catch (error) {
      console.error("Photo upload error:", error)
      if (error instanceof APIError) {
        // Extract error message from Django response structure
        const errorMessage = error.errors?.photo?.[0] || error.message || "Failed to upload photo"
        toast.error(errorMessage)
      } else {
        toast.error("Failed to upload photo. Please try again.")
      }
    } finally {
      setIsUploadingPhoto(false)
      // Reset file input
      if (photoInputRef.current) {
        photoInputRef.current.value = ""
      }
    }
  }

  const MobileNav = () => (
    <div className="flex flex-col gap-1 p-2">
      <Button
        variant={activeTab === "personal" ? "secondary" : "ghost"}
        className="justify-start gap-3"
        onClick={() => {
          setActiveTab("personal")
          setMobileMenuOpen(false)
        }}
      >
        <User className="h-5 w-5" />
        <span>Personal Information</span>
      </Button>
      <Button
        variant={activeTab === "professional" ? "secondary" : "ghost"}
        className="justify-start gap-3"
        onClick={() => {
          setActiveTab("professional")
          setMobileMenuOpen(false)
        }}
      >
        <GraduationCap className="h-5 w-5" />
        <span>Professional Details</span>
      </Button>
      <Button
        variant={activeTab === "kyc" ? "secondary" : "ghost"}
        className="justify-start gap-3"
        onClick={() => {
          setActiveTab("kyc")
          setMobileMenuOpen(false)
        }}
      >
        <Shield className="h-5 w-5" />
        <span>KYC Verification</span>
      </Button>
      <Button
        variant={activeTab === "clinic" ? "secondary" : "ghost"}
        className="justify-start gap-3"
        onClick={() => {
          setActiveTab("clinic")
          setMobileMenuOpen(false)
        }}
      >
        <Building2 className="h-5 w-5" />
        <span>Clinic & Services</span>
      </Button>
      <Button
        variant={activeTab === "financial" ? "secondary" : "ghost"}
        className="justify-start gap-3"
        onClick={() => {
          setActiveTab("financial")
          setMobileMenuOpen(false)
        }}
      >
        <CreditCard className="h-5 w-5" />
        <span>Financial Details</span>
      </Button>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
        {/* Profile Header */}
        <div className="mb-4 flex flex-col gap-4 sm:mb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <div className="group relative shrink-0">
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <Avatar className="h-16 w-16 border-2 border-primary/20 sm:h-20 sm:w-20">
                <AvatarImage src={doctorData.profilePhoto || "/placeholder.svg"} alt={doctorData.name} />
                <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary sm:text-lg">
                  {doctorData.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <button
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white sm:h-6 sm:w-6" />
                ) : (
                  <Camera className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                )}
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-foreground sm:text-xl lg:text-2xl">{doctorData.name}</h1>
                {doctorData.isVerified && (
                  <Badge variant="default" className="bg-success text-success-foreground">
                    <Shield className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground sm:text-base">{doctorData.role}</p>
              <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-4 sm:text-sm">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {doctorData.registrationNumber}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {doctorData.experience}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-foreground sm:text-sm">Profile Completion</div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Progress value={doctorData.profileCompletion} className="h-2 w-32 sm:w-40 lg:w-48" />
              <span className="text-xs font-semibold text-primary sm:text-sm">{doctorData.profileCompletion}%</span>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="rounded-lg border bg-card shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Desktop Navigation */}
            <div className="hidden border-b bg-muted/20 sm:block">
              <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-0 bg-transparent p-0">
                <TabsTrigger
                  value="personal"
                  className="relative gap-2 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-xs font-medium transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none lg:px-6 lg:pb-4 lg:pt-4 lg:text-sm"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Personal</span>
                </TabsTrigger>
                <TabsTrigger
                  value="professional"
                  className="relative gap-2 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-xs font-medium transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none lg:px-6 lg:pb-4 lg:pt-4 lg:text-sm"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Professional</span>
                </TabsTrigger>
                <TabsTrigger
                  value="kyc"
                  className="relative gap-2 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-xs font-medium transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none lg:px-6 lg:pb-4 lg:pt-4 lg:text-sm"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">KYC</span>
                </TabsTrigger>
                <TabsTrigger
                  value="clinic"
                  className="relative gap-2 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-xs font-medium transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none lg:px-6 lg:pb-4 lg:pt-4 lg:text-sm"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Clinic</span>
                </TabsTrigger>
                <TabsTrigger
                  value="financial"
                  className="relative gap-2 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-xs font-medium transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none lg:px-6 lg:pb-4 lg:pt-4 lg:text-sm"
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Financial</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Mobile Navigation */}
            <div className="flex items-center justify-between border-b bg-muted/20 p-3 sm:hidden">
              <span className="text-sm font-medium text-foreground">
                {activeTab === "personal" && "Personal Information"}
                {activeTab === "professional" && "Professional Details"}
                {activeTab === "kyc" && "KYC Verification"}
                {activeTab === "clinic" && "Clinic & Services"}
                {activeTab === "financial" && "Financial Details"}
              </span>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64">
                  <div className="mb-4 text-lg font-semibold">Profile Sections</div>
                  <MobileNav />
                </SheetContent>
              </Sheet>
            </div>

            {/* Tab Content */}
            <div className="p-3 sm:p-4 lg:p-6">
              <TabsContent value="personal" className="mt-0 space-y-4 sm:space-y-6">
                <ProfileSummarySection />
                <PersonalInformationSection />
                <AddressDetailsSection />
              </TabsContent>

              <TabsContent value="professional" className="mt-0">
                <ProfessionalDetailsSection />
              </TabsContent>

              <TabsContent value="kyc" className="mt-0">
                <KYCVerificationSection />
              </TabsContent>

              <TabsContent value="clinic" className="mt-0 space-y-4 sm:space-y-6">
                <ClinicAssociationSection />
                <ServicesOfferedSection />
              </TabsContent>

              <TabsContent value="financial" className="mt-0 space-y-4 sm:space-y-6">
                <FeeStructureSection />
                <MembershipsSection />
                <BankDetailsSection />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
