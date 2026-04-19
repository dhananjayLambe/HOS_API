"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { loadStaffClinicSelection, type ClinicOption } from "@/lib/doctorClinicsClient"
import {
  formatMobileDisplay,
  listStaff,
  MAX_STAFF_PER_CLINIC,
  removeStaff,
  StaffApiError,
  type StaffMember,
} from "@/lib/staffHelpdeskApi"
import { AlertTriangle, Plus, UserRound } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useLayoutEffect, useState } from "react"

export default function StaffPage() {
  const toast = useToastNotification()
  const [clinics, setClinics] = useState<ClinicOption[]>([])
  const [clinicId, setClinicId] = useState<string>("")
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [clinicsLoading, setClinicsLoading] = useState(true)
  const [staffListLoading, setStaffListLoading] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null)
  const [removing, setRemoving] = useState(false)

  const activeCount = staff.length
  const atLimit = activeCount >= MAX_STAFF_PER_CLINIC

  /** Load clinics once via shared resolver (localStorage primary, API fallback). */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setClinicsLoading(true)
      try {
        const { clinics: list, clinicId: selected } = await loadStaffClinicSelection()
        if (cancelled) return
        setClinics(list)
        setClinicId(selected)
      } finally {
        if (!cancelled) setClinicsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /** Load helpdesk list when clinic changes; useLayoutEffect avoids empty-state flash before fetch. */
  useLayoutEffect(() => {
    if (!clinicId) {
      setStaffListLoading(false)
      return
    }
    let cancelled = false
    setStaffListLoading(true)
    listStaff({ clinicId })
      .then(({ staff: rows }) => {
        if (!cancelled) setStaff(rows)
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) {
          setStaff([])
          toast.error("Could not load staff.")
        }
      })
      .finally(() => {
        if (!cancelled) setStaffListLoading(false)
      })
    return () => {
      cancelled = true
    }
    // toast omitted: avoid refetching staff when toast identity changes
  }, [clinicId])

  const reloadStaff = useCallback(async () => {
    if (!clinicId) return
    setStaffListLoading(true)
    try {
      const { staff: rows } = await listStaff({ clinicId })
      setStaff(rows)
    } catch (e) {
      console.error(e)
      toast.error("Could not load staff.")
    } finally {
      setStaffListLoading(false)
    }
  }, [clinicId, toast])

  const onClinicChange = useCallback((value: string) => {
    setClinicId(value)
    localStorage.setItem("clinic_id", value)
  }, [])

  const confirmRemove = async () => {
    if (!removeTarget || !clinicId) return
    setRemoving(true)
    try {
      await removeStaff({ staffId: removeTarget.id })
      toast.success("Staff removed.")
      setRemoveTarget(null)
      await reloadStaff()
    } catch (e) {
      if (e instanceof StaffApiError) {
        toast.error(e.message)
      } else {
        toast.error("Could not remove staff.")
      }
    } finally {
      setRemoving(false)
    }
  }

  const showClinicSelect = clinics.length > 1

  const addStaffControl =
    atLimit ? (
      <Button type="button" size="lg" className="min-h-11 touch-manipulation" disabled>
        <Plus className="mr-2 h-4 w-4" />
        Add Staff
      </Button>
    ) : (
      <Button asChild size="lg" className="min-h-11 touch-manipulation">
        <Link href="/staff/add">
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </Link>
      </Button>
    )

  return (
    <>
      <div className="flex flex-col gap-5 pb-24 md:pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Staff</h2>
            <p className="text-muted-foreground">Manage your clinic staff</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {activeCount} / {MAX_STAFF_PER_CLINIC} Active Staff
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {showClinicSelect && (
                <div className="flex flex-col gap-1.5 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground sr-only">Clinic</Label>
                  <Select value={clinicId} onValueChange={onClinicChange} disabled={clinicsLoading}>
                    <SelectTrigger className="w-full md:w-[240px]">
                      <SelectValue placeholder="Select clinic" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {addStaffControl}
            </div>
          </div>
        </div>

        <div className="flex md:hidden flex-col gap-3">
          {showClinicSelect && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Clinic</Label>
              <Select value={clinicId} onValueChange={onClinicChange} disabled={clinicsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select clinic" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {atLimit && (
          <div
            className="flex gap-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
            role="status"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>
              You’ve reached the maximum of 3 staff members for this clinic. Remove an existing
              staff member to add a new one.
            </p>
          </div>
        )}

        {clinicsLoading ? (
          <p className="text-sm text-muted-foreground">Loading clinics…</p>
        ) : staffListLoading ? (
          <p className="text-sm text-muted-foreground">Loading staff…</p>
        ) : staff.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
              <UserRound className="h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">No staff added yet</p>
              {atLimit ? (
                <Button type="button" size="lg" className="min-h-11 touch-manipulation" disabled>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Staff
                </Button>
              ) : (
                <Button asChild size="lg" className="min-h-11 touch-manipulation">
                  <Link href="/staff/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Staff
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {staff.map((member) => (
              <Card key={member.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback>
                      {member.name
                        .split(/\s+/)
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight truncate">{member.name}</p>
                    <Badge variant="secondary" className="mt-1 font-normal capitalize">
                      Helpdesk
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Mobile: +91 {formatMobileDisplay(member.mobile)}
                  </p>
                  <p className="text-muted-foreground">
                    Status: <span className="text-foreground font-medium">Active</span>
                  </p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    variant="outline"
                    className="w-full min-h-11 touch-manipulation text-destructive hover:text-destructive"
                    onClick={() => setRemoveTarget(member)}
                  >
                    Remove
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
        {atLimit ? (
          <Button type="button" className="w-full min-h-12 touch-manipulation" size="lg" disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        ) : (
          <Button asChild className="w-full min-h-12 touch-manipulation" size="lg">
            <Link href="/staff/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Link>
          </Button>
        )}
      </div>

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={removing}
              onClick={() => void confirmRemove()}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
