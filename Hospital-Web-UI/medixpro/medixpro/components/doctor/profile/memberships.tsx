"use client"

import { useState } from "react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { useToastNotification } from "@/hooks/use-toast-notification"

interface Membership {
  id?: string
  organizationName: string
  membershipId: string
  startDate: string
  expiryDate?: string
  status: string
}

export function MembershipsSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToastNotification()

  const [memberships, setMemberships] = useState<Membership[]>([
    {
      organizationName: "Indian Medical Association",
      membershipId: "IMA123456",
      startDate: "2010-01-15",
      status: "Active",
    },
    {
      organizationName: "Cardiological Society of India",
      membershipId: "CSI789012",
      startDate: "2012-06-20",
      expiryDate: "2025-06-20",
      status: "Active",
    },
  ])

  const [originalMemberships, setOriginalMemberships] = useState<Membership[]>([...memberships])

  const handleEdit = () => {
    setOriginalMemberships([...memberships])
    setIsEditing(true)
  }

  const handleCancel = () => {
    setMemberships([...originalMemberships])
    setIsEditing(false)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // API call would go here
      toast.success("Memberships updated successfully.", { duration: 2500 })
      setOriginalMemberships([...memberships])
      setIsEditing(false)
    } catch (error) {
      toast.error("Failed to update memberships")
    } finally {
      setIsLoading(false)
    }
  }

  const addMembership = () => {
    setMemberships([
      ...memberships,
      {
        organizationName: "",
        membershipId: "",
        startDate: "",
        status: "Active",
      },
    ])
  }

  const removeMembership = (index: number) => {
    setMemberships(memberships.filter((_, i) => i !== index))
  }

  const updateMembership = (index: number, field: keyof Membership, value: any) => {
    const updated = [...memberships]
    updated[index] = { ...updated[index], [field]: value }
    setMemberships(updated)
  }

  return (
    <SimpleFormCard
      title="Professional Memberships"
      description="Manage your professional organization memberships"
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <div className="space-y-6">
        {memberships.map((membership, index) => (
          <div key={index} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Membership {index + 1}</h4>
              {isEditing && memberships.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeMembership(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`org-name-${index}`}>Organization Name</Label>
                <Input
                  id={`org-name-${index}`}
                  value={membership.organizationName}
                  onChange={(e) => updateMembership(index, "organizationName", e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g., Indian Medical Association"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`membership-id-${index}`}>Membership ID</Label>
                <Input
                  id={`membership-id-${index}`}
                  value={membership.membershipId}
                  onChange={(e) => updateMembership(index, "membershipId", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`start-date-${index}`}>Start Date</Label>
                <Input
                  id={`start-date-${index}`}
                  type="date"
                  value={membership.startDate}
                  onChange={(e) => updateMembership(index, "startDate", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`expiry-date-${index}`}>Expiry Date (Optional)</Label>
                <Input
                  id={`expiry-date-${index}`}
                  type="date"
                  value={membership.expiryDate || ""}
                  onChange={(e) => updateMembership(index, "expiryDate", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`status-${index}`}>Status</Label>
                <Input
                  id={`status-${index}`}
                  value={membership.status}
                  onChange={(e) => updateMembership(index, "status", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Active, Expired, etc."
                />
              </div>
            </div>
          </div>
        ))}

        {isEditing && (
          <Button type="button" variant="outline" onClick={addMembership} className="w-full bg-transparent">
            <Plus className="h-4 w-4 mr-2" />
            Add Membership
          </Button>
        )}
      </div>
    </SimpleFormCard>
  )
}
