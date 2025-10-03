"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import SpecializationsMultiSelect from "./specializations-multiselect"

type Errors = Record<string, string>

const DEFAULT_SPECIALIZATIONS = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "General Medicine",
  "Gynecology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Radiology",
  "Urology",
]

export default function ClinicOnboardingForm() {
  const { toast } = useToast()
  const router = useRouter()

  // Steps: 1 Clinic Info, 2 Communication, 3 Address, 4 Registration, 5 Summary
  const TOTAL_STEPS = 5
  const [step, setStep] = useState(1)

  // Clinic Information
  const [clinicName, setClinicName] = useState("")
  const [specializations, setSpecializations] = useState<string[]>([])

  // Contacts
  const [primaryPhone, setPrimaryPhone] = useState("")
  const [secondaryPhone, setSecondaryPhone] = useState("")

  // Communication
  const [email, setEmail] = useState("")

  // Address
  const [address1, setAddress1] = useState("")
  const [address2, setAddress2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [pincode, setPincode] = useState("")

  // Registration
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [gstNumber, setGstNumber] = useState("")

  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const progressPercent = useMemo(() => {
    const fraction = (step - 1) / (TOTAL_STEPS - 1)
    return Math.max(0, Math.min(1, fraction)) * 100
  }, [step])

  // Build payload for API and Summary
  const payload = useMemo(
    () => ({
      clinic: {
        name: clinicName.trim(),
        specializations,
        primaryContact: primaryPhone.trim(),
        secondaryContact: secondaryPhone.trim() || null,
      },
      communication: {
        email: email.trim(),
      },
      address: {
        addressLine1: address1.trim(),
        addressLine2: address2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      },
      registration: {
        registrationNumber: registrationNumber.trim(),
        gstNumber: gstNumber.trim() || null,
      },
    }),
    [
      clinicName,
      specializations,
      primaryPhone,
      secondaryPhone,
      email,
      address1,
      address2,
      city,
      state,
      pincode,
      registrationNumber,
      gstNumber,
    ],
  )

  // Compute errors without mutating state (used for step and final validation)
  function computeErrors(): Errors {
    const next: Errors = {}

    // 1. Clinic Info
    if (!clinicName.trim()) next.clinicName = "Clinic Name is required"
    if (specializations.length === 0) next.specializations = "Select at least one specialization"
    if (!primaryPhone.trim()) next.primaryPhone = "Primary Contact Number is required"

    // 2. Communication
    if (!email.trim()) next.email = "Email Address is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address"

    // 3. Address
    if (!address1.trim()) next.address1 = "Address Line 1 is required"
    if (!city.trim()) next.city = "City is required"
    if (!state.trim()) next.state = "State is required"
    if (!pincode.trim()) next.pincode = "Pincode is required"
    else if (!/^\d{4,10}$/.test(pincode)) next.pincode = "Enter a valid pincode"

    // 4. Registration
    if (!registrationNumber.trim()) next.registrationNumber = "Registration Number is required"
    if (gstNumber.trim() && !/^[A-Za-z0-9]{8,20}$/.test(gstNumber.trim())) {
      next.gstNumber = "Enter a valid GST Number (alphanumeric, 8-20 chars)"
    }

    return next
  }

  function validateAll(): boolean {
    const next = computeErrors()
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function validateStep(currentStep: number): boolean {
    const all = computeErrors()
    const fieldsByStep: Record<number, string[]> = {
      1: ["clinicName", "specializations", "primaryPhone"],
      2: ["email"],
      3: ["address1", "city", "state", "pincode"],
      4: ["registrationNumber", "gstNumber"],
      5: [], // summary only
    }
    const keys = new Set(fieldsByStep[currentStep] || [])
    const stepErrors = Object.fromEntries(Object.entries(all).filter(([k]) => keys.has(k)))
    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  function goNext() {
    if (validateStep(step)) {
      setStep((s) => Math.min(TOTAL_STEPS, s + 1))
    } else {
      toast({ title: "Please fix the highlighted errors", variant: "destructive" })
    }
  }

  function goPrev() {
    setErrors({})
    setStep((s) => Math.max(1, s - 1))
  }

  function editSection(targetStep: number) {
    setErrors({})
    setStep(targetStep)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step < TOTAL_STEPS) {
      goNext()
      return
    }

    // Final submit from Summary
    if (!validateAll()) {
      toast({ title: "Please fix the highlighted errors", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/clinic/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let message = "Submission failed"
        try {
          const data = await res.json()
          message = data?.message || message
        } catch {
          // ignore parse errors
        }
        throw new Error(message)
      }

      router.push(`clinic-registration/success?clinic=${encodeURIComponent(payload.clinic.name)}`)
    } catch (err: any) {
      toast({
        title: "Could not submit",
        description: err?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setClinicName("")
    setSpecializations([])
    setPrimaryPhone("")
    setSecondaryPhone("")
    setEmail("")
    setAddress1("")
    setAddress2("")
    setCity("")
    setState("")
    setPincode("")
    setRegistrationNumber("")
    setGstNumber("")
    setErrors({})
    setStep(1)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Step {step} of {TOTAL_STEPS}
          </p>
          <p className="text-xs text-muted-foreground">
            {step === 1 && "Clinic Information"}
            {step === 2 && "Communication"}
            {step === 3 && "Address"}
            {step === 4 && "Registration"}
            {step === 5 && "Review & Confirm"}
          </p>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Step 1: Clinic Information */}
      {step === 1 && (
        <fieldset className="space-y-6">
          <legend className="text-base font-medium">1. Clinic Information</legend>

          <div className="space-y-2">
            <Label htmlFor="clinic-name">Clinic Name *</Label>
            <Input
              id="clinic-name"
              placeholder="e.g., MediX Pro Care"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              aria-invalid={!!errors.clinicName}
              aria-describedby={errors.clinicName ? "clinic-name-error" : undefined}
            />
            {errors.clinicName ? (
              <p id="clinic-name-error" className="text-sm text-destructive">
                {errors.clinicName}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Must be unique and human-readable.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Specializations *</Label>
            <SpecializationsMultiSelect
              value={specializations}
              onChange={setSpecializations}
              options={DEFAULT_SPECIALIZATIONS}
              placeholder="Type to search or add..."
            />
            {errors.specializations ? (
              <p className="text-sm text-destructive">{errors.specializations}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Select one or more. Add new if not listed.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary-phone">Primary Contact Number *</Label>
            <Input
              id="primary-phone"
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={primaryPhone}
              onChange={(e) => setPrimaryPhone(e.target.value.replace(/[^\d+]/g, ""))}
              aria-invalid={!!errors.primaryPhone}
              aria-describedby={errors.primaryPhone ? "primary-phone-error" : undefined}
            />
            {errors.primaryPhone && (
              <p id="primary-phone-error" className="text-sm text-destructive">
                {errors.primaryPhone}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary-phone">Secondary Contact Number (optional)</Label>
            <Input
              id="secondary-phone"
              inputMode="tel"
              placeholder="Optional"
              value={secondaryPhone}
              onChange={(e) => setSecondaryPhone(e.target.value.replace(/[^\d+]/g, ""))}
            />
          </div>
        </fieldset>
      )}

      {/* Step 2: Communication */}
      {step === 2 && (
        <fieldset className="space-y-6">
          <legend className="text-base font-medium">2. Communication</legend>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="clinic@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
            {!errors.email && (
              <p className="text-xs text-muted-foreground">
                Used for official communication like appointments, reports, invoices.
              </p>
            )}
          </div>
        </fieldset>
      )}

      {/* Step 3: Address */}
      {step === 3 && (
        <fieldset className="space-y-6">
          <legend className="text-base font-medium">3. Address</legend>

          <div className="space-y-2">
            <Label htmlFor="address1">Address Line 1 *</Label>
            <Input
              id="address1"
              placeholder="Street, Building"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              aria-invalid={!!errors.address1}
              aria-describedby={errors.address1 ? "address1-error" : undefined}
            />
            {errors.address1 && (
              <p id="address1-error" className="text-sm text-destructive">
                {errors.address1}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address2">Address Line 2 (optional)</Label>
            <Input
              id="address2"
              placeholder="Area, Landmark (optional)"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-invalid={!!errors.city}
                aria-describedby={errors.city ? "city-error" : undefined}
              />
              {errors.city && (
                <p id="city-error" className="text-sm text-destructive">
                  {errors.city}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                aria-invalid={!!errors.state}
                aria-describedby={errors.state ? "state-error" : undefined}
              />
              {errors.state && (
                <p id="state-error" className="text-sm text-destructive">
                  {errors.state}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                inputMode="numeric"
                placeholder="e.g., 560001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                aria-invalid={!!errors.pincode}
                aria-describedby={errors.pincode ? "pincode-error" : undefined}
              />
              {errors.pincode && (
                <p id="pincode-error" className="text-sm text-destructive">
                  {errors.pincode}
                </p>
              )}
            </div>
          </div>
        </fieldset>
      )}

      {/* Step 4: Registration */}
      {step === 4 && (
        <fieldset className="space-y-6">
          <legend className="text-base font-medium">4. Registration</legend>

          <div className="space-y-2">
            <Label htmlFor="regno">Registration Number *</Label>
            <Input
              id="regno"
              placeholder="Govt./Local Authority Registration Number"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              aria-invalid={!!errors.registrationNumber}
              aria-describedby={errors.registrationNumber ? "regno-error" : undefined}
            />
            {errors.registrationNumber && (
              <p id="regno-error" className="text-sm text-destructive">
                {errors.registrationNumber}
              </p>
            )}
            {!errors.registrationNumber && (
              <p className="text-xs text-muted-foreground">Must be unique and mandatory.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gst">GST Number (optional)</Label>
            <Input
              id="gst"
              placeholder="Optional"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              aria-invalid={!!errors.gstNumber}
              aria-describedby={errors.gstNumber ? "gst-error" : undefined}
            />
            {errors.gstNumber && (
              <p id="gst-error" className="text-sm text-destructive">
                {errors.gstNumber}
              </p>
            )}
          </div>
        </fieldset>
      )}

      {step === 5 && (
        <section className="space-y-6" aria-labelledby="summary-title">
          <header className="text-center">
            <h2 id="summary-title" className="text-2xl font-semibold">
              Review & Confirm
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Please verify your details. You can edit any section before submitting.
            </p>
          </header>

          <div className="space-y-4">
            <div className="summary-section">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-base font-semibold">1. Clinic Information</h3>
                <Button type="button" size="sm" variant="outline" onClick={() => editSection(1)}>
                  Edit
                </Button>
              </div>
              <div className="summary-grid">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Clinic Name</p>
                  <p className="text-sm font-medium">{payload.clinic.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Primary Contact</p>
                  <p className="text-sm font-medium">{payload.clinic.primaryContact || "-"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {payload.clinic.specializations.length > 0 ? (
                      payload.clinic.specializations.map((sp) => (
                        <span key={sp} className="chip">
                          {sp}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="summary-section">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-base font-semibold">2. Communication</h3>
                <Button type="button" size="sm" variant="outline" onClick={() => editSection(2)}>
                  Edit
                </Button>
              </div>
              <div className="summary-grid">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
                  <p className="text-sm font-medium">{payload.communication.email || "-"}</p>
                </div>
              </div>
            </div>

            <div className="summary-section">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-base font-semibold">3. Address</h3>
                <Button type="button" size="sm" variant="outline" onClick={() => editSection(3)}>
                  Edit
                </Button>
              </div>
              <div className="summary-grid">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Address Line 1</p>
                  <p className="text-sm font-medium">{payload.address.addressLine1 || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Address Line 2</p>
                  <p className="text-sm font-medium">{payload.address.addressLine2 || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">City</p>
                  <p className="text-sm font-medium">{payload.address.city || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">State</p>
                  <p className="text-sm font-medium">{payload.address.state || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Pincode</p>
                  <p className="text-sm font-medium">{payload.address.pincode || "-"}</p>
                </div>
              </div>
            </div>

            <div className="summary-section">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-base font-semibold">4. Registration</h3>
                <Button type="button" size="sm" variant="outline" onClick={() => editSection(4)}>
                  Edit
                </Button>
              </div>
              <div className="summary-grid">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Registration Number</p>
                  <p className="text-sm font-medium">{payload.registration.registrationNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">GST Number</p>
                  <p className="text-sm font-medium">{payload.registration.gstNumber || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={resetForm} className="ml-auto bg-transparent">
          Reset
        </Button>
        {step > 1 && (
          <Button type="button" variant="secondary" onClick={goPrev}>
            Back
          </Button>
        )}

        {step < TOTAL_STEPS && (
          <Button type="button" onClick={goNext} className="min-w-[120px]">
            Next
          </Button>
        )}

        {step === TOTAL_STEPS && (
          <Button type="submit" disabled={submitting} className="min-w-[160px]">
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        )}


      </div>
    </form>
  )
}
