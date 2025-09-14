"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CalendarDays, FileText, RefreshCw } from "lucide-react"

export function RecentPrescriptions() {
  const prescriptions = [
    {
      id: 1,
      patient: {
        name: "Emma Thompson",
        avatar: "/abstract-geometric-lt.png",
        initials: "ET",
      },
      date: "Today, 09:45 AM",
      medications: ["Sumatriptan 50mg, 1 tablet as needed for migraine"],
      status: "Active",
    },
    {
      id: 2,
      patient: {
        name: "Michael Chen",
        avatar: "/abstract-jr.png",
        initials: "MC",
      },
      date: "Today, 11:20 AM",
      medications: ["Lisinopril 10mg, 1 tablet daily", "Hydrochlorothiazide 12.5mg, 1 tablet daily"],
      status: "Active",
    },
    {
      id: 3,
      patient: {
        name: "Sophia Rodriguez",
        avatar: "/thoughtful-artist.png",
        initials: "SR",
      },
      date: "Yesterday, 10:30 AM",
      medications: ["Prenatal vitamins, 1 tablet daily", "Folic acid 400mcg, 1 tablet daily"],
      status: "Active",
    },
  ]

  return (
    <div className="space-y-4">
      {prescriptions.map((prescription) => (
        <div key={prescription.id} className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={prescription.patient.avatar || "/user-2.png"} alt={prescription.patient.name} />
                <AvatarFallback>{prescription.patient.initials}</AvatarFallback>
              </Avatar>
              <div className="font-medium">{prescription.patient.name}</div>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <CalendarDays className="mr-1 h-3 w-3" />
              {prescription.date}
            </div>
          </div>
          <div className="mt-2">
            <ul className="list-inside list-disc space-y-1 text-sm">
              {prescription.medications.map((med, index) => (
                <li key={index}>{med}</li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex justify-end space-x-2">
            <Button size="sm" variant="ghost" href="/prescriptions/1">
              <FileText className="mr-2 h-3 w-3" />
              View
            </Button>
            <Button size="sm" variant="ghost" href="/prescriptions/1/renew">
              <RefreshCw className="mr-2 h-3 w-3" />
              Renew
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
