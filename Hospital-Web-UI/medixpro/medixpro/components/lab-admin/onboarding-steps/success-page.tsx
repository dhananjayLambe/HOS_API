"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2 } from "lucide-react"
import type { OnboardingData } from "../lab-onboarding"

interface SuccessPageProps {
  data: Partial<OnboardingData>
}

export function SuccessPage({ data }: SuccessPageProps) {
  const displayName = data.lab_details?.display_name || data.lab_details?.organization_name
  const mobile = data.admin_details?.username

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      <div className="mx-auto max-w-lg">
        <Card className="border-primary/15">
          <CardContent className="px-5 py-8 text-center md:px-8 md:py-10">
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <CheckCircle2 className="h-9 w-9 text-primary" />
              </div>
            </div>

            <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">Registration submitted successfully</h1>
            <p className="mb-6 text-sm text-muted-foreground md:text-base">
              Our admin team will review your registration and approve your account shortly.
            </p>

            <div className="mb-6 rounded-lg border bg-card p-4 text-left text-sm">
              <h3 className="mb-3 font-semibold text-foreground">Summary</h3>
              <div className="space-y-2">
                {displayName ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Lab</span>
                    <span className="text-right font-medium">{displayName}</span>
                  </div>
                ) : null}
                {data.address_details?.city ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Location</span>
                    <span className="text-right font-medium">
                      {data.address_details.city}, {data.address_details.state}
                    </span>
                  </div>
                ) : null}
                {mobile ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Contact</span>
                    <span className="font-medium">{mobile}</span>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">PENDING APPROVAL</Badge>
                </div>
              </div>
            </div>

            <p className="mb-6 text-sm text-foreground">
              Your lab account will be activated after admin approval.
            </p>

            <Button asChild size="lg" className="w-full">
              <Link href="/auth/login/">Back to login</Link>
            </Button>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Thank you for registering with MedixPro
        </p>
      </div>
    </div>
  )
}
