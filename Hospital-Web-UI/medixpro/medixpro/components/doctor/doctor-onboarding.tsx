"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { medicalCouncils } from "@/data/medicalCouncils";

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
)

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
)

const FileTextIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const AlertCircleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
      clipRule="evenodd"
    />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const MailIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
)

const PhoneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
)

const StethoscopeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547A1.934 1.934 0 014 17.5a3.5 3.5 0 003.5 3.5h.5a2 2 0 001.95-1.557l1.045-4.178a2 2 0 00.096-.42l.003-.032a6 6 0 013.834 0l.003.032c.017.14.06.28.096.42l1.045 4.178A2 2 0 0018 21h.5a3.5 3.5 0 003.5-3.5c0-.662-.164-1.288-.572-1.836z"
    />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    />
  </svg>
)

interface FormData {
  user: {
    username: string
    first_name: string
    last_name: string
    email: string
  }
  dob: string
  gender: string
  secondary_mobile_number: string
  digital_signature_consent: boolean
  government_ids: {
    aadhar_card_number: string
    pan_card_number: string
  }
  registration: {
    medical_registration_number: string
    medical_council: string
  }
  terms_conditions_accepted: boolean
  data_storage_consent: boolean
}

interface ValidationErrors {
  [key: string]: string
}

interface RegistrationResponse {
  id: string
  user: {
    id: string
    username: string
    first_name: string
    last_name: string
    email: string
  }
  dob: string
  gender: string
  secondary_mobile_number: string
  digital_signature_consent: boolean
  terms_conditions_accepted: boolean
  data_storage_consent: boolean
  kyc_completed: boolean
  kyc_verified: boolean
  created_at: string
}

const steps = [
  { id: 1, title: "Personal Information", icon: UserIcon, description: "Basic details and contact information" },
  { id: 2, title: "Government IDs", icon: FileTextIcon, description: "Identity verification documents" },
  { id: 3, title: "Medical Registration", icon: ShieldIcon, description: "Professional credentials and consent" },
  { id: 4, title: "System & Compliance", icon: SparklesIcon, description: "Terms & conditions and data consent" },
]

