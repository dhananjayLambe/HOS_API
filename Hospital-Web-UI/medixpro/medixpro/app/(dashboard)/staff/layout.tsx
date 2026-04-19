"use client"

import { useAuth } from "@/lib/authContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function StaffSectionLayout({ children }: { children: React.ReactNode }) {
  const { role, sessionChecked } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!sessionChecked) return
    if (role?.toLowerCase() === "helpdesk") {
      router.replace("/helpdesk-dashboard")
    }
  }, [role, sessionChecked, router])

  if (!sessionChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  if (role?.toLowerCase() === "helpdesk") {
    return null
  }

  return <>{children}</>
}
