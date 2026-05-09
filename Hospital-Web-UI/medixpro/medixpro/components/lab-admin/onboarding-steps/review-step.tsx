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
import { User, Building2, MapPin, FileCheck, Edit, AlertCircle, Loader2, XCircle, Clock } from "lucide-react"
import type { OnboardingData } from "../lab-onboarding"

interface ReviewStepProps {
  data: OnboardingData
  onEdit: (step: number) => void
  onBack: () => void
  onSuccess: (data: Partial<OnboardingData>) => void
}

function buildPayload(data: OnboardingData) {
  const org = data.lab_details?.organization_name?.trim() || ""
  const display = data.lab_details?.display_name?.trim() || ""
  const labNameForBackend = org && display ? `${org} — ${display}` : display || org

  const pan = data.kyc_details?.pan_number?.trim().toUpperCase() || ""
  const gst = data.kyc_details?.gst_number?.trim().toUpperCase() || ""

  return {
    first_name: data.admin_details?.first_name || "",
    last_name: data.admin_details?.last_name || "",
    mobile_or_username: data.admin_details?.username || "",
    email: data.admin_details?.email || "",
    designation: data.admin_details?.designation || "",
    whatsapp_same_as_mobile: data.admin_details?.whatsapp_same_as_mobile ?? true,

    organization_name: org,
    display_name: display,
    lab_name: labNameForBackend,
    lab_type: data.lab_details?.lab_type || "",
    license_number: data.lab_details?.license_number || "",
    registration_number: data.lab_details?.registration_number || "",
    home_sample_collection: data.lab_details?.home_sample_collection ?? false,
    walk_in_collection: data.lab_details?.walk_in_collection ?? true,

    address_line1: data.address_details?.address || "",
    address_line2: data.address_details?.address2 || "",
    landmark: data.address_details?.landmark || "",
    city: data.address_details?.city || "",
    state: data.address_details?.state || "",
    pincode: data.address_details?.pincode || "",

    pan_number: pan,
    gst_number: gst,
    lab_license_file_name: data.kyc_details?.lab_license_file_name || "",
    nabl_certificate_file_name: data.kyc_details?.nabl_certificate_file_name || "",
    lab_license_file_base64: data.kyc_details?.lab_license_file_base64 || "",
    nabl_certificate_file_base64: data.kyc_details?.nabl_certificate_file_base64 || "",

    // Backend compatibility (defaults when API still expects these)
    license_valid_till: "",
    certifications: "",
    service_categories: [] as string[],
    pricing_tier: "medium",
    turnaround_time_hours: 24,
    latitude: 0,
    longitude: 0,
    kyc_document_type: pan ? "PAN" : gst ? "GSTIN" : "",
    kyc_document_number: pan || gst || "",
  }
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
      const flattenedData = buildPayload(data)

      let response: Response
      try {
        response = await fetch("/api/lab-admin/onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(flattenedData),
        })
      } catch {
        throw new Error("Network error. Please check your internet connection and try again.")
      }

      const contentType = response.headers.get("content-type")
      let result: any

      if (contentType && contentType.includes("application/json")) {
        try {
          result = await response.json()
        } catch {
          throw new Error("Server returned an invalid response. Please try again later.")
        }
      } else {
        const textResponse = await response.text()
        if (textResponse.includes("<!DOCTYPE") || textResponse.includes("<html")) {
          throw new Error(
            "Registration service is unavailable. Ensure the API server is running, or try again later.",
          )
        }
        throw new Error("Server returned an unexpected response format. Please try again later.")
      }

      if (!response.ok || !result.success) {
        setErrorType(result.errorType || "unknown")
        setErrorMessage(result.error || "Submission failed. Please try again.")
        setErrorDetails(result.errorDetails || [])
        setShowErrorDialog(true)
        return
      }

      toast({
        title: "Submitted",
        description: result.message || "Your registration has been submitted.",
      })

      // Always show submitted form on success; API payload may not match UI shape
      onSuccess({ ...data })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again."
      setErrorType("network")
      setErrorMessage(message)
      setErrorDetails([])
      setShowErrorDialog(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const k = data.kyc_details
  const hasCompliance = !!(
    k?.pan_number?.trim() ||
    k?.gst_number?.trim() ||
    k?.lab_license_file_name ||
    k?.nabl_certificate_file_name ||
    k?.lab_license_file_base64 ||
    k?.nabl_certificate_file_base64
  )

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-foreground md:text-xl">Review & Submit</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">Confirm your details before submitting</p>
      </div>

      <Alert className="py-3">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>You can edit any section using the pencil icon.</AlertDescription>
      </Alert>

      <Card className="border-primary/20 bg-muted/30">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2 pt-4">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">Registration status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">After submit:</span>
            <Badge variant="secondary" className="bg-amber-100 text-amber-900 hover:bg-amber-100">
              PENDING APPROVAL
            </Badge>
          </div>
          <p className="text-sm text-foreground">
            Your lab account will be activated after admin approval. Our admin team will review your registration and
            approve your account shortly.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Contact Details</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(1)} className="h-8 w-8 p-0" aria-label="Edit contact">
            <Edit className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Name</span>
            <span className="text-right font-medium">
              {data.admin_details?.first_name} {data.admin_details?.last_name}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Mobile</span>
            <span className="font-medium">{data.admin_details?.username}</span>
          </div>
          {data.admin_details?.email ? (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="text-right font-medium">{data.admin_details.email}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Designation</span>
            <span className="font-medium">{data.admin_details?.designation}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">WhatsApp same as mobile</span>
            <span className="font-medium">{data.admin_details?.whatsapp_same_as_mobile ? "Yes" : "No"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Lab Information</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(2)} className="h-8 w-8 p-0" aria-label="Edit lab">
            <Edit className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Organization</span>
            <span className="text-right font-medium">{data.lab_details?.organization_name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Display name</span>
            <span className="text-right font-medium">{data.lab_details?.display_name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{data.lab_details?.lab_type}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Home collection</span>
            <span className="font-medium">{data.lab_details?.home_sample_collection ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Walk-in</span>
            <span className="font-medium">{data.lab_details?.walk_in_collection ? "Yes" : "No"}</span>
          </div>
          {data.lab_details?.license_number ? (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">License</span>
              <span className="text-right font-medium">{data.lab_details.license_number}</span>
            </div>
          ) : null}
          {data.lab_details?.registration_number ? (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Registration #</span>
              <span className="text-right font-medium">{data.lab_details.registration_number}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Branch Address</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(3)} className="h-8 w-8 p-0" aria-label="Edit address">
            <Edit className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{data.address_details?.address}</p>
          {data.address_details?.address2 ? <p className="text-muted-foreground">{data.address_details.address2}</p> : null}
          {data.address_details?.landmark ? (
            <p className="text-muted-foreground">Landmark: {data.address_details.landmark}</p>
          ) : null}
          <p className="text-muted-foreground">
            {data.address_details?.city}, {data.address_details?.state} — {data.address_details?.pincode}
          </p>
        </CardContent>
      </Card>

      {hasCompliance ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Compliance (optional)</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onEdit(4)} className="h-8 w-8 p-0" aria-label="Edit compliance">
              <Edit className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {k?.pan_number ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">PAN</span>
                <span className="font-medium">{k.pan_number}</span>
              </div>
            ) : null}
            {k?.gst_number ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">GST</span>
                <span className="break-all font-medium">{k.gst_number}</span>
              </div>
            ) : null}
            {k?.lab_license_file_name ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Lab license file</span>
                <span className="text-right font-medium">{k.lab_license_file_name}</span>
              </div>
            ) : null}
            {k?.nabl_certificate_file_name ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">NABL file</span>
                <span className="text-right font-medium">{k.nabl_certificate_file_name}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-between py-4 text-sm">
            <span className="text-muted-foreground">No compliance documents added (optional)</span>
            <Button variant="outline" size="sm" onClick={() => onEdit(4)}>
              Add
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-1">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" className="min-w-36" onClick={() => setShowConfirmDialog(true)} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting registration…
            </>
          ) : (
            "Submit registration"
          )}
        </Button>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm submission</DialogTitle>
            <DialogDescription>Submit your lab registration for admin review?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Confirm & submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Submission failed
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 px-6 pb-4">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</div>

            {errorDetails.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Details</div>
                <ul className="list-none space-y-1 text-sm text-muted-foreground">
                  {errorDetails.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {errorType === "network" ? (
              <div className="text-xs text-muted-foreground">
                Check your connection or try again when the registration service is available.
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowErrorDialog(false)} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
