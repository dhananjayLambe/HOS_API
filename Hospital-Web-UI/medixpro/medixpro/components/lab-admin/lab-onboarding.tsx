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
import { FlaskConical } from "lucide-react"

export interface OnboardingData {
  admin_details: {
    first_name: string
    last_name?: string
    username: string
    email?: string
    designation?: string
    whatsapp_same_as_mobile?: boolean
  }
  lab_details: {
    organization_name: string
    display_name: string
    lab_type: string
    license_number?: string
    registration_number?: string
    home_sample_collection: boolean
    walk_in_collection: boolean
  }
  address_details: {
    address: string
    address2?: string
    landmark?: string
    city: string
    state: string
    pincode: string
  }
  kyc_details?: {
    pan_number?: string
    gst_number?: string
    lab_license_file_name?: string
    nabl_certificate_file_name?: string
    /** data URL (base64) sent to API for storage as LabDocument */
    lab_license_file_base64?: string
    nabl_certificate_file_base64?: string
  }
}

const steps = [
  { id: 1, title: "Contact Details", description: "How we reach you" },
  { id: 2, title: "Lab Information", description: "Basic lab details" },
  { id: 3, title: "Branch Address", description: "Primary branch location" },
  { id: 4, title: "Compliance Documents (Optional)", description: "Upload now or later" },
  { id: 5, title: "Review & Submit", description: "Confirm and send" },
]

export function LabOnboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<OnboardingData>>({
    lab_details: {
      organization_name: "",
      display_name: "",
      lab_type: "",
      home_sample_collection: false,
      walk_in_collection: true,
    },
  })
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedData, setSubmittedData] = useState<Partial<OnboardingData> | null>(null)

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

  const handleSuccess = (data: Partial<OnboardingData>) => {
    setSubmittedData(data)
    setIsSuccess(true)
  }

  if (isSuccess && submittedData) {
    return <SuccessPage data={submittedData} />
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
              <FlaskConical className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">MedixPro</h1>
          </div>
          <h2 className="text-xl font-semibold text-foreground md:text-2xl">Lab registration</h2>
          <p className="mt-1.5 text-sm text-muted-foreground md:text-base">
            Quick setup — admin approval required before login
          </p>
        </div>

        <Card className="mb-6 p-4 md:p-5">
          <Stepper steps={steps} currentStep={currentStep} />
        </Card>

        <Card className="p-4 md:p-6">
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
