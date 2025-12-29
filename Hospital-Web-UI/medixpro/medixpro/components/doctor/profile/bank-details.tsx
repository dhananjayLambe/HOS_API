"use client"

import { useState, useEffect } from "react"
import { Building2, Clock, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResponsiveFormGrid } from "@/components/doctor/profile/shared/responsive-form-grid"
import { apiClient } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { validateIFSC, validateUPI } from "@/lib/validation"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BankDetailsData {
  account_holder_name: string
  account_number: string
  bank_name: string
  branch_name: string
  ifsc_code: string
  upi_id: string
}

type VerificationStatusType = "pending" | "verified" | "rejected" | "not_submitted"

export function BankDetailsSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusType>("not_submitted")
  const [rejectionReason, setRejectionReason] = useState<string>("")
  const [maskedAccountNumber, setMaskedAccountNumber] = useState<string>("")
  const [hasBankDetails, setHasBankDetails] = useState(false)
  const [bankDetailsId, setBankDetailsId] = useState<string | null>(null)
  const toast = useToastNotification()

  const [formData, setFormData] = useState<BankDetailsData>({
    account_holder_name: "",
    account_number: "",
    bank_name: "",
    branch_name: "",
    ifsc_code: "",
    upi_id: "",
  })

  const [originalData, setOriginalData] = useState<BankDetailsData>({ ...formData })

  // Fetch bank details from profile
  useEffect(() => {
    fetchBankDetails()
  }, [])

  const fetchBankDetails = async () => {
    setIsLoading(true)
    try {
      // Get bank details from dedicated API endpoint
      const response = await apiClient.getBankDetails()
      
      // Handle response structure: { status: "success", data: {...} }
      const bankDetails = response?.data

      if (bankDetails) {
        setHasBankDetails(true)
        setBankDetailsId(bankDetails.id || null)
        const status = (bankDetails.verification_status || "not_submitted") as VerificationStatusType
        setVerificationStatus(status)
        setRejectionReason(bankDetails.rejection_reason || "")
        setMaskedAccountNumber(bankDetails.account_number_masked || bankDetails.masked_account_number || "")

        const data: BankDetailsData = {
          account_holder_name: bankDetails.account_holder_name || "",
          // If verified, don't populate account_number (use masked version for display)
          // If pending/rejected, allow editing (but API may return masked, so we'll handle it)
          account_number: status === "verified" ? "" : (bankDetails.account_number || ""),
          bank_name: bankDetails.bank_name || "",
          branch_name: bankDetails.branch_name || "",
          ifsc_code: bankDetails.ifsc_code || "",
          upi_id: bankDetails.upi_id || "",
        }
        setFormData(data)
        setOriginalData(data)
      } else {
        setHasBankDetails(false)
        setBankDetailsId(null)
        setVerificationStatus("not_submitted")
      }
    } catch (error: any) {
      console.error("Failed to fetch bank details:", error)
      // If 404, bank details don't exist yet - this is fine
      if (error?.response?.status !== 404) {
        // Only show error for non-404 errors
        console.error("Error fetching bank details:", error)
      }
      setHasBankDetails(false)
      setBankDetailsId(null)
      setVerificationStatus("not_submitted")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    // Only allow editing if status is pending, rejected, or not_submitted
    if (verificationStatus === "verified") {
      return
    }
    setOriginalData({ ...formData })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setFormData({ ...originalData })
    setIsEditing(false)
  }

  const handleSave = async () => {
    // Validation: Either bank details OR UPI ID must be present
    const hasBankInfo = formData.account_holder_name.trim() && 
                       formData.account_number.trim() && 
                       formData.ifsc_code.trim() && 
                       formData.bank_name.trim()
    const hasUPI = formData.upi_id.trim()

    if (!hasBankInfo && !hasUPI) {
      toast.error("Please provide either bank details or UPI ID")
      return
    }

    // Validate bank details if provided
    if (hasBankInfo) {
      if (!formData.account_holder_name.trim()) {
        toast.error("Account holder name is required")
        return
      }

      if (!formData.account_number.trim()) {
        toast.error("Account number is required")
        return
      }

      if (!formData.ifsc_code.trim()) {
        toast.error("IFSC code is required")
        return
      }

      if (!validateIFSC(formData.ifsc_code)) {
        toast.error("Please enter a valid IFSC code")
        return
      }

      if (!formData.bank_name.trim()) {
        toast.error("Bank name is required")
        return
      }
    }

    // Validate UPI ID if provided
    if (hasUPI && !validateUPI(formData.upi_id)) {
      toast.error("Please enter a valid UPI ID")
      return
    }

    setIsSaving(true)
    try {
      // Map frontend field names to backend field names
      const payload = {
        account_holder_name: formData.account_holder_name || null,
        account_number: formData.account_number || null,
        bank_name: formData.bank_name || null,
        branch_name: formData.branch_name || null,
        ifsc_code: formData.ifsc_code ? formData.ifsc_code.toUpperCase() : null,
        upi_id: formData.upi_id || null,
      }

      let response
      
      // Use stored state to determine if we should update or create
      // This avoids unnecessary GET requests that return 404 after deletion
      if (hasBankDetails && bankDetailsId) {
        // We have bank details and an ID - try to update
        try {
          console.log(`Updating bank details with ID: ${bankDetailsId}`)
          response = await apiClient.updateBankDetails(payload, bankDetailsId)
          // Update successful
        } catch (updateError: any) {
          // If update fails with 404, the record might have been deleted
          // Try to create new instead
          if (updateError?.response?.status === 404) {
            console.log("Bank details not found (may have been deleted), creating new")
            response = await apiClient.createBankDetails(payload)
            if (response?.data?.id) {
              setBankDetailsId(response.data.id)
              setHasBankDetails(true)
            }
          } else {
            throw updateError
          }
        }
      } else {
        // No existing bank details - create new
        console.log("Creating new bank details")
        try {
          response = await apiClient.createBankDetails(payload)
          // Store the ID from the response
          if (response?.data?.id) {
            setBankDetailsId(response.data.id)
            setHasBankDetails(true)
          }
        } catch (createError: any) {
          // If create fails with 409 (conflict), there might be an active record
          // Try to fetch and update instead
          if (createError?.response?.status === 409) {
            console.log("Bank details already exist, fetching to update")
            try {
              const currentBankDetails = await apiClient.getBankDetails()
              const existingId = currentBankDetails?.data?.id
              if (existingId) {
                response = await apiClient.updateBankDetails(payload, existingId)
                setBankDetailsId(existingId)
                setHasBankDetails(true)
              } else {
                throw createError
              }
            } catch (fetchError) {
              throw createError
            }
          } else {
            throw createError
          }
        }
      }
      
      // Show appropriate message based on status
      if (verificationStatus === "rejected") {
        toast.success("Bank details resubmitted for verification", { duration: 2500 })
      } else if (hasBankDetails) {
        toast.success("Bank details updated successfully", { duration: 2500 })
      } else {
        toast.success("Bank details saved successfully", { duration: 2500 })
      }
      
      setIsEditing(false)
      setOriginalData({ ...formData })
      // Refresh data
      await fetchBankDetails()
    } catch (error: any) {
      console.error("Failed to save bank details:", error)
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to save bank details"
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!hasBankDetails) {
      toast.error("No bank details to delete")
      return
    }

    // Cannot delete if status is "verified"
    if (verificationStatus === "verified") {
      toast.error("You cannot delete verified bank details. Please contact admin.")
      return
    }

    if (!confirm("Are you sure you want to delete your bank details? This action cannot be undone.")) {
      return
    }

    setIsSaving(true)
    try {
      // Always fetch current bank details to get the ID
      const currentBankDetails = await apiClient.getBankDetails()
      const existingId = currentBankDetails?.data?.id

      if (existingId) {
        await apiClient.deleteBankDetails(existingId)
      } else {
        // If no ID, try deleting without ID (backend will find active one)
        await apiClient.deleteBankDetails()
      }

      toast.success("Bank details deleted successfully", { duration: 2500 })
      
      // Reset form state immediately (don't refetch to avoid 404 errors)
      setHasBankDetails(false)
      setBankDetailsId(null)
      setVerificationStatus("not_submitted")
      setRejectionReason("")
      setMaskedAccountNumber("")
      setFormData({
        account_holder_name: "",
        account_number: "",
        bank_name: "",
        branch_name: "",
        ifsc_code: "",
        upi_id: "",
      })
      setOriginalData({
        account_holder_name: "",
        account_number: "",
        bank_name: "",
        branch_name: "",
        ifsc_code: "",
        upi_id: "",
      })
      setIsEditing(false)
      
      // Don't call fetchBankDetails() here - it will cause 404 errors
      // The form is already reset, so we're good
    } catch (error: any) {
      console.error("Failed to delete bank details:", error)
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete bank details"
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  // Determine if edit button should be shown/enabled
  const canEdit = verificationStatus !== "verified"
  const isReadOnly = verificationStatus === "verified"
  const canDelete = hasBankDetails && verificationStatus !== "verified"
  
  // Get status message
  const getStatusMessage = () => {
    switch (verificationStatus) {
      case "pending":
        return "Your bank details are under verification. This may take up to 24 hours."
      case "verified":
        return "Your bank details have been successfully verified."
      case "rejected":
        return "Your bank details were rejected. Please correct the details and resubmit."
      default:
        return null
    }
  }

  // Get display value for account number
  const getAccountNumberDisplay = () => {
    if (isEditing && !isReadOnly) {
      return formData.account_number
    }
    if (isReadOnly && maskedAccountNumber) {
      return maskedAccountNumber
    }
    if (maskedAccountNumber && !isEditing) {
      return maskedAccountNumber
    }
    return formData.account_number
  }

  if (isLoading) {
    return (
      <SimpleFormCard title="Bank Details" description="Your banking information for payments">
        <div className="text-center py-4 text-sm text-muted-foreground">Loading bank details...</div>
      </SimpleFormCard>
    )
  }

  return (
    <SimpleFormCard
      title="Bank Details"
      description="Your banking information for receiving payments from DoctorPro"
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={canEdit ? handleEdit : undefined}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      {/* Delete Button - Show when bank details exist and not verified */}
      {canDelete && !isEditing && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isSaving}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Bank Details
          </Button>
        </div>
      )}

      {/* Status Badge and Message */}
      {hasBankDetails && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            {verificationStatus === "pending" ? (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20">
                <Clock className="mr-1 h-3 w-3" />
                Status: Pending Verification
              </Badge>
            ) : verificationStatus === "verified" ? (
              <Badge variant="default" className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Status: Verified
              </Badge>
            ) : verificationStatus === "rejected" ? (
              <Badge variant="destructive" className="bg-red-500/10 text-red-700 hover:bg-red-500/20">
                <XCircle className="mr-1 h-3 w-3" />
                Status: Rejected
              </Badge>
            ) : null}
          </div>
          {getStatusMessage() && (
            <p className="text-sm text-muted-foreground">{getStatusMessage()}</p>
          )}
          {verificationStatus === "rejected" && rejectionReason && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Rejection Reason:</strong> {rejectionReason}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
      <ResponsiveFormGrid>
        <div className="col-span-full space-y-2">
          <Label htmlFor="account_holder_name">Account Holder Name *</Label>
          <Input
            id="account_holder_name"
            value={formData.account_holder_name}
            onChange={(e) => {
              const value = e.target.value
              // Auto-capitalize first letter of each word
              const capitalized = value.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ')
              setFormData({ ...formData, account_holder_name: capitalized })
            }}
            disabled={!isEditing || isReadOnly}
            placeholder="As per bank records"
            required
            readOnly={isReadOnly}
            className={isReadOnly ? "bg-muted" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="account_number">Account Number *</Label>
          <Input
            id="account_number"
            type="text"
            value={getAccountNumberDisplay()}
            onChange={(e) => {
              if (isEditing && !isReadOnly) {
                setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, "") })
              }
            }}
            disabled={!isEditing || isReadOnly}
            placeholder="Enter account number"
            required
            readOnly={isReadOnly || (!isEditing && isReadOnly)}
            className={isReadOnly || (!isEditing && isReadOnly) ? "bg-muted" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ifsc_code">IFSC Code *</Label>
          <Input
            id="ifsc_code"
            value={formData.ifsc_code}
            onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
            disabled={!isEditing || isReadOnly}
            placeholder="SBIN0001234"
            maxLength={11}
            required
            readOnly={isReadOnly}
            className={isReadOnly ? "bg-muted" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bank_name">Bank Name *</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="bank_name"
              className={isReadOnly ? "bg-muted pl-10" : "pl-10"}
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              disabled={!isEditing || isReadOnly}
              placeholder="Enter bank name"
              required
              readOnly={isReadOnly}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch_name">Branch Name</Label>
          <Input
            id="branch_name"
            value={formData.branch_name}
            onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
            disabled={!isEditing || isReadOnly}
            placeholder="Enter branch name"
            readOnly={isReadOnly}
            className={isReadOnly ? "bg-muted" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="upi_id">UPI ID</Label>
          <Input
            id="upi_id"
            value={formData.upi_id}
            onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
            disabled={!isEditing || isReadOnly}
            placeholder="yourname@upi"
            readOnly={isReadOnly}
            className={isReadOnly ? "bg-muted" : ""}
          />
        </div>
      </ResponsiveFormGrid>
    </SimpleFormCard>
  )
}
