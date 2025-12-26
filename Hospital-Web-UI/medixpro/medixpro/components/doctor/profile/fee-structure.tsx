"use client"

import { useState } from "react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"

interface FeeStructure {
  consultationType: string
  consultationFee: string
  followUpFee: string
  emergencyFee: string
  followUpDuration: string
  followUpPolicy: string
  cancellationPolicy: string
}

export function FeeStructureSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToastNotification()

  const [feeData, setFeeData] = useState<FeeStructure>({
    consultationType: "In-Person",
    consultationFee: "1000",
    followUpFee: "500",
    emergencyFee: "2000",
    followUpDuration: "7",
    followUpPolicy: "Free follow-up within 7 days for the same condition",
    cancellationPolicy: "24 hours notice required for cancellation",
  })

  const [originalData, setOriginalData] = useState<FeeStructure>({ ...feeData })

  const handleEdit = () => {
    setOriginalData({ ...feeData })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setFeeData({ ...originalData })
    setIsEditing(false)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await apiClient.updateFeeStructure(feeData)
      toast.success("Fee structure updated successfully.", { duration: 2500 })
      setOriginalData({ ...feeData })
      setIsEditing(false)
    } catch (error) {
      toast.error("Failed to update fee structure")
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = (field: keyof FeeStructure, value: string) => {
    setFeeData({ ...feeData, [field]: value })
  }

  return (
    <SimpleFormCard
      title="Fee Structure & Policies"
      description="Manage your consultation fees and policies"
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="consultation-type">Consultation Type</Label>
            <Select
              value={feeData.consultationType}
              onValueChange={(value) => updateField("consultationType", value)}
              disabled={!isEditing}
            >
              <SelectTrigger id="consultation-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In-Person">In-Person</SelectItem>
                <SelectItem value="Video">Video Consultation</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consultation-fee">Consultation Fee (₹)</Label>
            <Input
              id="consultation-fee"
              type="number"
              value={feeData.consultationFee}
              onChange={(e) => updateField("consultationFee", e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="follow-up-fee">Follow-up Fee (₹)</Label>
            <Input
              id="follow-up-fee"
              type="number"
              value={feeData.followUpFee}
              onChange={(e) => updateField("followUpFee", e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency-fee">Emergency Consultation Fee (₹)</Label>
            <Input
              id="emergency-fee"
              type="number"
              value={feeData.emergencyFee}
              onChange={(e) => updateField("emergencyFee", e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="follow-up-duration">Follow-up Duration (days)</Label>
            <Input
              id="follow-up-duration"
              type="number"
              value={feeData.followUpDuration}
              onChange={(e) => updateField("followUpDuration", e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="follow-up-policy">Follow-up Policy</Label>
          <Textarea
            id="follow-up-policy"
            value={feeData.followUpPolicy}
            onChange={(e) => updateField("followUpPolicy", e.target.value)}
            disabled={!isEditing}
            rows={3}
            placeholder="Describe your follow-up policy..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cancellation-policy">Cancellation Policy</Label>
          <Textarea
            id="cancellation-policy"
            value={feeData.cancellationPolicy}
            onChange={(e) => updateField("cancellationPolicy", e.target.value)}
            disabled={!isEditing}
            rows={3}
            placeholder="Describe your cancellation policy..."
          />
        </div>
      </div>
    </SimpleFormCard>
  )
}
