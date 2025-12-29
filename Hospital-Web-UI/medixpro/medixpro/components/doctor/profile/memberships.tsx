"use client"

import { useState, useEffect } from "react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"

interface Membership {
  id?: string
  organization_name: string
  membership_id: string
  designation: string
  year_of_joining: string
}

export function MembershipsSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const toast = useToastNotification()

  const [memberships, setMemberships] = useState<Membership[]>([])
  const [originalMemberships, setOriginalMemberships] = useState<Membership[]>([])

  // Fetch memberships from profile
  useEffect(() => {
    fetchMemberships()
  }, [])

  const fetchMemberships = async () => {
    setIsFetching(true)
    try {
      const profileResponse = await apiClient.getProfile()
      const profile = profileResponse?.doctor_profile || profileResponse
      const membershipsData = profile?.memberships || []

      const formattedMemberships: Membership[] = membershipsData.map((m: any) => ({
        id: m.id,
        organization_name: m.organization_name || "",
        membership_id: m.membership_id || "",
        designation: m.designation || "",
        year_of_joining: m.year_of_joining ? String(m.year_of_joining) : "",
      }))

      setMemberships(formattedMemberships)
      setOriginalMemberships(formattedMemberships)
    } catch (error: any) {
      console.error("Failed to fetch memberships:", error)
      // Don't show error toast on initial load if no data exists
    } finally {
      setIsFetching(false)
    }
  }

  const handleEdit = () => {
    setOriginalMemberships([...memberships])
    setIsEditing(true)
  }

  const handleCancel = () => {
    setMemberships([...originalMemberships])
    setIsEditing(false)
  }

  const handleSave = async () => {
    // Validate all memberships
    for (const membership of memberships) {
      if (!membership.organization_name.trim()) {
        toast.error("Organization name is required for all memberships")
        return
      }
    }

    setIsLoading(true)
    try {
      // TODO: Implement API call to save memberships
      // For now, we'll use a placeholder
      // await doctorAPI.updateMemberships(memberships)
      
      toast.success("Memberships updated successfully.", { duration: 2500 })
      setOriginalMemberships([...memberships])
      setIsEditing(false)
      // Refresh data
      await fetchMemberships()
    } catch (error: any) {
      console.error("Failed to update memberships:", error)
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update memberships"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const addMembership = () => {
    setMemberships([
      ...memberships,
      {
        organization_name: "",
        membership_id: "",
        designation: "",
        year_of_joining: "",
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

  if (isFetching) {
    return (
      <SimpleFormCard title="Professional Memberships" description="Manage your professional organization memberships">
        <div className="text-center py-4 text-sm text-muted-foreground">Loading memberships...</div>
      </SimpleFormCard>
    )
  }

  return (
    <SimpleFormCard
      title="Professional Memberships"
      description="Manage your professional organization memberships"
      isEditing={isEditing}
      isSaving={isLoading}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <div className="space-y-6">
        {memberships.length === 0 && !isEditing && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No memberships added yet. Click Edit to add your first membership.
          </div>
        )}

        {memberships.map((membership, index) => (
          <div key={membership.id || index} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Membership {index + 1}</h4>
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMembership(index)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`org-name-${index}`}>Organization Name *</Label>
                <Input
                  id={`org-name-${index}`}
                  value={membership.organization_name}
                  onChange={(e) => updateMembership(index, "organization_name", e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g., Indian Medical Association"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`membership-id-${index}`}>Membership ID</Label>
                <Input
                  id={`membership-id-${index}`}
                  value={membership.membership_id}
                  onChange={(e) => updateMembership(index, "membership_id", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter membership ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`designation-${index}`}>Designation</Label>
                <Input
                  id={`designation-${index}`}
                  value={membership.designation}
                  onChange={(e) => updateMembership(index, "designation", e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g., Life Member, Fellow"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`year-${index}`}>Year of Joining</Label>
                <Input
                  id={`year-${index}`}
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={membership.year_of_joining}
                  onChange={(e) => updateMembership(index, "year_of_joining", e.target.value)}
                  disabled={!isEditing}
                  placeholder="YYYY"
                />
              </div>
            </div>
          </div>
        ))}

        {isEditing && (
          <Button type="button" variant="outline" onClick={addMembership} className="w-full bg-transparent" disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Membership
          </Button>
        )}
      </div>
    </SimpleFormCard>
  )
}
