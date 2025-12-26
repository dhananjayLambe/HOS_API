"use client"

import { useState } from "react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"

interface Clinic {
  id?: string
  clinicName: string
  role: string
  isPrimary: boolean
  consultationDays: string[]
  startTime: string
  endTime: string
}

export function ClinicAssociationSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToastNotification()

  const [clinics, setClinics] = useState<Clinic[]>([
    {
      clinicName: "City Medical Center",
      role: "Consultant",
      isPrimary: true,
      consultationDays: ["Monday", "Wednesday", "Friday"],
      startTime: "09:00",
      endTime: "17:00",
    },
  ])

  const [originalClinics, setOriginalClinics] = useState<Clinic[]>([...clinics])

  const handleEdit = () => {
    setOriginalClinics([...clinics])
    setIsEditing(true)
  }

  const handleCancel = () => {
    setClinics([...originalClinics])
    setIsEditing(false)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await apiClient.updateClinics(clinics)
      toast.success("Clinic associations updated successfully.", { duration: 2500 })
      setOriginalClinics([...clinics])
      setIsEditing(false)
    } catch (error) {
      toast.error("Failed to update clinic associations")
    } finally {
      setIsLoading(false)
    }
  }

  const addClinic = () => {
    setClinics([
      ...clinics,
      {
        clinicName: "",
        role: "",
        isPrimary: false,
        consultationDays: [],
        startTime: "",
        endTime: "",
      },
    ])
  }

  const removeClinic = (index: number) => {
    setClinics(clinics.filter((_, i) => i !== index))
  }

  const updateClinic = (index: number, field: keyof Clinic, value: any) => {
    const updated = [...clinics]
    updated[index] = { ...updated[index], [field]: value }
    setClinics(updated)
  }

  const toggleDay = (clinicIndex: number, day: string) => {
    const updated = [...clinics]
    const days = updated[clinicIndex].consultationDays
    if (days.includes(day)) {
      updated[clinicIndex].consultationDays = days.filter((d) => d !== day)
    } else {
      updated[clinicIndex].consultationDays = [...days, day]
    }
    setClinics(updated)
  }

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  return (
    <SimpleFormCard
      title="Clinic Association"
      description="Manage your clinic associations and schedules"
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <div className="space-y-6">
        {clinics.map((clinic, index) => (
          <div key={index} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Clinic {index + 1}</h4>
              {isEditing && clinics.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeClinic(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`clinic-name-${index}`}>Clinic Name</Label>
                <Input
                  id={`clinic-name-${index}`}
                  value={clinic.clinicName}
                  onChange={(e) => updateClinic(index, "clinicName", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`role-${index}`}>Role</Label>
                <Select
                  value={clinic.role}
                  onValueChange={(value) => updateClinic(index, "role", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger id={`role-${index}`}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consultant">Consultant</SelectItem>
                    <SelectItem value="Visiting Doctor">Visiting Doctor</SelectItem>
                    <SelectItem value="Resident Doctor">Resident Doctor</SelectItem>
                    <SelectItem value="Owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`start-time-${index}`}>Start Time</Label>
                <Input
                  id={`start-time-${index}`}
                  type="time"
                  value={clinic.startTime}
                  onChange={(e) => updateClinic(index, "startTime", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`end-time-${index}`}>End Time</Label>
                <Input
                  id={`end-time-${index}`}
                  type="time"
                  value={clinic.endTime}
                  onChange={(e) => updateClinic(index, "endTime", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Consultation Days</Label>
              <div className="flex flex-wrap gap-3">
                {weekDays.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${index}-${day}`}
                      checked={clinic.consultationDays.includes(day)}
                      onCheckedChange={() => toggleDay(index, day)}
                      disabled={!isEditing}
                    />
                    <Label htmlFor={`${index}-${day}`} className="text-sm font-normal cursor-pointer">
                      {day.slice(0, 3)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id={`primary-${index}`}
                checked={clinic.isPrimary}
                onCheckedChange={(checked) => updateClinic(index, "isPrimary", checked)}
                disabled={!isEditing}
              />
              <Label htmlFor={`primary-${index}`} className="text-sm font-normal cursor-pointer">
                Set as primary clinic
              </Label>
            </div>
          </div>
        ))}

        {isEditing && (
          <Button type="button" variant="outline" onClick={addClinic} className="w-full bg-transparent">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Clinic
          </Button>
        )}
      </div>
    </SimpleFormCard>
  )
}
