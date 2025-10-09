"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { User, Building2, MapPin, FileCheck, Edit, AlertCircle, Loader2, XCircle } from "lucide-react"
import type { OnboardingData } from "../lab-onboarding"

interface ReviewStepProps {
  data: OnboardingData
  onEdit: (step: number) => void
  onBack: () => void
  onSuccess: (data: any) => void
}

export function ReviewStep({ data, onEdit, onBack, onSuccess }: ReviewStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [errorDetails, setErrorDetails] = useState<string[]>([])
  const [errorType, setErrorType] = useState<string>("")
  const { toast } = useToast()

  const handleSubmit = async () => {
    setShowConfirmDialog(false)
    setIsSubmitting(true)

    try {
      console.log("[v0] ========== STARTING FORM SUBMISSION ==========")
      console.log("[v0] Original form data:", data)

      const flattenedData = {
        // Admin details
        first_name: data.admin_details?.first_name || "",
        last_name: data.admin_details?.last_name || "",
        mobile_or_username: data.admin_details?.username || "",
        email: data.admin_details?.email || "",
        designation: data.admin_details?.designation || "",

        // Lab details
        lab_name: data.lab_details?.lab_name || "",
        lab_type: data.lab_details?.lab_type || "",
        license_number: data.lab_details?.license_number || "",
        license_valid_till: data.lab_details?.license_valid_till || "",
        certifications: data.lab_details?.certifications || "",
        service_categories: data.lab_details?.service_categories || [],
        home_sample_collection: data.lab_details?.home_sample_collection || false,
        pricing_tier: data.lab_details?.pricing_tier || "Medium",
        turnaround_time_hours: data.lab_details?.turnaround_time_hours || 24,

        // Address details
        address_line1: data.address_details?.address || "",
        address_line2: data.address_details?.address2 || "",
        city: data.address_details?.city || "",
        state: data.address_details?.state || "",
        pincode: data.address_details?.pincode || "",
        latitude: data.address_details?.latitude || 0,
        longitude: data.address_details?.longitude || 0,

        // KYC details
        kyc_document_type: data.kyc_details?.kyc_document_type || "",
        kyc_document_number: data.kyc_details?.kyc_document_number || "",
      }

      console.log("[v0] Flattened data for API:", flattenedData)
      console.log("[v0] Calling API endpoint: /api/lab-admin/onboarding")

      let response: Response
      try {
        response = await fetch("/api/lab-admin/onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(flattenedData),
        })
        console.log("[v0] API response received - Status:", response.status)
        console.log("[v0] API response content-type:", response.headers.get("content-type"))
      } catch (fetchError) {
        console.log("[v0] Network error during fetch:", fetchError)
        throw new Error("Network error. Please check your internet connection and try again.")
      }

      const contentType = response.headers.get("content-type")
      let result: any

      if (contentType && contentType.includes("application/json")) {
        try {
          result = await response.json()
          console.log("[v0] API response parsed:", result)
        } catch (jsonError) {
          console.log("[v0] Failed to parse JSON response:", jsonError)
          const textResponse = await response.text()
          console.log("[v0] Raw response:", textResponse.substring(0, 200))
          throw new Error("Server returned an invalid response. Please try again later.")
        }
      } else {
        // Response is not JSON (probably HTML error page)
        const textResponse = await response.text()
        console.log("[v0] Non-JSON response received:", textResponse.substring(0, 200))

        if (textResponse.includes("<!DOCTYPE") || textResponse.includes("<html")) {
          throw new Error(
            "Backend server is not responding correctly. Please ensure the Django server is running at http://127.0.0.1:8000",
          )
        }

        throw new Error("Server returned an unexpected response format. Please try again later.")
      }

      console.log("[v0] Response success:", result.success)

      if (!response.ok || !result.success) {
        console.log("[v0] API returned error:", result)
        setErrorType(result.errorType || "unknown")
        setErrorMessage(result.error || "Submission failed. Please try again.")
        setErrorDetails(result.errorDetails || [])
        setShowErrorDialog(true)
        return
      }

      console.log("[v0] ========== SUBMISSION SUCCESSFUL ==========")
      toast({
        title: "Success!",
        description: result.message || "Your registration has been submitted successfully.",
      })

      onSuccess(result.data || data)
    } catch (error: any) {
      console.log("[v0] ========== SUBMISSION FAILED ==========")
      console.log("[v0] Error details:", error)
      setErrorType("network")
      setErrorMessage(error.message || "Something went wrong. Please try again.")
      setErrorDetails([])
      setShowErrorDialog(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground">Review & Submit</h3>
        <p className="mt-1 text-sm text-muted-foreground">Please review your information before submitting</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Make sure all information is accurate. You can edit any section by clicking the edit button.
        </AlertDescription>
      </Alert>

      {/* Admin Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Admin Details</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(1)} className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">
                {data.admin_details?.first_name} {data.admin_details?.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mobile:</span>
              <span className="font-medium">{data.admin_details?.username}</span>
            </div>
            {data.admin_details?.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{data.admin_details.email}</span>
              </div>
            )}
            {data.admin_details?.designation && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Designation:</span>
                <span className="font-medium">{data.admin_details.designation}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lab Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Lab Details</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(2)} className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lab Name:</span>
              <span className="font-medium">{data.lab_details?.lab_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{data.lab_details?.lab_type}</span>
            </div>
            {data.lab_details?.license_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">License:</span>
                <span className="font-medium">{data.lab_details.license_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pricing:</span>
              <span className="font-medium">{data.lab_details?.pricing_tier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">TAT:</span>
              <span className="font-medium">{data.lab_details?.turnaround_time_hours} hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Home Collection:</span>
              <span className="font-medium">{data.lab_details?.home_sample_collection ? "Yes" : "No"}</span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Services:</p>
            <div className="flex flex-wrap gap-2">
              {data.lab_details?.service_categories.map((service) => (
                <Badge key={service} variant="secondary">
                  {service}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Address Details</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(3)} className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <p className="font-medium">{data.address_details?.address}</p>
            {data.address_details?.address2 && <p className="text-muted-foreground">{data.address_details.address2}</p>}
            <p className="text-muted-foreground">
              {data.address_details?.city}, {data.address_details?.state} - {data.address_details?.pincode}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KYC Details */}
      {(data.kyc_details?.kyc_document_type || data.kyc_details?.kyc_document_number) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">KYC Details</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onEdit(4)} className="h-8 w-8 p-0">
              <Edit className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 text-sm">
              {data.kyc_details?.kyc_document_type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document Type:</span>
                  <span className="font-medium">{data.kyc_details.kyc_document_type}</span>
                </div>
              )}
              {data.kyc_details?.kyc_document_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document Number:</span>
                  <span className="font-medium">{data.kyc_details.kyc_document_number}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" className="min-w-32" onClick={() => setShowConfirmDialog(true)} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Registration"
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your lab registration? Please ensure all information is accurate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Confirm & Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Submission Failed
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 px-6 pb-4">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</div>

            {errorDetails.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Details:</div>
                <ul className="list-none space-y-1 text-sm text-muted-foreground">
                  {errorDetails.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {errorType === "network" && (
              <div className="text-xs text-muted-foreground">
                Please check your internet connection or verify that the backend server is running.
              </div>
            )}

            {errorType === "validation" && (
              <div className="text-xs text-muted-foreground">
                Please review the errors above and correct the form before resubmitting.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowErrorDialog(false)} className="w-full">
                Close & Correct Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
