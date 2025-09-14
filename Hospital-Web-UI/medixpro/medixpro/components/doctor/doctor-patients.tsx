"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function DoctorPatients() {
  const patients = [
    {
      id: 1,
      name: "Emma Thompson",
      avatar: "/abstract-geometric-lt.png",
      initials: "ET",
      age: 42,
      gender: "Female",
      reason: "Annual check-up",
      status: "New Patient",
    },
    {
      id: 2,
      name: "Michael Chen",
      avatar: "/abstract-jr.png",
      initials: "MC",
      age: 35,
      gender: "Male",
      reason: "Headache, fever",
      status: "Follow-up",
    },
    {
      id: 3,
      name: "Sophia Rodriguez",
      avatar: "/thoughtful-artist.png",
      initials: "SR",
      age: 28,
      gender: "Female",
      reason: "Pregnancy consultation",
      status: "Regular",
    },
    {
      id: 4,
      name: "James Wilson",
      avatar: "/graffiti-ew.png",
      initials: "JW",
      age: 67,
      gender: "Male",
      reason: "Chest pain",
      status: "Urgent",
    },
    {
      id: 5,
      name: "Olivia Parker",
      avatar: "/contemplative-artist.png",
      initials: "OP",
      age: 8,
      gender: "Female",
      reason: "Vaccination",
      status: "Regular",
    },
  ]

  return (
    <div className="space-y-4">
      {patients.map((patient) => (
        <div
          key={patient.id}
          className="flex items-center justify-between gap-4 flex-wrap rounded-lg border p-3 transition-all hover:bg-accent"
        >
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={patient.avatar || "/user-2.png"} alt={patient.name} />
              <AvatarFallback>{patient.initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{patient.name}</div>
              <div className="text-sm text-muted-foreground">
                {patient.age} yrs • {patient.gender}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge
              variant={patient.status === "Urgent" ? "default" : "outline"}
              className={
                patient.status === "Urgent" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : ""
              }
            >
              {patient.status}
            </Badge>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                History
              </Button>
              <Button size="sm">Examine</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