export function DoctorOnboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [registrationData, setRegistrationData] = useState<RegistrationResponse | null>(null)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [formData, setFormData] = useState<FormData>({
    user: {
      username: "",
      first_name: "",
      last_name: "",
      email: "",
    },
    dob: "",
    gender: "",
    secondary_mobile_number: "",
    digital_signature_consent: false,
    government_ids: {
      aadhar_card_number: "",
      pan_card_number: "",
    },
    registration: {
      medical_registration_number: "",
      medical_council: "",
    },
    terms_conditions_accepted: false,
    data_storage_consent: false,
  })

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateMobile = (mobile: string): boolean => {
    const mobileRegex = /^[6-9]\d{9}$/
    return mobileRegex.test(mobile)
  }

  const validateAadhar = (aadhar: string): boolean => {
    const aadharRegex = /^\d{12}$/
    return aadharRegex.test(aadhar)
  }

  const validatePAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    return panRegex.test(pan)
  }

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {}

    if (step === 1) {
      //FOR DEV PURPOSES, SKIPPING VALIDATION
      console.log("Validating Step 1")
    }

    if (step === 2) {
      //FOR DEV PURPOSES, SKIPPING VALIDATION
      console.log("Validating Step 2")
    }

    if (step === 3) {
      console.log("Validating Step 3")
      //FOR DEV PURPOSES, SKIPPING VALIDATION
    }

    if (step === 4) {
      console.log("Validating Step 4")
      //FOR DEV PURPOSES, SKIPPING VALIDATION
    }

    //setErrors(newErrors)
    //return Object.keys(newErrors).length === 0
    return true // FOR DEV PURPOSES, ALLOWING TO PROCEED WITHOUT VALIDATION
  }

  const updateFormData = (section: keyof FormData, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]:
        typeof prev[section] === "object" && prev[section] !== null ? { ...prev[section], [field]: value } : value,
    }))

    const errorKey =
      section === "user" ? field : section === "government_ids" ? field : section === "registration" ? field : field
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  // const handleSubmit = async () => {

  //   //if (!validateStep(4)) return
  //   console.log("I am in handleSubmit method")
  //   setIsSubmitting(true)
  //   try {
  //     const response = await fetch("/api/doctor/onboarding/phase1", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(formData),
  //     })
  //     console.log("I am in handleSubmit method")
  //     const data = await response.json();
  //     console.log("Response Data:", data);
  //       if (data.status === "error") {
  //         console.log("Validation Errors:", data.errors);
  //         // ✅ Show them in your UI
  //         // e.g. set state for field errors
  //         setErrors(data.errors);
  //         return;
  //       }
  //     if (response.ok) {
  //       const result = await response.json()
  //       console.log("Registration successful:", result)
  //       setRegistrationData(result)
  //       setIsSuccess(true)
  //     } else {
  //       const errorData = await response.json()
  //       setErrors({ submit: errorData.error || "Registration failed. Please try again." })
  //     }
  //   } catch (error) {
  //     console.error("Error submitting form:", error)
  //     setErrors({ submit: "Network error. Please check your connection and try again." })
  //   } finally {
  //     setIsSubmitting(false)
  //   }
  // }
  const flattenErrors = (errors: any) => {
    const flatErrors: ValidationErrors = {};

    const helper = (obj: any, prefix = "") => {
      for (const key in obj) {
        if (Array.isArray(obj[key])) {
          // Map nested errors to form field names
          if (prefix === "user.") {
            flatErrors[key] = obj[key].join(" ");
          } else if (prefix === "government_ids.") {
            // Map government ID fields to form field names
            if (key === "aadhar_card_number") {
              flatErrors["aadhar"] = obj[key].join(" ");
            } else if (key === "pan_card_number") {
              flatErrors["pan"] = obj[key].join(" ");
            } else {
              flatErrors[key] = obj[key].join(" ");
            }
          } else if (prefix === "registration.") {
            // Map registration fields to form field names
            if (key === "medical_registration_number") {
              flatErrors["medical_registration"] = obj[key].join(" ");
            } else if (key === "medical_council") {
              flatErrors["medical_council"] = obj[key].join(" ");
            } else {
              flatErrors[key] = obj[key].join(" ");
            }
          } else {
            flatErrors[prefix + key] = obj[key].join(" ");
          }
        } else if (typeof obj[key] === "object") {
          helper(obj[key], prefix + key + ".");
        } else {
          // Handle direct field errors and map them to form field names
          if (key === "digital_signature_consent") {
            flatErrors["digital_consent"] = obj[key];
          } else if (key === "terms_conditions_accepted") {
            flatErrors["terms_conditions"] = obj[key];
          } else if (key === "data_storage_consent") {
            flatErrors["data_storage"] = obj[key];
          } else {
            flatErrors[key] = obj[key];
          }
        }
      }
    };

    helper(errors);
    console.log("Flattened errors:", flatErrors);
    return flatErrors;
  };
  const handleSubmit = async () => {
    console.log("Starting form submission...");
    setErrors({});
    setIsSubmitting(true);
    
    try {
      console.log("Form data being submitted:", formData);
      
      const response = await fetch("/api/doctor/onboarding/phase1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Full API response:", result);

      if (response.ok && result.status === "success") {
        console.log("✅ Registration successful!");
        setRegistrationData(result.data);
        setIsSuccess(true);
      } else {
        console.log("❌ Registration failed:", result);
        
        // Handle validation errors
        if (result.errors) {
          console.log("Validation errors:", result.errors);
          const flatErrors = flattenErrors(result.errors);
          console.log("Flattened errors:", flatErrors);
          setErrors(flatErrors);
        } else if (result.message) {
          setErrors({ submit: result.message });
        } else {
          setErrors({ submit: "Registration failed. Please try again." });
        }
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      setErrors({ submit: "Network error. Please check your connection and try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    console.log("Current Step:", currentStep)
    if (validateStep(currentStep) && currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setErrors({}) // Clear errors when going back
    }
  }

  const startNewRegistration = () => {
    setIsSuccess(false)
    setRegistrationData(null)
    setCurrentStep(1)
    setErrors({})
    setFormData({
      user: {
        username: "",
        first_name: "",
        last_name: "",
        email: "",
      },
      dob: "",
      gender: "",
      secondary_mobile_number: "",
      digital_signature_consent: false,
      government_ids: {
        aadhar_card_number: "",
        pan_card_number: "",
      },
      registration: {
        medical_registration_number: "",
        medical_council: "",
      },
      terms_conditions_accepted: false,
      data_storage_consent: false,
    })
  }

  const progress = (currentStep / steps.length) * 100

  if (isSuccess && registrationData) {
    return (
      <div className="min-h-screen gradient-bg relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-20 sm:w-32 h-20 sm:h-32 bg-medical-blue/10 rounded-full blur-3xl animate-float"></div>
          <div
            className="absolute top-20 sm:top-40 right-10 sm:right-20 w-16 sm:w-24 h-16 sm:h-24 bg-success-green/10 rounded-full blur-2xl animate-float"
            style={{ animationDelay: "2s" }}
          ></div>
          <div
            className="absolute bottom-20 sm:bottom-32 left-1/4 w-24 sm:w-40 h-24 sm:h-40 bg-medical-teal/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "4s" }}
          ></div>
        </div>

        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8 relative z-10">
          <Card className="max-w-4xl mx-auto glass-card animate-slide-up">
            <CardContent className="pt-6 sm:pt-12 pb-6 sm:pb-8 px-4 sm:px-6 lg:px-8">
              <div className="text-center space-y-4 sm:space-y-8">
                <div className="mx-auto w-20 sm:w-28 h-20 sm:h-28 medical-gradient rounded-full flex items-center justify-center shadow-2xl animate-pulse-slow">
                  <CheckCircleIcon />
                </div>

                <div className="space-y-2 sm:space-y-4">
                  <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-medical-blue to-medical-teal bg-clip-text text-transparent">
                    Registration Successful!
                  </h1>
                  <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance px-4">
                    Welcome to our EMR platform, Your journey to digital healthcare begins now.
                    Admin will verify your documents within 24-48 hours.will notify you via email once the verification is complete.
                    {/* Welcome to our EMR platform, Dr. {registrationData.user.first_name}{" "}
                    {registrationData.user.last_name}. Your journey to digital healthcare begins now. */}
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-4 sm:p-8 text-left space-y-4 sm:space-y-6 animate-fade-in">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-8 sm:w-10 h-8 sm:h-10 medical-gradient rounded-lg flex items-center justify-center">
                      <FileTextIcon />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground">Registration Details</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 text-sm">
                    <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-accent/30 rounded-xl">
                      <p className="text-muted-foreground font-medium text-xs sm:text-sm">Registration ID</p>
                      <p className="font-mono text-foreground break-all text-xs bg-background/50 p-2 rounded-lg">
                        {registrationData.id}
                      </p>
                    </div>
                    <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-accent/30 rounded-xl">
                      <p className="text-muted-foreground font-medium text-xs sm:text-sm">User ID</p>
                      <p className="font-mono text-foreground break-all text-xs bg-background/50 p-2 rounded-lg">
                        {registrationData.user.id}
                      </p>
                    </div>
                    <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-accent/30 rounded-xl">
                      <p className="text-muted-foreground font-medium text-xs sm:text-sm">Username</p>
                      <p className="font-semibold text-foreground text-sm">{registrationData.user.username}</p>
                    </div>
                    <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-accent/30 rounded-xl">
                      <p className="text-muted-foreground font-medium text-xs sm:text-sm">Email</p>
                      <p className="font-semibold text-foreground text-sm break-all">{registrationData.user.email}</p>
                    </div>
                    <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-accent/30 rounded-xl">
                      <p className="text-muted-foreground font-medium text-xs sm:text-sm">Registration Date</p>
                      <p className="font-semibold text-foreground text-sm">
                        {new Date(registrationData.created_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-accent/30 rounded-xl">
                      <p className="text-muted-foreground font-medium text-xs sm:text-sm">KYC Status</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={registrationData.kyc_completed ? "default" : "secondary"}
                          className={`text-xs ${registrationData.kyc_completed ? "success-gradient text-white" : ""}`}
                        >
                          {registrationData.kyc_completed ? "Completed" : "Pending"}
                        </Badge>
                        {registrationData.kyc_verified ? (
                          <Badge className="success-gradient text-white text-xs">
                            <CheckCircleIcon />
                            <span className="ml-1">Verified</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-warning-amber text-warning-amber text-xs">
                            <ClockIcon />
                            <span className="ml-1">Pending Verification</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="glass-card rounded-2xl p-4 sm:p-8 border border-medical-blue/20 animate-fade-in"
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-8 sm:w-10 h-8 sm:h-10 bg-info-cyan/20 rounded-lg flex items-center justify-center">
                      <SparklesIcon />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground">What's Next?</h3>
                  </div>
                  <div className="space-y-4 sm:space-y-6 text-left">
                    <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-medical-blue/5 to-transparent rounded-xl">
                      <div className="w-8 sm:w-10 h-8 sm:h-10 medical-gradient rounded-lg flex items-center justify-center flex-shrink-0">
                        <MailIcon />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1 text-sm sm:text-base">Check Your Email</p>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          We've sent a verification email to {registrationData.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-warning-amber/5 to-transparent rounded-xl">
                      <div className="w-8 sm:w-10 h-8 sm:h-10 bg-warning-amber/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ClockIcon />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1 text-sm sm:text-base">KYC Verification</p>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          Our team will verify your documents within 24-48 hours
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-success-green/5 to-transparent rounded-xl">
                      <div className="w-8 sm:w-10 h-8 sm:h-10 success-gradient rounded-lg flex items-center justify-center flex-shrink-0">
                        <PhoneIcon />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1 text-sm sm:text-base">Account Activation</p>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          You'll receive an SMS once your account is activated
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6"> 
                  <Button
                    onClick={() => (window.location.href = "/login")}
                    className="flex-1 medical-gradient hover:opacity-90 text-white font-semibold py-4 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <StethoscopeIcon />
                    <span className="ml-2">Go to Login</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={startNewRegistration}
                    className="flex-1 glass-card hover:bg-accent/50 py-4 sm:py-6 text-base sm:text-lg font-semibold transition-all duration-300 bg-transparent"
                  >
                    <UserIcon />
                    <span className="ml-2">Register Another Doctor</span>
                  </Button>
                </div> */}

                <div className="text-center pt-4 sm:pt-6 border-t border-border/50">
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed px-4">
                    Need help? Contact our support team at{" "}
                    <a
                      href="mailto:support@emr-platform.com"
                      className="text-medical-blue hover:text-medical-blue-light transition-colors font-medium"
                    >
                      support@emr-platform.com
                    </a>{" "}
                    or call{" "}
                    <a
                      href="tel:+911234567890"
                      className="text-medical-blue hover:text-medical-blue-light transition-colors font-medium"
                    >
                      +91 12345 67890
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-20 sm:w-32 h-20 sm:h-32 bg-medical-blue/10 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute top-20 sm:top-40 right-10 sm:right-20 w-16 sm:w-24 h-16 sm:h-24 bg-success-green/10 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-20 sm:bottom-32 left-1/4 w-24 sm:w-40 h-24 sm:h-40 bg-medical-teal/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "4s" }}
        ></div>
        <div
          className="absolute top-1/2 right-5 sm:right-10 w-16 sm:w-20 h-16 sm:h-20 bg-info-cyan/10 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-6 relative z-10">
        <div className="max-w-4xl mx-auto mb-4 sm:mb-8 animate-slide-up">
          <div className="glass-card rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              {steps.map((step, index) => {
                const StepIcon = step.icon
                const isCompleted = currentStep > step.id
                const isCurrent = currentStep === step.id

                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`
                      flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 rounded-xl border-2 transition-all duration-300 shadow-lg
                      ${
                        isCompleted
                          ? "medical-gradient border-transparent text-white shadow-medical-blue/25"
                          : isCurrent
                            ? "border-medical-blue text-medical-blue bg-medical-blue/10 shadow-medical-blue/20"
                            : "border-muted text-muted-foreground bg-background/50"
                      }
                    `}
                    >
                      {isCompleted ? <CheckCircleIcon /> : <StepIcon />}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`
                        w-12 sm:w-20 h-1 mx-2 sm:mx-3 rounded-full transition-all duration-500
                        ${isCompleted ? "medical-gradient" : "bg-border"}
                      `}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <Progress value={progress} className="h-2 mb-2 sm:mb-3" />
            <div className="flex justify-between">
              {steps.map((step) => (
                <div key={step.id} className="text-center max-w-[100px] sm:max-w-[120px]">
                  <p
                    className={`
                    text-xs sm:text-sm font-semibold mb-1
                    ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}
                  `}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground text-balance hidden sm:block">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Card className="max-w-4xl mx-auto glass-card animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="text-center pb-3 sm:pb-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
              <div className="w-6 sm:w-8 h-6 sm:h-8 medical-gradient rounded-lg flex items-center justify-center">
                {React.createElement(steps[currentStep - 1].icon, { className: "w-3 sm:w-4 h-3 sm:h-4 text-white" })}
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                {steps[currentStep - 1].title}
              </CardTitle>
            </div>
            <CardDescription className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto text-balance px-2">
              {steps[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
            {errors.submit && (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
                <AlertCircleIcon />
                <AlertDescription className="text-sm sm:text-base">{errors.submit}</AlertDescription>
              </Alert>
            )}

            {currentStep === 1 && (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-sm font-medium">
                      First Name *
                    </Label>
                    <Input
                      id="first_name"
                      value={formData.user.first_name}
                      onChange={(e) => updateFormData("user", "first_name", e.target.value)}
                      placeholder="Enter your first name"
                      className={`h-11 sm:h-12 ${errors.first_name ? "border-destructive" : ""}`}
                      required
                    />
                    {errors.first_name && <p className="text-xs sm:text-sm text-destructive">{errors.first_name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-sm font-medium">
                      Last Name *
                    </Label>
                    <Input
                      id="last_name"
                      value={formData.user.last_name}
                      onChange={(e) => updateFormData("user", "last_name", e.target.value)}
                      placeholder="Enter your last name"
                      className={`h-11 sm:h-12 ${errors.last_name ? "border-destructive" : ""}`}
                      required
                    />
                    {errors.last_name && <p className="text-xs sm:text-sm text-destructive">{errors.last_name}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Mobile Number (Username) *
                  </Label>
                  <Input
                    id="username"
                    value={formData.user.username}
                    onChange={(e) => updateFormData("user", "username", e.target.value)}
                    placeholder="Enter your mobile number"
                    className={`h-11 sm:h-12 ${errors.username ? "border-destructive" : ""}`}
                    required
                  />
                  {errors.username && <p className="text-xs sm:text-sm text-destructive">{errors.username}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.user.email}
                    onChange={(e) => updateFormData("user", "email", e.target.value)}
                    placeholder="Enter your email address"
                    className={`h-11 sm:h-12 ${errors.email ? "border-destructive" : ""}`}
                    required
                  />
                  {errors.email && <p className="text-xs sm:text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dob" className="text-sm font-medium">
                      Date of Birth *
                    </Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dob: e.target.value }))}
                      className={`h-11 sm:h-12 ${errors.dob ? "border-destructive" : ""}`}
                      required
                    />
                    {errors.dob && <p className="text-xs sm:text-sm text-destructive">{errors.dob}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm font-medium">
                      Gender *
                    </Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => {
                        setFormData((prev) => ({ ...prev, gender: value }))
                        if (errors.gender) {
                          setErrors((prev) => {
                            const newErrors = { ...prev }
                            delete newErrors.gender
                            return newErrors
                          })
                        }
                      }}
                    >
                      <SelectTrigger className={`h-11 sm:h-12 ${errors.gender ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                        <SelectItem value="O">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-xs sm:text-sm text-destructive">{errors.gender}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary_mobile" className="text-sm font-medium">
                    Secondary Mobile Number
                  </Label>
                  <Input
                    id="secondary_mobile"
                    value={formData.secondary_mobile_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, secondary_mobile_number: e.target.value }))}
                    placeholder="Enter secondary mobile number (optional)"
                    className="h-11 sm:h-12"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-accent/50 p-3 sm:p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Identity Verification</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Please provide your government ID numbers for identity verification. All information is encrypted
                    and stored securely.
                  </p>
                </div>

                <div className="space-y-4 p-4 border border-border/50 rounded-lg bg-card/50">
                  <h4 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-bold">A</span>
                    </div>
                    Aadhar Card Details
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="aadhar" className="text-sm font-medium">
                        Aadhar Card Number *
                      </Label>
                      <Input
                        id="aadhar"
                        value={formData.government_ids.aadhar_card_number}
                        onChange={(e) => updateFormData("government_ids", "aadhar_card_number", e.target.value)}
                        placeholder="Enter your 12-digit Aadhar number"
                        maxLength={12}
                        className={`h-11 sm:h-12 ${errors.aadhar ? "border-destructive" : ""}`}
                        required
                      />
                      {errors.aadhar && <p className="text-xs sm:text-sm text-destructive">{errors.aadhar}</p>}
                      <p className="text-xs text-muted-foreground">
                        Enter 12-digit Aadhar number without spaces or dashes
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 border border-border/50 rounded-lg bg-card/50">
                  <h4 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-xs font-bold">P</span>
                    </div>
                    PAN Card Details
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="pan" className="text-sm font-medium">
                        PAN Card Number *
                      </Label>
                      <Input
                        id="pan"
                        value={formData.government_ids.pan_card_number}
                        onChange={(e) =>
                          updateFormData("government_ids", "pan_card_number", e.target.value.toUpperCase())
                        }
                        placeholder="Enter your PAN number (e.g., ABCDE1234F)"
                        maxLength={10}
                        className={`h-11 sm:h-12 ${errors.pan ? "border-destructive" : ""}`}
                        required
                      />
                      {errors.pan && <p className="text-xs sm:text-sm text-destructive">{errors.pan}</p>}
                      <p className="text-xs text-muted-foreground">
                        Enter 10-character PAN number (5 letters + 4 digits + 1 letter)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <ShieldIcon />
                    <div>
                      <h5 className="font-semibold text-blue-900 text-sm">Security & Privacy</h5>
                      <p className="text-xs text-blue-700 mt-1">
                        All information is encrypted using AES-256 encryption and stored securely. Your personal
                        information is protected according to data privacy regulations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-medical-blue/10 p-3 sm:p-4 rounded-lg border border-medical-blue/20">
                  <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Professional Credentials</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Provide your medical registration details to verify your professional credentials.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medical_registration" className="text-sm font-medium">
                    Medical Registration Number *
                  </Label>
                  <Input
                    id="medical_registration"
                    value={formData.registration.medical_registration_number}
                    onChange={(e) => updateFormData("registration", "medical_registration_number", e.target.value)}
                    placeholder="Enter your medical registration number"
                    className={`h-11 sm:h-12 ${errors.medical_registration ? "border-destructive" : ""}`}
                    required
                  />
                  {errors.medical_registration && (
                    <p className="text-xs sm:text-sm text-destructive">{errors.medical_registration}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medical_council" className="text-sm font-medium">
                    Medical Council *
                  </Label>
                  <Select
                    value={formData.registration.medical_council}
                    onValueChange={(value) => {
                      updateFormData("registration", "medical_council", value)
                      if (errors.medical_council) {
                        setErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.medical_council
                          return newErrors
                        })
                      }
                    }}
                  >
                    <SelectTrigger className={`h-11 sm:h-12 ${errors.medical_council ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select your medical council" />
                    </SelectTrigger>
                         <SelectContent>
                                {medicalCouncils.map((council) => (
                                  <SelectItem key={council.value} value={council.value}>
                                    {council.label}
                                  </SelectItem>
                                ))}
                          </SelectContent>
                  </Select>
                  {errors.medical_council && (
                    <p className="text-xs sm:text-sm text-destructive">{errors.medical_council}</p>
                  )}
                </div>

                <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="digital_consent"
                      checked={formData.digital_signature_consent}
                      onCheckedChange={(checked) => {
                        setFormData((prev) => ({ ...prev, digital_signature_consent: checked as boolean }))
                        if (errors.digital_consent) {
                          setErrors((prev) => {
                            const newErrors = { ...prev }
                            delete newErrors.digital_consent
                            return newErrors
                          })
                        }
                      }}
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="digital_consent"
                        className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Digital Signature Consent *
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        I consent to use digital signatures for medical documents and prescriptions as per applicable
                        regulations.
                      </p>
                      {errors.digital_consent && (
                        <p className="text-xs sm:text-sm text-destructive">{errors.digital_consent}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-gradient-to-r from-medical-blue/10 to-medical-teal/10 p-4 sm:p-6 rounded-lg border border-medical-blue/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 medical-gradient rounded-lg flex items-center justify-center">
                      <ShieldIcon />
                    </div>
                    <h3 className="font-semibold text-foreground text-base sm:text-lg">System & Compliance</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Please review and accept our terms and conditions, and provide consent for secure data storage in
                    compliance with HIPAA and GDPR regulations.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="glass-card p-4 sm:p-6 rounded-lg border border-border/50">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="terms_conditions"
                        checked={formData.terms_conditions_accepted}
                        onCheckedChange={(checked) => {
                          setFormData((prev) => ({ ...prev, terms_conditions_accepted: checked as boolean }))
                          if (errors.terms_conditions) {
                            setErrors((prev) => {
                              const newErrors = { ...prev }
                              delete newErrors.terms_conditions
                              return newErrors
                            })
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="space-y-2 flex-1">
                        <Label
                          htmlFor="terms_conditions"
                          className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Terms & Conditions Acceptance *
                        </Label>
                        <div className="text-xs text-muted-foreground space-y-2">
                          <p>
                            I have read, understood, and agree to be bound by the{" "}
                            <a
                              href="#"
                              className="text-medical-blue hover:text-medical-blue-light font-medium underline"
                            >
                              Terms of Service
                            </a>{" "}
                            and{" "}
                            <a
                              href="#"
                              className="text-medical-blue hover:text-medical-blue-light font-medium underline"
                            >
                              Privacy Policy
                            </a>{" "}
                            of this EMR platform.
                          </p>
                          <p>
                            This includes acceptance of platform usage guidelines, professional conduct standards, and
                            liability terms for medical practice through this system.
                          </p>
                        </div>
                        {errors.terms_conditions && (
                          <p className="text-xs text-destructive">{errors.terms_conditions}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-4 sm:p-6 rounded-lg border border-border/50">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="data_storage_consent"
                        checked={formData.data_storage_consent}
                        onCheckedChange={(checked) => {
                          setFormData((prev) => ({ ...prev, data_storage_consent: checked as boolean }))
                          if (errors.data_storage) {
                            setErrors((prev) => {
                              const newErrors = { ...prev }
                              delete newErrors.data_storage
                              return newErrors
                            })
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="space-y-2 flex-1">
                        <Label
                          htmlFor="data_storage_consent"
                          className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Consent for Data Storage (HIPAA/GDPR Alignment) *
                        </Label>
                        <div className="text-xs text-muted-foreground space-y-2">
                          <p>
                            I consent to the secure storage and processing of my personal and professional data in
                            accordance with:
                          </p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>
                              <strong>HIPAA</strong> - Health Insurance Portability and Accountability Act compliance
                              for protected health information
                            </li>
                            <li>
                              <strong>GDPR</strong> - General Data Protection Regulation for data privacy and security
                            </li>
                            <li>
                              <strong>Local regulations</strong> - Applicable data protection laws in your jurisdiction
                            </li>
                          </ul>
                          <p>
                            Your data will be encrypted, stored securely, and used only for legitimate medical practice
                            and platform functionality. You retain the right to access, modify, or delete your data as
                            per applicable regulations.
                          </p>
                        </div>
                        {errors.data_storage && <p className="text-xs text-destructive">{errors.data_storage}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-success-green/10 to-medical-teal/10 p-4 rounded-lg border border-success-green/20">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 success-gradient rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircleIcon />
                      </div>
                      <div>
                        <h5 className="font-semibold text-success-green text-sm mb-1">Data Security Commitment</h5>
                        <p className="text-xs text-muted-foreground">
                          We employ industry-standard security measures including AES-256 encryption, secure data
                          centers, regular security audits, and strict access controls to protect your information. Our
                          platform is designed to meet the highest standards of medical data security and privacy.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-border/50">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center justify-center gap-2 glass-card hover:bg-accent/50 py-3 sm:py-4 px-4 sm:px-6 text-sm sm:text-base font-semibold transition-all duration-300 disabled:opacity-50 order-2 sm:order-1 border-[#673147] text-[#673147] hover:bg-[#673147]/10 bg-transparent"
              >
                <ArrowLeftIcon />
                Previous
              </Button>

              {currentStep < steps.length ? (
                <Button
                  onClick={nextStep}
                  className="flex items-center justify-center gap-2 medical-gradient hover:opacity-90 text-white py-3 sm:py-4 px-4 sm:px-6 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 order-1 sm:order-2 bg-[#4B0082] hover:bg-[#3a0068]"
                >
                  Next
                  <ArrowRightIcon />
                </Button>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Simple Test Button */}
                  <Button
                    type="button"
                    onClick={async () => {
                      console.log("🧪 Simple test button clicked!");
                      try {
                        const testData = {
                          user: { username: "1234567890", first_name: "Test", last_name: "Doctor", email: "test@test.com" },
                          dob: null,
                          gender: "Male",
                          secondary_mobile_number: "",
                          digital_signature_consent: true,
                          government_ids: { aadhar_card_number: "", pan_card_number: "" },
                          registration: { medical_registration_number: "", medical_council: "" },
                          terms_conditions_accepted: true,
                          data_storage_consent: true,
                        };
                        
                        console.log("🧪 Sending test data:", testData);
                        const response = await fetch("/api/doctor/onboarding/phase1", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(testData),
                        });
                        
                        const result = await response.json();
                        console.log("🧪 Test response:", result);
                        
                        if (response.ok && result.status === "success") {
                          console.log("🧪 Test SUCCESS!");
                          setRegistrationData(result.data);
                          setIsSuccess(true);
                        } else {
                          console.log("🧪 Test failed:", result);
                        }
                      } catch (error) {
                        console.error("🧪 Test error:", error);
                      }
                    }}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 text-sm font-medium"
                  >
                    🧪 Test API
                  </Button>
                  
                  {/* Main Submit Button */}
                  <Button
                    type="button"
                    onClick={() => {
                      console.log("🔥 Submit button clicked!");
                      console.log("isSubmitting state:", isSubmitting);
                      console.log("Button disabled state:", isSubmitting);
                      if (!isSubmitting) {
                        handleSubmit();
                      } else {
                        console.log("Button is disabled, not calling handleSubmit");
                      }
                    }}
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 success-gradient hover:opacity-90 text-white py-3 sm:py-4 px-4 sm:px-6 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-70 order-1 sm:order-2 bg-[#4B0082] hover:bg-[#3a0068]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <CheckCircleIcon />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div
          className="text-center mt-4 sm:mt-8 text-muted-foreground animate-fade-in"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="glass-card rounded-xl p-3 sm:p-4 max-w-2xl mx-auto">
            <p className="text-xs sm:text-sm leading-relaxed">
              By registering, you agree to our{" "}
              <a href="#" className="text-medical-blue hover:text-medical-blue-light transition-colors font-medium">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-medical-blue hover:text-medical-blue-light transition-colors font-medium">
                Privacy Policy
              </a>
              .
              <br className="hidden sm:block" />
              <span className="block sm:inline mt-1 sm:mt-0">
                Need help? Contact support at{" "}
                <a
                  href="mailto:support@emr-platform.com"
                  className="text-medical-blue hover:text-medical-blue-light transition-colors font-medium"
                >
                  support@emr-platform.com
                </a>
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default DoctorOnboarding