"use client"

import { useEffect, useState } from "react"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/apiClient"
import { useToastNotification } from "@/hooks/use-toast-notification"

interface Education {
  id?: string
  degree: string
  institution: string
  year: string
  certificate?: File | null
}

interface Certification {
  id?: string
  name: string
  issuingOrganization: string
  issueDate: string
  expiryDate?: string
  certificate?: File | null
}

interface Specialization {
  id?: string
  specialization_name: string
  is_primary: boolean
  specialization_display?: string
  custom_specialization_name?: string
}

export function ProfessionalDetailsSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToastNotification()

  const [specializations, setSpecializations] = useState<Specialization[]>([])

  const [education, setEducation] = useState<Education[]>([])

  const [certifications, setCertifications] = useState<Certification[]>([])

  const [originalData, setOriginalData] = useState({
    specializations: [...specializations],
    education: [...education],
    certifications: [...certifications],
  })

  const handleEdit = () => {
    setOriginalData({
      specializations: [...specializations],
      education: [...education],
      certifications: [...certifications],
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setSpecializations([...originalData.specializations])
    setEducation([...originalData.education])
    setCertifications([...originalData.certifications])
    setIsEditing(false)
  }

  const normalizeSpecializations = (data: any[]): Specialization[] => {
    if (!Array.isArray(data)) return []

    return data.map((item) => {
      const name =
        item?.specialization_name ||
        item?.custom_specialization_name ||
        item?.specialization_display ||
        item?.name ||
        ""

      return {
        id: item?.id ?? item?.specialization_id ?? item?.pk,
        specialization_name: name,
        is_primary: Boolean(item?.is_primary),
        specialization_display: item?.specialization_display,
        custom_specialization_name: item?.custom_specialization_name,
      }
    })
  }

  const ensureSinglePrimary = (list: Specialization[]): Specialization[] => {
    if (!list.length) return list
    const hasPrimary = list.some((spec) => spec.is_primary)
    if (hasPrimary) return list.map((spec, index) => ({ ...spec, is_primary: spec.is_primary || false }))
    // If none marked, set first as primary
    return list.map((spec, index) => ({ ...spec, is_primary: index === 0 }))
  }

  const loadSpecializations = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getSpecializations()
      let payload: any[] = []

      if (Array.isArray(response)) {
        payload = response
      } else if (response?.results && Array.isArray(response.results)) {
        payload = response.results
      } else if (response?.data && Array.isArray(response.data)) {
        payload = response.data
      } else if (response?.specializations && Array.isArray(response.specializations)) {
        payload = response.specializations
      }

      const normalized = ensureSinglePrimary(normalizeSpecializations(payload))
      const safeList = normalized.length ? normalized : [{ specialization_name: "", is_primary: true }]

      setSpecializations(safeList)
      setOriginalData((prev) => ({
        ...prev,
        specializations: safeList,
      }))
    } catch (error: any) {
      console.error("Failed to load specializations:", error)
      toast.error(error?.message || "Could not load specializations")
      // Provide at least one empty row for the UI
      const fallback = [{ specialization_name: "", is_primary: true }]
      setSpecializations(fallback)
      setOriginalData((prev) => ({
        ...prev,
        specializations: fallback,
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const normalizeEducation = (data: any[]): Education[] => {
    if (!Array.isArray(data)) return []

    return data.map((item) => ({
      id: item?.id ?? item?.education_id ?? item?.pk,
      degree: item?.qualification ?? item?.degree ?? "",
      institution: item?.institute ?? item?.institution ?? "",
      year: String(item?.year_of_completion ?? item?.year ?? "").toString(),
    }))
  }

  const loadEducation = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getEducation()
      let payload: any[] = []

      if (Array.isArray(response)) {
        payload = response
      } else if (response?.results && Array.isArray(response.results)) {
        payload = response.results
      } else if (response?.data && Array.isArray(response.data)) {
        payload = response.data
      } else if (response?.education && Array.isArray(response.education)) {
        payload = response.education
      }

      const normalized = normalizeEducation(payload)
      const safeList = normalized.length ? normalized : [{ degree: "", institution: "", year: "" }]

      setEducation(safeList)
      setOriginalData((prev) => ({
        ...prev,
        education: safeList,
      }))
    } catch (error: any) {
      console.error("Failed to load education:", error)
      toast.error(error?.message || "Could not load education")
      const fallback = [{ degree: "", institution: "", year: "" }]
      setEducation(fallback)
      setOriginalData((prev) => ({
        ...prev,
        education: fallback,
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const normalizeCertifications = (data: any[]): Certification[] => {
    if (!Array.isArray(data)) return []

    return data.map((item) => ({
      id: item?.id ?? item?.certification_id ?? item?.pk,
      name: item?.title ?? item?.name ?? "",
      issuingOrganization: item?.issued_by ?? item?.issuingOrganization ?? "",
      issueDate: item?.date_of_issue ?? item?.issueDate ?? "",
      expiryDate: item?.expiry_date ?? item?.expiryDate ?? "",
    }))
  }

  const loadCertifications = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getCertifications()
      let payload: any[] = []

      if (Array.isArray(response)) {
        payload = response
      } else if (response?.results && Array.isArray(response.results)) {
        payload = response.results
      } else if (response?.data && Array.isArray(response.data)) {
        payload = response.data
      } else if (response?.certifications && Array.isArray(response.certifications)) {
        payload = response.certifications
      }

      const normalized = normalizeCertifications(payload)
      const safeList = normalized.length ? normalized : [{ name: "", issuingOrganization: "", issueDate: "" }]

      setCertifications(safeList)
      setOriginalData((prev) => ({
        ...prev,
        certifications: safeList,
      }))
    } catch (error: any) {
      console.error("Failed to load certifications:", error)
      toast.error(error?.message || "Could not load certifications")
      const fallback = [{ name: "", issuingOrganization: "", issueDate: "" }]
      setCertifications(fallback)
      setOriginalData((prev) => ({
        ...prev,
        certifications: fallback,
      }))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSpecializations()
    loadEducation()
    loadCertifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePrimarySelect = (index: number) => {
    setSpecializations((prev) =>
      prev.map((spec, i) => ({
        ...spec,
        is_primary: i === index,
      })),
    )
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Normalize specialization payloads for unified API
      let normalizedSpecs = specializations
        .map((spec) => ({
          ...spec,
          specialization_name: (spec.specialization_name || "").trim(),
          is_primary: Boolean(spec.is_primary),
        }))
        .filter((spec) => spec.specialization_name.length > 0)

      if (!normalizedSpecs.length) {
        throw new Error("Please add at least one specialization")
      }

      normalizedSpecs = ensureSinglePrimary(normalizedSpecs)

      // Delete removed specializations
      const removed = originalData.specializations.filter(
        (spec) => spec.id && !normalizedSpecs.some((s) => s.id === spec.id),
      )
      for (const removedSpec of removed) {
        if (removedSpec.id) {
          await apiClient.deleteSpecialization(removedSpec.id)
        }
      }

      // Upsert specializations using unified specialization_name + is_primary
      const updatedSpecs: Specialization[] = []
      for (const spec of normalizedSpecs) {
        const payload = {
          specialization_name: spec.specialization_name,
          is_primary: Boolean(spec.is_primary),
        }

        try {
          let result
          if (spec.id) {
            result = await apiClient.updateSpecialization(spec.id, payload)
          } else {
            result = await apiClient.addSpecialization(payload)
          }

          const newId = result?.id ?? result?.data?.id ?? spec.id
          updatedSpecs.push({ ...spec, id: newId })
        } catch (error: any) {
          console.error("Error saving specialization:", error)
          const message =
            error?.message ||
            error?.errors ||
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            "Failed to save specialization"
          throw new Error(message)
        }
      }

      // Save education entries
      const removedEducation = originalData.education.filter(
        (edu) => edu.id && !education.some((e) => e.id === edu.id),
      )
      for (const edu of removedEducation) {
        if (edu.id) {
          await apiClient.deleteEducation(edu.id)
        }
      }

      for (const edu of education) {
        if (!edu.degree || !edu.institution || !edu.year) {
          continue // Skip incomplete education entries
        }
        
        // Map frontend fields to backend fields
        const educationData = {
          qualification: edu.degree,
          institute: edu.institution,
          year_of_completion: parseInt(edu.year, 10),
        }
        
        if (edu.id) {
          await apiClient.updateEducation(edu.id, educationData)
        } else {
          await apiClient.addEducation(educationData)
        }
      }

      // Delete removed certifications
      const removedCertifications = originalData.certifications.filter(
        (cert) => cert.id && !certifications.some((c) => c.id === cert.id),
      )
      for (const cert of removedCertifications) {
        if (cert.id) {
          await apiClient.deleteCertification(cert.id)
        }
      }

      // Save certifications
      for (const cert of certifications) {
        if (!cert.name || !cert.issuingOrganization || !cert.issueDate) {
          continue // Skip incomplete certification entries
        }
        
        // Map frontend fields to backend fields
        const certificationData = {
          title: cert.name,
          issued_by: cert.issuingOrganization,
          date_of_issue: cert.issueDate,
          expiry_date: cert.expiryDate || null,
        }
        
        try {
          let result
          if (cert.id) {
            result = await apiClient.updateCertification(cert.id, certificationData)
          } else {
            result = await apiClient.addCertification(certificationData)
          }
          
          // Update local ID if needed
          if (result?.id && !cert.id) {
            const index = certifications.indexOf(cert)
            const updated = [...certifications]
            updated[index] = { ...cert, id: result.id }
            setCertifications(updated)
          }
        } catch (error: any) {
          console.error("Error saving certification:", error)
          const message =
            error?.message ||
            error?.errors ||
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            "Failed to save certification"
          throw new Error(message)
        }
      }

      const finalSpecs = updatedSpecs.length ? updatedSpecs : normalizedSpecs

      toast.success("Doctor profile updated successfully", { duration: 2500 })
      setOriginalData({
        specializations: finalSpecs,
        education: [...education],
        certifications: [...certifications],
      })
      setSpecializations(finalSpecs)
      setIsEditing(false)
    } catch (error: any) {
      console.error("Error saving professional details:", error)
      console.error("Error details:", {
        message: error?.message,
        status: error?.status,
        errors: error?.errors,
        response: error?.response,
      })
      toast.error(error?.message || error?.errors || "Failed to update professional details")
    } finally {
      setIsLoading(false)
    }
  }

  const addEducation = () => {
    setEducation([...education, { degree: "", institution: "", year: "" }])
  }

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index))
  }

  const updateEducation = (index: number, field: keyof Education, value: any) => {
    const updated = [...education]
    updated[index] = { ...updated[index], [field]: value }
    setEducation(updated)
  }

  const addCertification = () => {
    setCertifications([...certifications, { name: "", issuingOrganization: "", issueDate: "" }])
  }

  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index))
  }

  const updateCertification = (index: number, field: keyof Certification, value: any) => {
    const updated = [...certifications]
    updated[index] = { ...updated[index], [field]: value }
    setCertifications(updated)
  }

  const addSpecialization = () => {
    setSpecializations([...specializations, { specialization_name: "", is_primary: false }])
  }

  const removeSpecialization = (index: number) => {
    setSpecializations(specializations.filter((_, i) => i !== index))
  }

  const updateSpecialization = (index: number, value: string) => {
    const updated = [...specializations]
    updated[index] = { ...updated[index], specialization_name: value }
    setSpecializations(updated)
  }

  return (
    <SimpleFormCard
      title="Professional Details"
      description="Manage your education, certifications, and professional information"
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <div className="space-y-6">
        {/* Specializations */}
        <div className="space-y-4">
          <h4 className="font-medium">Specializations</h4>
          {specializations.map((spec, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Specialization {index + 1}</span>
                  {!isEditing && spec.is_primary && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                {isEditing && specializations.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSpecialization(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`specialization-${index}`}>Specialization Name</Label>
                  {isEditing && (
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="radio"
                        name="primarySpecialization"
                        checked={Boolean(spec.is_primary)}
                        onChange={() => handlePrimarySelect(index)}
                        disabled={!isEditing}
                      />
                      Set as Primary Specialization
                    </label>
                  )}
                </div>
                <Input
                  id={`specialization-${index}`}
                  value={spec.specialization_name}
                  onChange={(e) => updateSpecialization(index, e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g., Cardiology, Neurology"
                />
              </div>
            </div>
          ))}

          {isEditing && (
            <Button type="button" variant="outline" onClick={addSpecialization} className="w-full bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Add Specialization
            </Button>
          )}
        </div>

        {/* Education */}
        <div className="space-y-4">
          <h4 className="font-medium">Education</h4>
          {education.map((edu, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Education {index + 1}</span>
                {isEditing && education.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeEducation(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`degree-${index}`}>Degree</Label>
                  <Input
                    id={`degree-${index}`}
                    value={edu.degree}
                    onChange={(e) => updateEducation(index, "degree", e.target.value)}
                    disabled={!isEditing}
                    placeholder="e.g., MBBS, MD"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`institution-${index}`}>Institution</Label>
                  <Input
                    id={`institution-${index}`}
                    value={edu.institution}
                    onChange={(e) => updateEducation(index, "institution", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`year-${index}`}>Year</Label>
                  <Input
                    id={`year-${index}`}
                    value={edu.year}
                    onChange={(e) => updateEducation(index, "year", e.target.value)}
                    disabled={!isEditing}
                    placeholder="YYYY"
                  />
                </div>
              </div>
            </div>
          ))}

          {isEditing && (
            <Button type="button" variant="outline" onClick={addEducation} className="w-full bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Add Education
            </Button>
          )}
        </div>

        {/* Certifications */}
        <div className="space-y-4">
          <h4 className="font-medium">Certifications</h4>
          {certifications.map((cert, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Certification {index + 1}</span>
                {isEditing && certifications.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeCertification(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`cert-name-${index}`}>Certification Name</Label>
                  <Input
                    id={`cert-name-${index}`}
                    value={cert.name}
                    onChange={(e) => updateCertification(index, "name", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`cert-org-${index}`}>Issuing Organization</Label>
                  <Input
                    id={`cert-org-${index}`}
                    value={cert.issuingOrganization}
                    onChange={(e) => updateCertification(index, "issuingOrganization", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`cert-issue-${index}`}>Issue Date</Label>
                  <Input
                    id={`cert-issue-${index}`}
                    type="date"
                    value={cert.issueDate}
                    onChange={(e) => updateCertification(index, "issueDate", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`cert-expiry-${index}`}>Expiry Date (Optional)</Label>
                  <Input
                    id={`cert-expiry-${index}`}
                    type="date"
                    value={cert.expiryDate || ""}
                    onChange={(e) => updateCertification(index, "expiryDate", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          ))}

          {isEditing && (
            <Button type="button" variant="outline" onClick={addCertification} className="w-full bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Add Certification
            </Button>
          )}
        </div>
      </div>
    </SimpleFormCard>
  )
}
