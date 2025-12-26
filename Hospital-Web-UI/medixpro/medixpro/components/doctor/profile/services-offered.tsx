"use client"

import { useState } from "react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"

interface Service {
  id?: string
  name: string
  description: string
  duration: string
  fee: string
  isActive: boolean
}

export function ServicesOfferedSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToastNotification()

  const [services, setServices] = useState<Service[]>([
    {
      name: "General Consultation",
      description: "Comprehensive health checkup and consultation",
      duration: "30",
      fee: "1000",
      isActive: true,
    },
    {
      name: "ECG",
      description: "Electrocardiogram test",
      duration: "15",
      fee: "500",
      isActive: true,
    },
    {
      name: "Echocardiography",
      description: "Ultrasound of the heart",
      duration: "45",
      fee: "2500",
      isActive: true,
    },
  ])

  const [originalServices, setOriginalServices] = useState<Service[]>([...services])

  const handleEdit = () => {
    setOriginalServices([...services])
    setIsEditing(true)
  }

  const handleCancel = () => {
    setServices([...originalServices])
    setIsEditing(false)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await apiClient.updateServices(services)
      toast.success("Services updated successfully.", { duration: 2500 })
      setOriginalServices([...services])
      setIsEditing(false)
    } catch (error) {
      toast.error("Failed to update services")
    } finally {
      setIsLoading(false)
    }
  }

  const addService = () => {
    setServices([
      ...services,
      {
        name: "",
        description: "",
        duration: "",
        fee: "",
        isActive: true,
      },
    ])
  }

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index))
  }

  const updateService = (index: number, field: keyof Service, value: any) => {
    const updated = [...services]
    updated[index] = { ...updated[index], [field]: value }
    setServices(updated)
  }

  return (
    <SimpleFormCard
      title="Services Offered"
      description="Manage the services you provide to patients"
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <div className="space-y-6">
        {services.map((service, index) => (
          <div key={index} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Service {index + 1}</h4>
              {isEditing && services.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeService(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`service-name-${index}`}>Service Name</Label>
                <Input
                  id={`service-name-${index}`}
                  value={service.name}
                  onChange={(e) => updateService(index, "name", e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g., General Consultation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`service-duration-${index}`}>Duration (minutes)</Label>
                <Input
                  id={`service-duration-${index}`}
                  type="number"
                  value={service.duration}
                  onChange={(e) => updateService(index, "duration", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`service-description-${index}`}>Description</Label>
                <Textarea
                  id={`service-description-${index}`}
                  value={service.description}
                  onChange={(e) => updateService(index, "description", e.target.value)}
                  disabled={!isEditing}
                  rows={2}
                  placeholder="Brief description of the service"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`service-fee-${index}`}>Fee (₹)</Label>
                <Input
                  id={`service-fee-${index}`}
                  type="number"
                  value={service.fee}
                  onChange={(e) => updateService(index, "fee", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id={`service-active-${index}`}
                  checked={service.isActive}
                  onCheckedChange={(checked) => updateService(index, "isActive", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor={`service-active-${index}`} className="text-sm font-normal cursor-pointer">
                  Service is active
                </Label>
              </div>
            </div>
          </div>
        ))}

        {isEditing && (
          <Button type="button" variant="outline" onClick={addService} className="w-full bg-transparent">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        )}
      </div>
    </SimpleFormCard>
  )
}
