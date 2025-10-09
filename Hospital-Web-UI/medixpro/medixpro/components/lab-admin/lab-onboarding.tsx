"use client"

import { useState } from "react"
import { AdminDetailsStep } from "./onboarding-steps/admin-details-step"
import { LabDetailsStep } from "./onboarding-steps/lab-details-step"
import { AddressDetailsStep } from "./onboarding-steps/address-details-step"
import { KycDetailsStep } from "./onboarding-steps/kyc-details-step"
import { ReviewStep } from "./onboarding-steps/review-step"
import { SuccessPage } from "./onboarding-steps/success-page"
import { Stepper } from "@/components/ui/stepper"
import { Card } from "@/components/ui/card"
import { Activity } from "lucide-react"

export interface OnboardingData {
  admin_details: {
    first_name: string
    last_name?: string
    username: string
    email?: string
    designation?: string
  }
  lab_details: {
    lab_name: string
    lab_type: string
    license_number?: string
    license_valid_till?: string
    certifications?: string
    service_categories: string[]
    home_sample_collection: boolean
    pricing_tier: string
    turnaround_time_hours: number
  }
  address_details: {
    address: string
    address2?: string
    city: string
    state: string
    pincode: string
    latitude?: number
    longitude?: number
  }
  kyc_details?: {
    kyc_document_type?: string
    kyc_document_number?: string
  }
}

const steps = [
  { id: 1, title: "Admin Details", description: "Your information" },
  { id: 2, title: "Lab Details", description: "Laboratory information" },
  { id: 3, title: "Address", description: "Location details" },
  { id: 4, title: "KYC", description: "Verification documents" },
  { id: 5, title: "Review", description: "Confirm & submit" },
]

export function LabOnboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<OnboardingData>>({
    lab_details: {
      lab_name: "",
      lab_type: "",
      service_categories: [],
      home_sample_collection: false,
      pricing_tier: "Medium",
      turnaround_time_hours: 24,
    },
  })
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedData, setSubmittedData] = useState<any>(null)

  const updateFormData = (section: keyof OnboardingData, data: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: data,
    }))
  }

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 5))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleEdit = (step: number) => {
    setCurrentStep(step)
  }

  const handleSuccess = (data: any) => {
    setSubmittedData(data)
    setIsSuccess(true)
  }

  if (isSuccess) {
    return <SuccessPage data={submittedData} />
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">DoctorProCare</h1>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Diagnostic Lab Registration</h2>
          <p className="mt-2 text-muted-foreground">Join our network of trusted diagnostic laboratories</p>
        </div>

        {/* Stepper */}
        <Card className="mb-8 p-6">
          <Stepper steps={steps} currentStep={currentStep} />
        </Card>

        {/* Step Content */}
        <Card className="p-6 md:p-8">
          {currentStep === 1 && (
            <AdminDetailsStep
              data={formData.admin_details}
              onNext={(data) => {
                updateFormData("admin_details", data)
                handleNext()
              }}
            />
          )}
          {currentStep === 2 && (
            <LabDetailsStep
              data={formData.lab_details}
              onNext={(data) => {
                updateFormData("lab_details", data)
                handleNext()
              }}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && (
            <AddressDetailsStep
              data={formData.address_details}
              onNext={(data) => {
                updateFormData("address_details", data)
                handleNext()
              }}
              onBack={handleBack}
            />
          )}
          {currentStep === 4 && (
            <KycDetailsStep
              data={formData.kyc_details}
              onNext={(data) => {
                updateFormData("kyc_details", data)
                handleNext()
              }}
              onBack={handleBack}
            />
          )}
          {currentStep === 5 && (
            <ReviewStep
              data={formData as OnboardingData}
              onEdit={handleEdit}
              onBack={handleBack}
              onSuccess={handleSuccess}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
