"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { Loader2, Clock, Languages, Shield, Lock } from "lucide-react"

// Supported prescription languages (including Indian regional languages)
const PRESCRIPTION_LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Hindi", label: "Hindi (हिंदी)" },
  { value: "Marathi", label: "Marathi (मराठी)" },
  { value: "Tamil", label: "Tamil (தமிழ்)" },
  { value: "Telugu", label: "Telugu (తెలుగు)" },
  { value: "Kannada", label: "Kannada (ಕನ್ನಡ)" },
  { value: "Malayalam", label: "Malayalam (മലയാളം)" },
  { value: "Bengali", label: "Bengali (বাংলা)" },
  { value: "Gujarati", label: "Gujarati (ગુજરાતી)" },
  { value: "Punjabi", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { value: "Urdu", label: "Urdu (اردو)" },
  { value: "Odia", label: "Odia (ଓଡ଼ିଆ)" },
  { value: "Assamese", label: "Assamese (অসমীয়া)" },
] as const

interface AppointmentPreferences {
  grace_period: number
  allow_walkins: boolean
  allow_overlap: boolean
}

interface LanguagePreferences {
  prescription_language: string
  measurement_units: string
  date_format: string
}

interface PrivacyPreferences {
  mask_patient_mobile: boolean
  allow_patient_data_export: boolean
}

interface SystemPreferences {
  auto_save_consultation_draft: boolean
  lock_consultation_after_completion: boolean
}

interface ClinicPreferencesData {
  appointment?: AppointmentPreferences
  language?: LanguagePreferences
  privacy?: PrivacyPreferences
  system?: SystemPreferences
}

const DEFAULT_PREFERENCES: ClinicPreferencesData = {
  appointment: {
    grace_period: 10,
    allow_walkins: true,
    allow_overlap: false,
  },
  language: {
    prescription_language: "English",
    measurement_units: "Metric",
    date_format: "DD/MM/YYYY",
  },
  privacy: {
    mask_patient_mobile: true,
    allow_patient_data_export: false,
  },
  system: {
    auto_save_consultation_draft: true,
    lock_consultation_after_completion: true,
  },
}

