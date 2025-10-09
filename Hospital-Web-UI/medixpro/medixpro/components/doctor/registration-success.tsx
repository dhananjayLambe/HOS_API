"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const CheckCircleIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const MailIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
)

const UserIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
)

const FileTextIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
)

const ShieldCheckIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
)

interface RegistrationData {
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
  medical_registration_number?: string
  medical_council?: string
  digital_signature_consent?: boolean
  terms_conditions_accepted?: boolean
  data_storage_consent?: boolean
  verification_status?: string
  created_at: string
  updated_at?: string
}

export function RegistrationSuccess() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null)

  useEffect(() => {
    const dataParam = searchParams.get("data")
    if (dataParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(dataParam))
        setRegistrationData(parsedData)
      } catch (error) {
        console.error("Error parsing registration data:", error)
      }
    }
  }, [searchParams])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Success Header */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full success-gradient text-success-foreground mb-4 animate-float shadow-lg">
          <CheckCircleIcon />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2 text-balance">Registration Submitted Successfully!</h1>
        <p className="text-lg text-muted-foreground">Thank you for registering with MedixPro</p>
      </div>

      <Card className="mb-6 border-2 border-warning/30 shadow-xl animate-slide-up">
        <CardHeader className="bg-gradient-to-r from-warning/10 via-info/10 to-success/10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-warning/20 text-warning flex items-center justify-center flex-shrink-0 animate-pulse-slow">
              <ClockIcon />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2 text-balance">Pending Admin Approval</CardTitle>
              <CardDescription className="text-base">
                Your registration is currently under review by our administrative team
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 p-6 rounded-xl medical-gradient text-primary-foreground shadow-lg">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-8 h-8">
                <ClockIcon />
              </div>
              <h2 className="text-2xl font-bold text-balance">Expected Review Time: 24-48 Hours</h2>
            </div>
            <p className="text-center text-primary-foreground/90 text-balance">
              Our verification team works around the clock to review applications quickly and thoroughly
            </p>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-4 text-lg">Verification Process Timeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative p-4 rounded-lg border-2 border-info/30 bg-info/5">
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-info text-info-foreground flex items-center justify-center font-bold shadow-md">
                  1
                </div>
                <div className="pt-2">
                  <h4 className="font-semibold text-foreground mb-2">Document Review</h4>
                  <p className="text-sm text-muted-foreground">
                    Verification of Aadhar, PAN, and medical registration documents
                  </p>
                  <Badge variant="secondary" className="mt-2 bg-info/20 text-info">
                    8-12 hours
                  </Badge>
                </div>
              </div>

              <div className="relative p-4 rounded-lg border-2 border-warning/30 bg-warning/5">
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-warning text-warning-foreground flex items-center justify-center font-bold shadow-md">
                  2
                </div>
                <div className="pt-2">
                  <h4 className="font-semibold text-foreground mb-2">ID Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    Cross-checking credentials with medical council databases
                  </p>
                  <Badge variant="secondary" className="mt-2 bg-warning/20 text-warning-foreground">
                    12-24 hours
                  </Badge>
                </div>
              </div>

              <div className="relative p-4 rounded-lg border-2 border-success/30 bg-success/5">
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-success text-success-foreground flex items-center justify-center font-bold shadow-md">
                  3
                </div>
                <div className="pt-2">
                  <h4 className="font-semibold text-foreground mb-2">Final Approval</h4>
                  <p className="text-sm text-muted-foreground">
                    Account activation and welcome email with login credentials
                  </p>
                  <Badge variant="secondary" className="mt-2 bg-success/20 text-success">
                    4-12 hours
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="w-6 h-6 text-primary flex-shrink-0 mt-0.5">
                <MailIcon />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Email Notification</h3>
                <p className="text-sm text-muted-foreground">
                  You will receive an email at{" "}
                  <span className="font-semibold text-primary">
                    {registrationData?.user.email || "your registered email"}
                  </span>{" "}
                  once your account is approved with your login credentials
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-success/5 rounded-lg border border-success/20">
              <div className="w-6 h-6 text-success flex-shrink-0 mt-0.5">
                <ShieldCheckIcon />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Security & Compliance</h3>
                <p className="text-sm text-muted-foreground">
                  Our verification process ensures platform security, regulatory compliance, and protects both doctors
                  and patients
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {registrationData && (
        <Card className="mb-6 shadow-lg">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="w-6 h-6">
                <FileTextIcon />
              </div>
              <span>Complete Registration Details</span>
            </CardTitle>
            <CardDescription>
              Your submitted information - Registration ID:{" "}
              <span className="font-mono font-semibold">{registrationData.id}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Personal Information */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-primary/20">
                <div className="w-6 h-6 text-primary">
                  <UserIcon />
                </div>
                <h3 className="font-bold text-foreground text-lg">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-8">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                  <p className="font-semibold text-foreground">
                    {registrationData.user.first_name} {registrationData.user.last_name}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Username</p>
                  <p className="font-semibold text-foreground font-mono">{registrationData.user.username}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Email Address</p>
                  <p className="font-semibold text-foreground break-all">{registrationData.user.email}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Date of Birth</p>
                  <p className="font-semibold text-foreground">{formatDate(registrationData.dob)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Gender</p>
                  <p className="font-semibold text-foreground capitalize">{registrationData.gender}</p>
                </div>
                {registrationData.secondary_mobile_number && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Secondary Mobile</p>
                    <p className="font-semibold text-foreground">{registrationData.secondary_mobile_number}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-info/20">
                <div className="w-6 h-6 text-info">
                  <FileTextIcon />
                </div>
                <h3 className="font-bold text-foreground text-lg">System Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-8">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Registration ID</p>
                  <p className="font-semibold text-foreground font-mono text-sm">{registrationData.id}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">User ID</p>
                  <p className="font-semibold text-foreground font-mono text-sm">{registrationData.user.id}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Submitted On</p>
                  <p className="font-semibold text-foreground">{formatDate(registrationData.created_at)}</p>
                </div>
                {registrationData.updated_at && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                    <p className="font-semibold text-foreground">{formatDate(registrationData.updated_at)}</p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Verification Status</p>
                  <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">
                    {registrationData.verification_status || "Pending Review"}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Medical Registration */}
            {(registrationData.medical_registration_number || registrationData.medical_council) && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-success/20">
                    <div className="w-6 h-6 text-success">
                      <ShieldCheckIcon />
                    </div>
                    <h3 className="font-bold text-foreground text-lg">Medical Registration</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                    {registrationData.medical_registration_number && (
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Registration Number</p>
                        <p className="font-semibold text-foreground font-mono">
                          {registrationData.medical_registration_number}
                        </p>
                      </div>
                    )}
                    {registrationData.medical_council && (
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Medical Council</p>
                        <p className="font-semibold text-foreground">{registrationData.medical_council}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-primary/20">
                <div className="w-6 h-6 text-primary">
                  <ShieldCheckIcon />
                </div>
                <h3 className="font-bold text-foreground text-lg">Consent & Compliance</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-8">
                {registrationData.digital_signature_consent !== undefined && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
                    <div className="w-5 h-5 text-success flex-shrink-0">
                      <CheckCircleIcon />
                    </div>
                    <p className="text-sm font-medium text-foreground">Digital Signature Consent</p>
                  </div>
                )}
                {registrationData.terms_conditions_accepted !== undefined && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
                    <div className="w-5 h-5 text-success flex-shrink-0">
                      <CheckCircleIcon />
                    </div>
                    <p className="text-sm font-medium text-foreground">Terms & Conditions Accepted</p>
                  </div>
                )}
                {registrationData.data_storage_consent !== undefined && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
                    <div className="w-5 h-5 text-success flex-shrink-0">
                      <CheckCircleIcon />
                    </div>
                    <p className="text-sm font-medium text-foreground">Data Storage Consent</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-info/5">
          <CardTitle className="text-xl">What Happens Next?</CardTitle>
          <CardDescription>Detailed breakdown of the verification and onboarding process</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ol className="space-y-5">
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full medical-gradient text-primary-foreground flex items-center justify-center font-bold shadow-md">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground mb-2 text-lg">Email Confirmation Sent</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  A confirmation email has been sent to <strong>{registrationData?.user.email}</strong> with your
                  application details and reference number
                </p>
                <Badge variant="secondary" className="bg-success/20 text-success">
                  Completed
                </Badge>
              </div>
            </li>

            <Separator />

            <li className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full medical-gradient text-primary-foreground flex items-center justify-center font-bold shadow-md">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground mb-2 text-lg">Admin Verification (24-48 hours)</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Our verification team will thoroughly review your application:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Verify Aadhar and PAN card details with government databases</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Cross-check medical registration number with the medical council</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Validate professional credentials and licensing status</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Ensure compliance with medical practice regulations</span>
                  </li>
                </ul>
                <Badge variant="secondary" className="mt-3 bg-warning/20 text-warning-foreground">
                  In Progress
                </Badge>
              </div>
            </li>

            <Separator />

            <li className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full medical-gradient text-primary-foreground flex items-center justify-center font-bold shadow-md">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground mb-2 text-lg">Account Activation Notification</h4>
                <p className="text-sm text-muted-foreground mb-2">Once approved, you'll receive an email with:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-success mt-0.5">✓</span>
                    <span>Your login credentials and temporary password</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-success mt-0.5">✓</span>
                    <span>Direct link to access your doctor dashboard</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-success mt-0.5">✓</span>
                    <span>Getting started guide and platform tutorial</span>
                  </li>
                </ul>
                <Badge variant="secondary" className="mt-3 bg-muted">
                  Pending
                </Badge>
              </div>
            </li>

            <Separator />

            <li className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full medical-gradient text-primary-foreground flex items-center justify-center font-bold shadow-md">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground mb-2 text-lg">Complete Your Profile & Start Practicing</h4>
                <p className="text-sm text-muted-foreground mb-2">After logging in, you can:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-info mt-0.5">→</span>
                    <span>Add your specialization, qualifications, and experience</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-info mt-0.5">→</span>
                    <span>Set consultation fees and appointment duration</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-info mt-0.5">→</span>
                    <span>Configure your availability and working hours</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-info mt-0.5">→</span>
                    <span>Start accepting patient appointments and consultations</span>
                  </li>
                </ul>
                <Badge variant="secondary" className="mt-3 bg-muted">
                  Pending
                </Badge>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
        <Button size="lg" onClick={() => router.push("/")} className="min-w-[200px] medical-gradient shadow-lg">
          Go to Homepage
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => router.push("/auth/login")}
          className="min-w-[200px] border-2"
        >
          Go to Login
        </Button>
      </div>

      <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-2">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
              <MailIcon />
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-2xl mx-auto text-balance">
              If you have any questions or concerns about your registration, our support team is here to help
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm mb-3">
              <a
                href="mailto:support@medixpro.com"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <MailIcon />
                support@medixpro.com
              </a>
              <span className="hidden sm:inline text-muted-foreground">|</span>
              <a href="tel:+911234567890" className="text-primary hover:underline font-medium">
                📞 +91 123 456 7890
              </a>
            </div>
            <p className="text-xs text-muted-foreground">Support Hours: Monday - Saturday, 9:00 AM - 6:00 PM IST</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default RegistrationSuccess