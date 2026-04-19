"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { resolveClinicIdForStaff } from "@/lib/doctorClinicsClient"
import {
  createStaff,
  normalizeMobileDigits,
  StaffApiError,
  type StaffRole,
} from "@/lib/staffHelpdeskApi"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

export default function AddStaffPage() {
  const router = useRouter()
  const toast = useToastNotification()
  const firstNameRef = useRef<HTMLInputElement>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [mobile, setMobile] = useState("")
  const [role, setRole] = useState<StaffRole>("helpdesk")
  const [submitting, setSubmitting] = useState(false)
  const [firstNameError, setFirstNameError] = useState("")
  const [lastNameError, setLastNameError] = useState("")
  const [mobileError, setMobileError] = useState("")
  const [clinicId, setClinicId] = useState("")
  const [resolvingClinic, setResolvingClinic] = useState(true)

  useEffect(() => {
    firstNameRef.current?.focus()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const id = await resolveClinicIdForStaff()
        if (!cancelled && id) {
          setClinicId(id)
        }
      } finally {
        if (!cancelled) setResolvingClinic(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const validate = () => {
    let ok = true
    setFirstNameError("")
    setLastNameError("")
    setMobileError("")
    const fn = firstName.trim()
    const ln = lastName.trim()
    if (!fn) {
      setFirstNameError("First name is required.")
      ok = false
    } else if (fn.length < 2) {
      setFirstNameError("Enter at least 2 characters.")
      ok = false
    }
    if (!ln) {
      setLastNameError("Last name is required.")
      ok = false
    } else if (ln.length < 2) {
      setLastNameError("Enter at least 2 characters.")
      ok = false
    }
    const digits = normalizeMobileDigits(mobile)
    if (!digits) {
      setMobileError("Mobile number is required.")
      ok = false
    } else if (digits.length !== 10) {
      setMobileError("Enter a valid 10-digit mobile number.")
      ok = false
    } else if (!/^[6-9]/.test(digits)) {
      setMobileError("Enter a valid Indian mobile number (starts with 6–9).")
      ok = false
    }
    if (!clinicId) {
      toast.error("Could not determine clinic. Return to Staff and try again.")
      ok = false
    }
    return ok
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await createStaff({
        clinicId: clinicId!,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobile,
        role,
      })
      toast.success("Staff added successfully")
      router.push("/staff")
    } catch (err) {
      if (err instanceof StaffApiError) {
        toast.error(err.message)
      } else {
        toast.error("Something went wrong. Try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg mx-auto w-full">
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" className="shrink-0 mt-0.5" asChild>
          <Link href="/staff">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Add Staff</h1>
          <p className="text-muted-foreground text-sm mt-1">Create a helpdesk account for your clinic.</p>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Staff details</CardTitle>
            <CardDescription>First name, last name, mobile, and role for the new staff member.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resolvingClinic ? (
              <p className="text-sm text-muted-foreground">Loading clinic…</p>
            ) : !clinicId ? (
              <p className="text-sm text-destructive">
                No clinic linked to your account. Check your profile or try again later.
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="staff-first-name">First name</Label>
              <Input
                ref={firstNameRef}
                id="staff-first-name"
                name="first_name"
                autoComplete="given-name"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={firstNameError ? "border-destructive" : undefined}
              />
              {firstNameError ? <p className="text-xs text-destructive">{firstNameError}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-last-name">Last name</Label>
              <Input
                id="staff-last-name"
                name="last_name"
                autoComplete="family-name"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={lastNameError ? "border-destructive" : undefined}
              />
              {lastNameError ? <p className="text-xs text-destructive">{lastNameError}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-mobile">Mobile number</Label>
              <Input
                id="staff-mobile"
                name="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="10-digit mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className={mobileError ? "border-destructive" : undefined}
              />
              {mobileError ? <p className="text-xs text-destructive">{mobileError}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
                <SelectTrigger id="staff-role">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="helpdesk">Helpdesk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full min-h-11 touch-manipulation"
              size="lg"
              disabled={submitting || resolvingClinic || !clinicId}
            >
              Create Staff
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