export function ClinicPreferences() {
  const toast = useToastNotification()
  const [isLoading, setIsLoading] = useState(true)
  
  // Edit states for each section
  const [isEditingAppointment, setIsEditingAppointment] = useState(false)
  const [isEditingLanguage, setIsEditingLanguage] = useState(false)
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false)
  const [isEditingSystem, setIsEditingSystem] = useState(false)
  
  // Saving states
  const [isSavingAppointment, setIsSavingAppointment] = useState(false)
  const [isSavingLanguage, setIsSavingLanguage] = useState(false)
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false)
  const [isSavingSystem, setIsSavingSystem] = useState(false)
  
  // Data states
  const [appointmentData, setAppointmentData] = useState<AppointmentPreferences>(
    DEFAULT_PREFERENCES.appointment!
  )
  const [languageData, setLanguageData] = useState<LanguagePreferences>(
    DEFAULT_PREFERENCES.language!
  )
  const [privacyData, setPrivacyData] = useState<PrivacyPreferences>(
    DEFAULT_PREFERENCES.privacy!
  )
  const [systemData, setSystemData] = useState<SystemPreferences>(
    DEFAULT_PREFERENCES.system!
  )
  
  // Original data for cancel functionality
  const [originalAppointment, setOriginalAppointment] = useState<AppointmentPreferences>(
    DEFAULT_PREFERENCES.appointment!
  )
  const [originalLanguage, setOriginalLanguage] = useState<LanguagePreferences>(
    DEFAULT_PREFERENCES.language!
  )
  const [originalPrivacy, setOriginalPrivacy] = useState<PrivacyPreferences>(
    DEFAULT_PREFERENCES.privacy!
  )
  const [originalSystem, setOriginalSystem] = useState<SystemPreferences>(
    DEFAULT_PREFERENCES.system!
  )

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch("/api/clinic-preferences", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const prefs = data.data || data
        
        // Update states with fetched data or defaults
        if (prefs.appointment) {
          setAppointmentData(prefs.appointment)
          setOriginalAppointment(prefs.appointment)
        }
        if (prefs.language) {
          setLanguageData(prefs.language)
          setOriginalLanguage(prefs.language)
        }
        if (prefs.privacy) {
          setPrivacyData(prefs.privacy)
          setOriginalPrivacy(prefs.privacy)
        }
        if (prefs.system) {
          setSystemData(prefs.system)
          setOriginalSystem(prefs.system)
        }
      } else if (response.status === 404) {
        // No preferences exist yet, use defaults
        console.log("No preferences found, using defaults")
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || "Failed to fetch preferences")
      }
    } catch (error: any) {
      console.error("Error fetching preferences:", error)
      toast.error(error.message || "Failed to load clinic preferences")
    } finally {
      setIsLoading(false)
    }
  }

  // Appointment section handlers
  const handleEditAppointment = () => {
    setOriginalAppointment({ ...appointmentData })
    setIsEditingAppointment(true)
  }

  const handleCancelAppointment = () => {
    setAppointmentData({ ...originalAppointment })
    setIsEditingAppointment(false)
  }

  const handleSaveAppointment = async () => {
    // Validation
    if (appointmentData.grace_period < 0 || appointmentData.grace_period > 60) {
      toast.error("Grace period must be between 0 and 60 minutes")
      return
    }

    setIsSavingAppointment(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch("/api/clinic-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointment: appointmentData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || "Failed to save appointment preferences"
        const errorDetails = data.errors ? Object.values(data.errors).flat().join(", ") : ""
        throw new Error(errorDetails || errorMessage)
      }

      setOriginalAppointment({ ...appointmentData })
      setIsEditingAppointment(false)
      toast.success("Clinic preferences updated successfully", { duration: 3000 })
    } catch (error: any) {
      console.error("Error saving appointment preferences:", error)
      toast.error(error.message || "Failed to save appointment preferences")
    } finally {
      setIsSavingAppointment(false)
    }
  }

  // Language section handlers
  const handleEditLanguage = () => {
    setOriginalLanguage({ ...languageData })
    setIsEditingLanguage(true)
  }

  const handleCancelLanguage = () => {
    setLanguageData({ ...originalLanguage })
    setIsEditingLanguage(false)
  }

  const handleSaveLanguage = async () => {
    // Validation
    if (!languageData.prescription_language || !languageData.measurement_units || !languageData.date_format) {
      toast.error("All language and region fields are required")
      return
    }

    setIsSavingLanguage(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch("/api/clinic-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: languageData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || "Failed to save language preferences"
        const errorDetails = data.errors ? Object.values(data.errors).flat().join(", ") : ""
        throw new Error(errorDetails || errorMessage)
      }

      setOriginalLanguage({ ...languageData })
      setIsEditingLanguage(false)
      toast.success("Clinic preferences updated successfully", { duration: 3000 })
    } catch (error: any) {
      console.error("Error saving language preferences:", error)
      toast.error(error.message || "Failed to save language preferences")
    } finally {
      setIsSavingLanguage(false)
    }
  }

  // Privacy section handlers
  const handleEditPrivacy = () => {
    setOriginalPrivacy({ ...privacyData })
    setIsEditingPrivacy(true)
  }

  const handleCancelPrivacy = () => {
    setPrivacyData({ ...originalPrivacy })
    setIsEditingPrivacy(false)
  }

  const handleSavePrivacy = async () => {
    setIsSavingPrivacy(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch("/api/clinic-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          privacy: privacyData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || "Failed to save privacy preferences"
        const errorDetails = data.errors ? Object.values(data.errors).flat().join(", ") : ""
        throw new Error(errorDetails || errorMessage)
      }

      setOriginalPrivacy({ ...privacyData })
      setIsEditingPrivacy(false)
      toast.success("Clinic preferences updated successfully", { duration: 3000 })
    } catch (error: any) {
      console.error("Error saving privacy preferences:", error)
      toast.error(error.message || "Failed to save privacy preferences")
    } finally {
      setIsSavingPrivacy(false)
    }
  }

  // System section handlers
  const handleEditSystem = () => {
    setOriginalSystem({ ...systemData })
    setIsEditingSystem(true)
  }

  const handleCancelSystem = () => {
    setSystemData({ ...originalSystem })
    setIsEditingSystem(false)
  }

  const handleSaveSystem = async () => {
    setIsSavingSystem(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch("/api/clinic-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          system: systemData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || "Failed to save system preferences"
        const errorDetails = data.errors ? Object.values(data.errors).flat().join(", ") : ""
        throw new Error(errorDetails || errorMessage)
      }

      setOriginalSystem({ ...systemData })
      setIsEditingSystem(false)
      toast.success("Clinic preferences updated successfully", { duration: 3000 })
    } catch (error: any) {
      console.error("Error saving system preferences:", error)
      toast.error(error.message || "Failed to save system preferences")
    } finally {
      setIsSavingSystem(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Appointment Behavior */}
      <SimpleFormCard
        title="Appointment Behavior"
        description="Control appointment handling rules"
        isEditing={isEditingAppointment}
        onEdit={handleEditAppointment}
        onSave={handleSaveAppointment}
        onCancel={handleCancelAppointment}
        isSaving={isSavingAppointment}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="grace-period" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Grace Period (minutes)
            </Label>
            <Input
              id="grace-period"
              type="number"
              min="0"
              max="60"
              value={appointmentData.grace_period}
              onChange={(e) =>
                setAppointmentData({
                  ...appointmentData,
                  grace_period: parseInt(e.target.value) || 0,
                })
              }
              disabled={!isEditingAppointment}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Time allowed after appointment start before marking late
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-walkins">Allow Walk-ins</Label>
              <p className="text-sm text-muted-foreground">
                Enable walk-in appointments without prior booking
              </p>
            </div>
            <Switch
              id="allow-walkins"
              checked={appointmentData.allow_walkins}
              onCheckedChange={(checked) =>
                setAppointmentData({
                  ...appointmentData,
                  allow_walkins: checked,
                })
              }
              disabled={!isEditingAppointment}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-overlap">Allow Overlapping Appointments</Label>
              <p className="text-sm text-muted-foreground">
                Permit multiple appointments at the same time slot
              </p>
            </div>
            <Switch
              id="allow-overlap"
              checked={appointmentData.allow_overlap}
              onCheckedChange={(checked) =>
                setAppointmentData({
                  ...appointmentData,
                  allow_overlap: checked,
                })
              }
              disabled={!isEditingAppointment}
            />
          </div>
        </div>
      </SimpleFormCard>

      {/* Section 2: Language & Region */}
      <SimpleFormCard
        title="Language & Region"
        description="Control language and measurement standards"
        isEditing={isEditingLanguage}
        onEdit={handleEditLanguage}
        onSave={handleSaveLanguage}
        onCancel={handleCancelLanguage}
        isSaving={isSavingLanguage}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prescription-language" className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              Prescription Language
            </Label>
            <Select
              value={languageData.prescription_language}
              onValueChange={(value) =>
                setLanguageData({
                  ...languageData,
                  prescription_language: value,
                })
              }
              disabled={!isEditingLanguage}
            >
              <SelectTrigger id="prescription-language" className="max-w-xs">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {PRESCRIPTION_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="measurement-units">Measurement Units</Label>
            <Select
              value={languageData.measurement_units}
              onValueChange={(value) =>
                setLanguageData({
                  ...languageData,
                  measurement_units: value,
                })
              }
              disabled={!isEditingLanguage}
            >
              <SelectTrigger id="measurement-units" className="max-w-xs">
                <SelectValue placeholder="Select units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Metric">Metric (kg, cm, °C)</SelectItem>
                {/* Future: Imperial */}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-format">Date Format</Label>
            <Select
              value={languageData.date_format}
              onValueChange={(value) =>
                setLanguageData({
                  ...languageData,
                  date_format: value,
                })
              }
              disabled={!isEditingLanguage}
            >
              <SelectTrigger id="date-format" className="max-w-xs">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                {/* Future: MM/DD/YYYY */}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SimpleFormCard>

      {/* Section 3: Patient Privacy */}
      <SimpleFormCard
        title="Patient Privacy"
        description="Basic privacy controls"
        isEditing={isEditingPrivacy}
        onEdit={handleEditPrivacy}
        onSave={handleSavePrivacy}
        onCancel={handleCancelPrivacy}
        isSaving={isSavingPrivacy}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mask-mobile" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Mask Patient Mobile Number
              </Label>
              <p className="text-sm text-muted-foreground">
                Hide mobile numbers in patient lists and reports
              </p>
            </div>
            <Switch
              id="mask-mobile"
              checked={privacyData.mask_patient_mobile}
              onCheckedChange={(checked) =>
                setPrivacyData({
                  ...privacyData,
                  mask_patient_mobile: checked,
                })
              }
              disabled={!isEditingPrivacy}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-export">Allow Patient Data Export</Label>
              <p className="text-sm text-muted-foreground">
                Enable exporting patient data to external formats
              </p>
            </div>
            <Switch
              id="allow-export"
              checked={privacyData.allow_patient_data_export}
              onCheckedChange={(checked) =>
                setPrivacyData({
                  ...privacyData,
                  allow_patient_data_export: checked,
                })
              }
              disabled={!isEditingPrivacy}
            />
          </div>
        </div>
      </SimpleFormCard>

      {/* Section 4: System Behavior */}
      <SimpleFormCard
        title="System Behavior"
        description="Control consultation workflow safety"
        isEditing={isEditingSystem}
        onEdit={handleEditSystem}
        onSave={handleSaveSystem}
        onCancel={handleCancelSystem}
        isSaving={isSavingSystem}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-save" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Auto-save Consultation Draft
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically save consultation drafts as you work
              </p>
            </div>
            <Switch
              id="auto-save"
              checked={systemData.auto_save_consultation_draft}
              onCheckedChange={(checked) =>
                setSystemData({
                  ...systemData,
                  auto_save_consultation_draft: checked,
                })
              }
              disabled={!isEditingSystem}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="lock-consultation">Lock Consultation After Completion</Label>
              <p className="text-sm text-muted-foreground">
                Prevent editing consultations once marked as completed
              </p>
            </div>
            <Switch
              id="lock-consultation"
              checked={systemData.lock_consultation_after_completion}
              onCheckedChange={(checked) =>
                setSystemData({
                  ...systemData,
                  lock_consultation_after_completion: checked,
                })
              }
              disabled={!isEditingSystem}
            />
          </div>
        </div>
      </SimpleFormCard>
    </div>
  )
}

