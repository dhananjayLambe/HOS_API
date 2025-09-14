"use client"

import { Badge } from "@/components/ui/badge"

export function DoctorCalendar() {
  // Sample data for upcoming appointments
  const upcomingAppointments = [
    {
      id: 1,
      patientName: "John Doe",
      date: "2025-04-26",
      time: "09:00 AM",
      type: "Follow-up",
      status: "confirmed"
    },
    {
      id: 2,
      patientName: "Jane Smith",
      date: "2025-04-26",
      time: "10:30 AM",
      type: "New Patient",
      status: "pending"
    },
    {
      id: 3,
      patientName: "Robert Johnson",
      date: "2025-04-27",
      time: "02:00 PM",
      type: "Consultation",
      status: "confirmed"
    },
    {
      id: 4,
      patientName: "Emily Davis",
      date: "2025-04-28",
      time: "11:00 AM",
      type: "Follow-up",
      status: "confirmed"
    },
    {
      id: 5,
      patientName: "John Doe",
      date: "2025-04-28",
      time: "11:00 AM",
      type: "New Patient",
      status: "pending"
    }
  ]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  return (
    <div className="w-full space-y-4">   
        <div className="space-y-4">
          {upcomingAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center justify-between gap-4 flex-wrap rounded-lg border p-2 md:p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{appointment.patientName}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(appointment.date)} at {appointment.time}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className={`${
                    appointment.status === 'confirmed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}
                >
                  {appointment.status}
                </Badge>
                <Badge variant="secondary">{appointment.type}</Badge>
              </div>
            </div>
          ))}
        </div>     
    </div>
  )
}
