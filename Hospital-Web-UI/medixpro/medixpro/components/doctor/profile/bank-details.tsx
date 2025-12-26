"use client"

import { useState } from "react"
import { CreditCard, Building2 } from "lucide-react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveFormGrid } from "@/components/doctor/profile/shared/responsive-form-grid"
import { doctorAPI } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { validateIFSC } from "@/lib/validation"

export function BankDetailsSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const toast = useToastNotification()

  const [formData, setFormData] = useState({
    accountHolderName: "Dr. Sarah Johnson",
    accountNumber: "1234567890",
    bankName: "State Bank of India",
    branchName: "Main Branch",
    ifscCode: "SBIN0001234",
    accountType: "Savings",
  })

  const [originalData, setOriginalData] = useState(formData)

  const handleEdit = () => {
    setOriginalData(formData)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setFormData(originalData)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!formData.accountHolderName.trim()) {
      toast.error("Account holder name is required")
      return
    }

    if (!formData.accountNumber.trim()) {
      toast.error("Account number is required")
      return
    }

    if (!validateIFSC(formData.ifscCode)) {
      toast.error("Please enter a valid IFSC code")
      return
    }

    setIsSaving(true)
    try {
      const token = localStorage.getItem("authToken") || ""
      await doctorAPI.updateBankDetails(formData, token)
      toast.success("Bank details updated successfully.", { duration: 2500 })
      setIsEditing(false)
      setOriginalData(formData)
    } catch (error) {
      toast.error("Failed to update bank details")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SimpleFormCard
      title="Bank Details"
      description="Your banking information for payments"
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <ResponsiveFormGrid>
        <div className="col-span-full space-y-2">
          <Label htmlFor="accountHolderName">Account Holder Name</Label>
          <Input
            id="accountHolderName"
            value={formData.accountHolderName}
            onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
            disabled={!isEditing}
            placeholder="As per bank records"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountNumber">Account Number</Label>
          <Input
            id="accountNumber"
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            disabled={!isEditing}
            placeholder="Enter account number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountType">Account Type</Label>
          <Input
            id="accountType"
            value={formData.accountType}
            onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
            disabled={!isEditing}
            placeholder="Savings/Current"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bankName">Bank Name</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="bankName"
              className="pl-10"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              disabled={!isEditing}
              placeholder="Enter bank name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="branchName">Branch Name</Label>
          <Input
            id="branchName"
            value={formData.branchName}
            onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
            disabled={!isEditing}
            placeholder="Enter branch name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ifscCode">IFSC Code</Label>
          <Input
            id="ifscCode"
            value={formData.ifscCode}
            onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
            disabled={!isEditing}
            placeholder="SBIN0001234"
            maxLength={11}
          />
        </div>
      </ResponsiveFormGrid>
    </SimpleFormCard>
  )
}
