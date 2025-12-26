"use client"

import { useEffect, useState, useRef } from "react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Upload, CheckCircle2, XCircle, Clock, Trash2, Eye, FileText, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { validatePAN, validateAadhaar } from "@/lib/validation"

interface KYCDocument {
  type: "PAN Card" | "Aadhaar Card" | "Medical Registration" | "Digital Signature"
  number: string
  status: "pending" | "approved" | "rejected"
  rejectionReason?: string
  file?: File | null
  uploadedFileName?: string
  uploadedFileUrl?: string
  id?: string
  isMandatory?: boolean
}

interface DetailedKYCStatus {
  registration?: {
    status: "pending" | "approved" | "rejected"
    reason?: string
  }
  pan?: {
    status: "pending" | "approved" | "rejected"
    reason?: string
  }
  aadhar?: {
    status: "pending" | "approved" | "rejected"
    reason?: string
  }
  photo?: {
    status: "pending" | "approved" | "rejected"
    reason?: string
  }
  education?: {
    status: "pending" | "approved" | "rejected"
    reason?: string
  }
  kya_verified?: boolean
  verified_at?: string
  updated_at?: string
}

export function KYCVerificationSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToastNotification()
  
  // Use ref to store files to avoid closure issues
  const filesRef = useRef<Map<number, File>>(new Map())

  const [documents, setDocuments] = useState<KYCDocument[]>([
    { type: "PAN Card", number: "", status: "pending", isMandatory: true },
    { type: "Aadhaar Card", number: "", status: "pending", isMandatory: true },
    { type: "Medical Registration", number: "", status: "pending", isMandatory: true },
    { type: "Digital Signature", number: "", status: "pending" },
  ])

  const [originalDocuments, setOriginalDocuments] = useState<KYCDocument[]>([...documents])
  const [detailedKYCStatus, setDetailedKYCStatus] = useState<DetailedKYCStatus | null>(null)

  // Helper function to extract filename from URL or path
  const extractFileName = (fileUrl: string | null | undefined): string | undefined => {
    if (!fileUrl) return undefined
    if (typeof fileUrl !== 'string') return undefined
    
    // Handle both full URLs and relative paths
    try {
      const url = new URL(fileUrl, window.location.origin)
      const pathname = url.pathname
      const fileName = pathname.split('/').pop() || pathname.split('\\').pop()
      return fileName || undefined
    } catch {
      // If it's not a valid URL, treat it as a path
      const fileName = fileUrl.split('/').pop() || fileUrl.split('\\').pop()
      return fileName || undefined
    }
  }

  const loadKYCData = async () => {
    setIsLoading(true)
    try {
      // Load Profile to get file information (profile might have file paths)
      let profileData: any = null
      try {
        const profileResponse = await apiClient.getProfile()
        profileData = profileResponse?.data || profileResponse?.profile || profileResponse
      } catch (error: any) {
        console.warn("Could not load profile:", error)
      }

      // Load Government ID (PAN and Aadhaar) - now includes file fields
      let govIdData: any = null
      try {
        const govIdResponse = await apiClient.getGovernmentID()
        govIdData = govIdResponse?.data || govIdResponse
        console.log("Government ID data:", govIdData) // Debug log
      } catch (error: any) {
        // 404 is okay - government ID doesn't exist yet
        if (error?.status !== 404) {
          console.warn("Could not load government ID:", error)
        }
      }

      // Get file paths from profile if available (fallback)
      const govIdsFromProfile = profileData?.government_ids || profileData?.government_id
      const panFileFromProfile = govIdsFromProfile?.pan_card_file
      const aadharFileFromProfile = govIdsFromProfile?.aadhar_card_file

      // Load Registration (Medical Registration)
      let registrationData: any = null
      try {
        const regResponse = await apiClient.getRegistration()
        registrationData = regResponse?.data || regResponse
      } catch (error: any) {
        // 404 is okay - registration doesn't exist yet
        if (error?.status !== 404) {
          console.warn("Could not load registration:", error)
        }
      }

      // Get registration file from profile if available
      const registrationFromProfile = profileData?.registration
      const regCertFromProfile = registrationFromProfile?.registration_certificate

      // Load KYC Status (for detailed status and Digital Signature)
      let kycStatusData: any = null
      let detailedStatus: DetailedKYCStatus | null = null
      try {
        const kycResponse = await apiClient.getKYCStatus()
        kycStatusData = kycResponse?.data || kycResponse
        console.log("KYC Status data:", kycStatusData) // Debug log
        
        // Get detailed status directly from response
        detailedStatus = kycStatusData?.detailed_status || null
        
        // Store detailed status for display
        if (detailedStatus) {
          setDetailedKYCStatus(detailedStatus)
        }
      } catch (error: any) {
        console.warn("Could not load KYC status:", error)
      }

      // Get digital signature from KYC status - now included in response
      const digitalSigFromKYC = kycStatusData?.digital_signature
      console.log("Digital signature:", digitalSigFromKYC) // Debug log

      // Helper function to ensure status is valid
      const getValidStatus = (status: string | undefined): "pending" | "approved" | "rejected" => {
        if (status === "approved" || status === "rejected" || status === "pending") {
          return status
        }
        return "pending"
      }

      // Helper function to get file URL - handles both local and S3 URLs
      const getFileUrl = (filePath: string | null | undefined): string | undefined => {
        if (!filePath) return undefined
        if (typeof filePath !== 'string') return undefined
        
        // If it's already a full URL (http/https), return as is (works for S3)
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          return filePath
        }
        
        // If it's a relative path starting with /, construct full URL
        if (filePath.startsWith('/')) {
          return `${window.location.origin}${filePath}`
        }
        
        // Try to construct URL from relative path
        try {
          const url = new URL(filePath, window.location.origin)
          return url.href
        } catch {
          // If all else fails, return the path as is (might be handled by backend)
          return filePath
        }
      }

      // Update documents with loaded data and KYC status
      // Use detailedStatus from API response directly, not from state
      const updatedDocs: KYCDocument[] = documents.map((doc) => {
        if (doc.type === "PAN Card") {
          const panFile = govIdData?.pan_card_file || panFileFromProfile
          const panStatus = detailedStatus?.pan
          console.log("PAN Status from API:", panStatus) // Debug log
          return {
            ...doc,
            number: govIdData?.pan_card_number || "",
            uploadedFileName: panFile ? extractFileName(panFile) : doc.uploadedFileName,
            uploadedFileUrl: panFile ? getFileUrl(panFile) : doc.uploadedFileUrl,
            status: getValidStatus(panStatus?.status),
            rejectionReason: panStatus?.reason || undefined,
            isMandatory: true,
          }
        }
        if (doc.type === "Aadhaar Card") {
          const aadharFile = govIdData?.aadhar_card_file || aadharFileFromProfile
          const aadharStatus = detailedStatus?.aadhar
          console.log("Aadhaar Status from API:", aadharStatus) // Debug log
          return {
            ...doc,
            number: govIdData?.aadhar_card_number || "",
            uploadedFileName: aadharFile ? extractFileName(aadharFile) : doc.uploadedFileName,
            uploadedFileUrl: aadharFile ? getFileUrl(aadharFile) : doc.uploadedFileUrl,
            status: getValidStatus(aadharStatus?.status),
            rejectionReason: aadharStatus?.reason || undefined,
            isMandatory: true,
          }
        }
        if (doc.type === "Medical Registration") {
          const regCert = registrationData?.registration_certificate || regCertFromProfile
          const regStatus = detailedStatus?.registration
          console.log("Registration Status from API:", regStatus) // Debug log
          return {
            ...doc,
            number: registrationData?.medical_registration_number || "",
            uploadedFileName: regCert ? extractFileName(regCert) : doc.uploadedFileName,
            uploadedFileUrl: regCert ? getFileUrl(regCert) : doc.uploadedFileUrl,
            status: getValidStatus(regStatus?.status),
            rejectionReason: regStatus?.reason || undefined,
            isMandatory: true,
          }
        }
        if (doc.type === "Digital Signature") {
          // Digital Signature doesn't have KYC approval status, just file upload
          return {
            ...doc,
            number: "", // Digital signature doesn't have a number
            uploadedFileName: digitalSigFromKYC ? extractFileName(digitalSigFromKYC) : doc.uploadedFileName,
            uploadedFileUrl: digitalSigFromKYC ? getFileUrl(digitalSigFromKYC) : doc.uploadedFileUrl,
            status: "pending", // Always pending as it doesn't have approval status
          }
        }
        return doc
      })

      setDocuments(updatedDocs)
      setOriginalDocuments(updatedDocs)
    } catch (error: any) {
      console.error("Failed to load KYC data:", error)
      toast.error(error?.message || "Could not load KYC documents")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadKYCData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEdit = () => {
    setOriginalDocuments([...documents])
    setIsEditing(true)
  }

  const handleCancel = () => {
    setDocuments([...originalDocuments])
    setIsEditing(false)
  }

  const handleSave = async () => {
    console.log("[KYC Component] handleSave called")
    
    // Use functional state update to get the latest documents state
    setDocuments((currentDocs) => {
      console.log("[KYC Component] Current documents state in setState:", currentDocs)
      return currentDocs
    })
    
    console.log("[KYC Component] Current documents state:", documents)
    
    // Validate documents - get fresh references
    const panDoc = documents.find((d) => d.type === "PAN Card")
    const aadhaarDoc = documents.find((d) => d.type === "Aadhaar Card")
    const medicalRegDoc = documents.find((d) => d.type === "Medical Registration")
    const digitalSigDoc = documents.find((d) => d.type === "Digital Signature")
    
    // Also log all documents to see the full state
    console.log("[KYC Component] All documents:", documents.map(d => ({
      type: d.type,
      hasFile: !!d.file,
      fileName: d.file?.name,
      uploadedFileName: d.uploadedFileName
    })))

    if (panDoc && panDoc.number && !validatePAN(panDoc.number)) {
      toast.error("Invalid PAN number format")
      return
    }

    if (aadhaarDoc && aadhaarDoc.number && !validateAadhaar(aadhaarDoc.number)) {
      toast.error("Invalid Aadhaar number format")
      return
    }

    setIsLoading(true)
    try {
      // Handle PAN and Aadhaar (Government ID)
      let govIdExists = false
      try {
        await apiClient.getGovernmentID()
        govIdExists = true
      } catch (error: any) {
        if (error?.status !== 404) {
          throw error
        }
      }

      const govIdData: any = {}
      if (panDoc?.number) {
        govIdData.pan_card_number = panDoc.number.replace(/\s/g, "").toUpperCase()
      }
      if (aadhaarDoc?.number) {
        govIdData.aadhar_card_number = aadhaarDoc.number.replace(/\s/g, "")
      }

      if (Object.keys(govIdData).length > 0) {
        if (govIdExists) {
          await apiClient.updateGovernmentID(govIdData)
        } else {
          await apiClient.createGovernmentID(govIdData)
        }
      }

      // Upload PAN and Aadhaar files if any
      const filesToUpload: { pan?: File; aadhaar?: File } = {}
      if (panDoc?.file) {
        filesToUpload.pan = panDoc.file
      }
      if (aadhaarDoc?.file) {
        filesToUpload.aadhaar = aadhaarDoc.file
      }

      if (filesToUpload.pan || filesToUpload.aadhaar) {
        const formData = new FormData()
        if (filesToUpload.pan) {
          formData.append("pan_card_file", filesToUpload.pan)
        }
        if (filesToUpload.aadhaar) {
          formData.append("aadhar_card_file", filesToUpload.aadhaar)
        }
        const uploadResponse = await apiClient.uploadGovernmentIDFiles(formData)
        // Update file names from response - upload response should have file paths
        const uploadData = uploadResponse?.data || uploadResponse
        console.log("Upload response data:", uploadData) // Debug log
        
        if (uploadData) {
          setDocuments((prevDocs) =>
            prevDocs.map((doc) => {
              if (doc.type === "PAN Card" && (uploadData.pan_card_file || filesToUpload.pan)) {
                const fileName = uploadData.pan_card_file 
                  ? extractFileName(uploadData.pan_card_file) 
                  : panDoc?.file?.name
                return {
                  ...doc,
                  uploadedFileName: fileName || doc.uploadedFileName,
                  file: null, // Clear the file after upload
                }
              }
              if (doc.type === "Aadhaar Card" && (uploadData.aadhar_card_file || filesToUpload.aadhaar)) {
                const fileName = uploadData.aadhar_card_file 
                  ? extractFileName(uploadData.aadhar_card_file) 
                  : aadhaarDoc?.file?.name
                return {
                  ...doc,
                  uploadedFileName: fileName || doc.uploadedFileName,
                  file: null, // Clear the file after upload
                }
              }
              return doc
            })
          )
        } else if (filesToUpload.pan || filesToUpload.aadhaar) {
          // If response doesn't have file paths, use the uploaded file names
          setDocuments((prevDocs) =>
            prevDocs.map((doc) => {
              if (doc.type === "PAN Card" && filesToUpload.pan) {
                return {
                  ...doc,
                  uploadedFileName: panDoc?.file?.name || doc.uploadedFileName,
                  file: null,
                }
              }
              if (doc.type === "Aadhaar Card" && filesToUpload.aadhaar) {
                return {
                  ...doc,
                  uploadedFileName: aadhaarDoc?.file?.name || doc.uploadedFileName,
                  file: null,
                }
              }
              return doc
            })
          )
        }
      }

      // Handle Medical Registration
      let registrationExists = false
      try {
        await apiClient.getRegistration()
        registrationExists = true
      } catch (error: any) {
        if (error?.status !== 404) {
          throw error
        }
      }

      if (medicalRegDoc?.number || medicalRegDoc?.file) {
        const regData: any = {}
        if (medicalRegDoc.number) {
          regData.medical_registration_number = medicalRegDoc.number
        }

        if (Object.keys(regData).length > 0) {
          if (registrationExists) {
            await apiClient.updateRegistration(regData)
          } else {
            // Create registration with required fields
            const createData = {
              ...regData,
              medical_council: regData.medical_council || "NA", // Default value if not provided
            }
            await apiClient.createRegistration(createData)
          }
        }

        // Upload registration certificate file
        if (medicalRegDoc.file) {
          const formData = new FormData()
          formData.append("registration_certificate", medicalRegDoc.file)
          if (medicalRegDoc.number) {
            formData.append("medical_registration_number", medicalRegDoc.number)
          }
          const uploadResponse = await apiClient.uploadRegistrationCertificate(formData)
          // Update file name from response
          const uploadData = uploadResponse?.data || uploadResponse
          console.log("Registration upload response:", uploadData) // Debug log
          
          if (uploadData && uploadData.registration_certificate) {
            setDocuments((prevDocs) =>
              prevDocs.map((doc) => {
                if (doc.type === "Medical Registration") {
                  return {
                    ...doc,
                    uploadedFileName: extractFileName(uploadData.registration_certificate) || medicalRegDoc?.file?.name || doc.uploadedFileName,
                    file: null, // Clear the file after upload
                  }
                }
                return doc
              })
            )
          } else if (medicalRegDoc?.file) {
            // If response doesn't have file path, use the uploaded file name
            setDocuments((prevDocs) =>
              prevDocs.map((doc) => {
                if (doc.type === "Medical Registration") {
                  return {
                    ...doc,
                    uploadedFileName: medicalRegDoc?.file?.name || doc.uploadedFileName,
                    file: null,
                  }
                }
                return doc
              })
            )
          }
        }
      }

      // Handle Digital Signature (no KYC status, just file upload)
      const digitalSigIndex = documents.findIndex((d) => d.type === "Digital Signature")
      const digitalSigFileFromRef = digitalSigIndex >= 0 ? filesRef.current.get(digitalSigIndex) : null
      
      // Use file from ref if state doesn't have it, or use state file
      const digitalSigFile = digitalSigDoc?.file || digitalSigFileFromRef
      
      if (digitalSigFile) {
        console.log("[KYC Component] Starting digital signature upload")
        console.log("[KYC Component] File details:", {
          name: digitalSigFile.name,
          size: digitalSigFile.size,
          type: digitalSigFile.type
        })
        
        const formData = new FormData()
        formData.append("digital_signature", digitalSigFile)
        
        try {
          console.log("[KYC Component] Calling apiClient.uploadDigitalSignature...")
          const uploadResponse = await apiClient.uploadDigitalSignature(formData)
          console.log("[KYC Component] Upload response received:", uploadResponse)
          const uploadData = uploadResponse?.data || uploadResponse
          console.log("[KYC Component] Upload data:", uploadData) // Debug log
          
          if (uploadData && uploadData.digital_signature) {
            setDocuments((prevDocs) =>
              prevDocs.map((doc) => {
                if (doc.type === "Digital Signature") {
                  return {
                    ...doc,
                    uploadedFileName: extractFileName(uploadData.digital_signature) || digitalSigFile?.name || doc.uploadedFileName,
                    file: null, // Clear the file after upload
                  }
                }
                return doc
              })
            )
          } else if (digitalSigFile) {
            // If response doesn't have file path, use the uploaded file name
            setDocuments((prevDocs) =>
              prevDocs.map((doc) => {
                if (doc.type === "Digital Signature") {
                  return {
                    ...doc,
                    uploadedFileName: digitalSigFile?.name || doc.uploadedFileName,
                    file: null,
                  }
                }
                return doc
              })
            )
          }
          
          // Clear file from ref after successful upload
          if (digitalSigIndex >= 0) {
            filesRef.current.delete(digitalSigIndex)
            console.log("[KYC Component] File cleared from ref after upload")
          }
        } catch (error: any) {
          console.error("Could not upload digital signature:", error)
          const message =
            error?.message ||
            error?.errors ||
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            "Failed to upload digital signature"
          toast.error(message)
        }
      }

      toast.success("Doctor profile updated successfully", { duration: 2500 })
      
      // Small delay to ensure backend has processed the upload
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Reload to get updated data including KYC status
      await loadKYCData()
      setIsEditing(false)
    } catch (error: any) {
      console.error("Error saving KYC documents:", error)
      const message =
        error?.message ||
        error?.errors ||
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to update KYC documents"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete all KYC documents? This action cannot be undone.")) {
      return
    }

    setIsLoading(true)
    try {
      // Delete government ID (PAN and Aadhaar)
      try {
        await apiClient.deleteGovernmentID()
      } catch (error: any) {
        // 404 is okay - doesn't exist
        if (error?.status !== 404) {
          console.warn("Could not delete government ID:", error)
        }
      }

      // Delete registration
      try {
        await apiClient.deleteRegistration()
      } catch (error: any) {
        // 404 is okay - doesn't exist
        if (error?.status !== 404) {
          console.warn("Could not delete registration:", error)
        }
      }

      toast.success("KYC documents deleted successfully", { duration: 2500 })
      
      // Reset to empty state
      const emptyDocs: KYCDocument[] = [
        { type: "PAN Card", number: "", status: "pending", isMandatory: true },
        { type: "Aadhaar Card", number: "", status: "pending", isMandatory: true },
        { type: "Medical Registration", number: "", status: "pending", isMandatory: true },
        { type: "Digital Signature", number: "", status: "pending" },
      ]
      setDocuments(emptyDocs)
      setOriginalDocuments(emptyDocs)
      setIsEditing(false)
    } catch (error: any) {
      console.error("Error deleting KYC documents:", error)
      const message =
        error?.message ||
        error?.errors ||
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to delete KYC documents"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const updateDocument = (index: number, field: keyof KYCDocument, value: any) => {
    console.log("[KYC Component] updateDocument called:", { index, field, value: value instanceof File ? { name: value.name, size: value.size } : value })
    const updated = [...documents]
    updated[index] = { ...updated[index], [field]: value }
    console.log("[KYC Component] Updated document at index", index, ":", updated[index])
    setDocuments(updated)
  }

  const handleFileChange = (index: number, file: File | null) => {
    console.log("[KYC Component] handleFileChange called", { index, file: file ? { name: file.name, size: file.size, type: file.type } : null })
    if (file) {
      const docType = documents[index]?.type
      console.log("[KYC Component] Updating document:", docType, "with file:", file.name)
      
      // Store file in ref for reliable access
      filesRef.current.set(index, file)
      console.log("[KYC Component] File stored in ref at index:", index)
      
      // Use functional update to ensure we have the latest state
      setDocuments((prevDocs) => {
        const updated = [...prevDocs]
        updated[index] = { 
          ...updated[index], 
          file: file,
          uploadedFileName: file.name
        }
        console.log("[KYC Component] Document updated in state:", {
          type: updated[index].type,
          hasFile: !!updated[index].file,
          fileName: updated[index].file?.name,
          uploadedFileName: updated[index].uploadedFileName
        })
        return updated
      })
    } else {
      console.log("[KYC Component] No file provided in handleFileChange")
      filesRef.current.delete(index)
    }
  }

  // Helper function to mask PAN number (e.g., ABCDE****)
  const maskPAN = (pan: string): string => {
    if (!pan || pan.length < 5) return pan
    return pan.substring(0, 5) + "****"
  }

  // Helper function to mask Aadhaar number (e.g., XXXX-XXXX-1234)
  const maskAadhaar = (aadhaar: string): string => {
    if (!aadhaar || aadhaar.length < 4) return aadhaar
    const cleaned = aadhaar.replace(/\s|-/g, "")
    if (cleaned.length < 12) return aadhaar
    return `XXXX-XXXX-${cleaned.substring(8)}`
  }

  // Helper function to format document number with masking
  const formatDocumentNumber = (doc: KYCDocument): string => {
    if (doc.type === "PAN Card" && doc.number) {
      return maskPAN(doc.number)
    }
    if (doc.type === "Aadhaar Card" && doc.number) {
      return maskAadhaar(doc.number)
    }
    return doc.number
  }

  // Check if upload should be enabled
  const isUploadEnabled = (doc: KYCDocument): boolean => {
    // Digital Signature doesn't have approval status, always allow upload
    if (doc.type === "Digital Signature") return isEditing
    
    // Approved documents cannot be re-uploaded
    if (doc.status === "approved") return false
    
    // Pending and rejected documents can be uploaded/re-uploaded
    return isEditing
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      approved: "Verified",
      pending: "Pending Verification",
      rejected: "Rejected",
    }
    
    const badgeClasses: Record<string, string> = {
      approved: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    }
    
    return (
      <Badge 
        variant="outline" 
        className={`gap-1.5 ${badgeClasses[status] || badgeClasses.pending}`}
      >
        {getStatusIcon(status)}
        {statusLabels[status] || "Pending Verification"}
      </Badge>
    )
  }

  // Get upload button label
  const getUploadButtonLabel = (doc: KYCDocument): string => {
    if (doc.status === "rejected") {
      return "Re-upload Document"
    }
    if (doc.uploadedFileName) {
      return "Change File"
    }
    return "Upload Document"
  }

  // Get helper text for document status
  const getHelperText = (doc: KYCDocument): string | null => {
    if (doc.status === "pending") {
      return "Under admin review"
    }
    if (doc.status === "approved") {
      if (doc.type === "PAN Card") {
        return "PAN cannot be changed once verified"
      }
      return "Document verified and locked"
    }
    return null
  }

  const hasData = documents.some((doc) => doc.number || doc.uploadedFileName)

  return (
    <SimpleFormCard
      title="KYC & Verification"
      description="Upload and manage your verification documents"
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={isLoading}
    >
      <div className="space-y-6">
        {documents.map((doc, index) => {
          const uploadEnabled = isUploadEnabled(doc)
          const showNumberField = doc.type !== "Digital Signature"
          const isFullWidth = doc.type === "Digital Signature"
          
          return (
            <div key={index} className="rounded-lg border p-4 space-y-4 bg-card">
              {/* Document Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{doc.type}</h4>
                  {doc.isMandatory && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      Mandatory
                    </Badge>
                  )}
                </div>
                {/* Don't show status badge for Digital Signature as it doesn't have KYC approval status */}
                {doc.type !== "Digital Signature" && getStatusBadge(doc.status)}
              </div>
              
              {/* Rejection Reason */}
              {doc.status === "rejected" && doc.rejectionReason && doc.type !== "Digital Signature" && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                    <p className="text-sm text-red-700 mt-1">{doc.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Helper Text for Pending Status */}
              {doc.status === "pending" && doc.type !== "Digital Signature" && (
                <div className="rounded-md bg-yellow-50 border border-yellow-200 p-2">
                  <p className="text-xs text-yellow-800 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Under admin review
                  </p>
                </div>
              )}

              {/* Document Number and Upload Section */}
              <div className={`grid gap-4 ${isFullWidth ? "" : "md:grid-cols-2"}`}>
                {/* Document Number Field */}
                {showNumberField && (
                  <div className="space-y-2">
                    <Label htmlFor={`doc-number-${index}`}>
                      Document Number
                      {((doc.type === "PAN Card" || doc.type === "Aadhaar Card") && doc.status === "approved") && (
                        <span className="text-xs text-muted-foreground ml-2">(Masked for security)</span>
                      )}
                    </Label>
                    <Input
                      id={`doc-number-${index}`}
                      value={formatDocumentNumber(doc)}
                      onChange={(e) => {
                        // For approved PAN/Aadhaar, don't allow editing
                        if ((doc.type === "PAN Card" || doc.type === "Aadhaar Card") && doc.status === "approved") {
                          return
                        }
                        updateDocument(index, "number", e.target.value)
                      }}
                      disabled={!isEditing || (doc.status === "approved" && (doc.type === "PAN Card" || doc.type === "Aadhaar Card"))}
                      placeholder={`Enter ${doc.type} number`}
                      className={doc.status === "approved" && (doc.type === "PAN Card" || doc.type === "Aadhaar Card") ? "bg-muted" : ""}
                    />
                    {doc.status === "approved" && (doc.type === "PAN Card" || doc.type === "Aadhaar Card") && (
                      <p className="text-xs text-muted-foreground">
                        {doc.type === "PAN Card" ? "PAN cannot be changed once verified" : "Aadhaar cannot be changed once verified"}
                      </p>
                    )}
                  </div>
                )}

                {/* File Upload Section */}
                <div className={`space-y-2 ${isFullWidth ? "md:col-span-2" : ""}`}>
                  <Label htmlFor={`doc-file-${index}`}>Upload Document</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`doc-file-${index}`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                      disabled={!uploadEnabled}
                      className="hidden"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex-1">
                            <Button
                              type="button"
                              variant={doc.uploadedFileName ? "default" : "outline"}
                              onClick={() => {
                                if (uploadEnabled) {
                                  document.getElementById(`doc-file-${index}`)?.click()
                                }
                              }}
                              disabled={!uploadEnabled}
                              className="w-full"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {doc.uploadedFileName ? (
                                <span className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  <span className="truncate max-w-[200px]" title={doc.uploadedFileName}>
                                    {doc.uploadedFileName}
                                  </span>
                                </span>
                              ) : (
                                getUploadButtonLabel(doc)
                              )}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!uploadEnabled && doc.status === "approved" && (
                          <TooltipContent>
                            <p>{getHelperText(doc) || "Document verified and locked"}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* View File Button */}
                    {doc.uploadedFileName && doc.uploadedFileUrl && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => window.open(doc.uploadedFileUrl, '_blank')}
                              className="flex-shrink-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Document</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  
                  {/* Helper Text */}
                  {getHelperText(doc) && doc.status === "approved" && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      {getHelperText(doc)}
                    </p>
                  )}
                  
                  {/* Upload Status */}
                  {doc.uploadedFileName && !isEditing && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      File uploaded: {doc.uploadedFileName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {isEditing && hasData && (
          <div className="flex justify-end pt-4 border-t">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All KYC Documents
            </Button>
          </div>
        )}
      </div>
    </SimpleFormCard>
  )
}
