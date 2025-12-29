"use client"

import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"

export function ServicesOfferedSection() {
  return (
    <SimpleFormCard
      title="Services Offered"
      description="Manage the services you provide to patients"
      isEditing={false}
      onEdit={() => {}}
      onSave={() => {}}
      onCancel={() => {}}
    >
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground text-center">
          Service pricing will be available in a future update.
        </p>
      </div>
    </SimpleFormCard>
  )
}
