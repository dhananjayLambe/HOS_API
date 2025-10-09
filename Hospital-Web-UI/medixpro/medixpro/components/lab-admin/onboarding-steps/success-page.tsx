"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, Mail, Phone } from "lucide-react"

interface SuccessPageProps {
  data: any
}

export function SuccessPage({ data }: SuccessPageProps) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
            </div>

            <h1 className="mb-3 text-3xl font-bold text-foreground">Registration Submitted Successfully!</h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Thank you for registering with DoctorProCare Diagnostic Platform
            </p>

            <div className="mb-8 rounded-lg border border-border bg-card p-6 text-left">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Registration Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lab Name:</span>
                  <span className="font-medium">{data?.lab_details?.lab_name || data?.lab_name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">
                    {data?.address_details?.city || data?.city || "N/A"},{" "}
                    {data?.address_details?.state || data?.state || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                    Pending Approval
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-8 rounded-lg border border-primary/20 bg-primary/5 p-6">
              <div className="mb-3 flex items-center justify-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                <h3 className="text-lg font-semibold">What's Next?</h3>
              </div>
              <p className="text-balance text-sm text-muted-foreground">
                Our admin team will review your registration and verify the details. You will receive approval within{" "}
                <span className="font-semibold text-foreground">24-48 hours</span>. Once approved, you'll be able to log
                in and start uploading test reports.
              </p>
            </div>

            <div className="mb-8 space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                You will receive a confirmation email shortly
              </p>
              <p className="flex items-center justify-center gap-2">
                <Phone className="h-4 w-4" />
                Our team may contact you for verification
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" onClick={() => (window.location.href = "/")}>
                Go to Home
              </Button>
              <Button size="lg" variant="outline" onClick={() => window.print()}>
                Print Confirmation
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need help? Contact us at{" "}
          <a href="mailto:support@doctorprocare.com" className="font-medium text-primary hover:underline">
            support@doctorprocare.com
          </a>
        </p>
      </div>
    </div>
  )
}
