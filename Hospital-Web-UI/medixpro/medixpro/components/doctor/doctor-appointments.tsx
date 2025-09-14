"use client"

import { Clock } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function DoctorAppointments() {
  const appointments = [
    {
      id: 1,
      patient: {
        name: "Emma Thompson",
        avatar: "/abstract-geometric-lt.png",
        initials: "ET",
      },
      time: "09:00 AM",
      type: "Check-up",
      status: "Confirmed",
      duration: "30 min",
    },
    {
      id: 2,
      patient: {
        name: "Michael Chen",
        avatar: "/abstract-jr.png",
        initials: "MC",
      },
      time: "10:15 AM",
      type: "Follow-up",
      status: "In Progress",
      duration: "45 min",
    },
    {
      id: 3,
      patient: {
        name: "Sophia Rodriguez",
        avatar: "/thoughtful-artist.png",
        initials: "SR",
      },
      time: "11:30 AM",
      type: "Consultation",
      status: "Confirmed",
      duration: "60 min",
    },
    {
      id: 4,
      patient: {
        name: "James Wilson",
        avatar: "/graffiti-ew.png",
        initials: "JW",
      },
      time: "01:45 PM",
      type: "Urgent",
      status: "Confirmed",
      duration: "30 min",
    },
    {
      id: 5,
      patient: {
        name: "Olivia Parker",
        avatar: "/contemplative-artist.png",
        initials: "OP",
      },
      time: "03:00 PM",
      type: "Check-up",
      status: "Confirmed",
      duration: "45 min",
    },
  ]

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <div
          key={appointment.id}
          className="flex items-center justify-between gap-4 flex-wrap rounded-lg border p-3 transition-all hover:bg-accent"
        >
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={appointment.patient.avatar || "/user-2.png"} alt={appointment.patient.name} />
              <AvatarFallback>{appointment.patient.initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{appointment.patient.name}</div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-1 h-3 w-3" />
                {appointment.time} • {appointment.duration}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={appointment.status === "In Progress" ? "default" : "outline"}
              className={
                appointment.type === "Urgent" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : ""
              }
            >
              {appointment.type}
            </Badge>
            <Button size="sm" variant="outline">
              View
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
