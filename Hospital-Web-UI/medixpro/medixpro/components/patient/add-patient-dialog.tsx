"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import axiosClient from "@/lib/axiosClient";
import { usePatient, type Patient } from "@/lib/patientContext";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { cn } from "@/lib/utils";

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientAdded: (patient: Patient) => void;
  prefillMobile?: string;
  isExistingAccount?: boolean;
  existingRelations?: string[];
  existingPatientAccountId?: string;
}

interface PatientFormData {
  first_name: string;
  last_name: string;
  mobile: string;
  gender: string;
  relation: string;
  date_of_birth: string;
  age_years: string;
  age_months: string;
}

interface PatientProfile {
  profile_id: string;
  full_name: string;
  relation: string;
  gender: string;
  date_of_birth: string | null;
}

type DialogStep = "form" | "exists";
type AgeInputMode = "age" | "dob";

export function AddPatientDialog({
  open,
  onOpenChange,
  onPatientAdded,
  prefillMobile,
  isExistingAccount = false,
  existingRelations = [],
  existingPatientAccountId,
}: AddPatientDialogProps) {
  const { setSelectedPatient } = usePatient();
  const toast = useToastNotification();
  const [step, setStep] = useState<DialogStep>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientAccountId, setPatientAccountId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [checkedMobile, setCheckedMobile] = useState<string>("");
  const [ageInputMode, setAgeInputMode] = useState<AgeInputMode>("age");
  const [showMinorWarning, setShowMinorWarning] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<PatientFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    setError,
    clearErrors,
    watch,
  } = useForm<PatientFormData>({
    defaultValues: {
      first_name: "",
      last_name: "",
      mobile: "",
      gender: "",
      relation: "self",
      date_of_birth: "",
      age_years: "",
      age_months: "",
    },
    mode: "onChange",
  });

  const gender = watch("gender");
  const relation = watch("relation");
  const normalizedExistingRelations = useMemo(
    () => existingRelations.map((value) => value.toLowerCase()),
    [existingRelations]
  );
  const hasSelfProfile = normalizedExistingRelations.includes("self");
  const hasSpouseProfile = normalizedExistingRelations.includes("spouse");
  const hasFatherProfile = normalizedExistingRelations.includes("father");
  const hasMotherProfile = normalizedExistingRelations.includes("mother");

  useEffect(() => {
    if (!open) return;

    if (isExistingAccount && prefillMobile) {
      setValue("mobile", prefillMobile, { shouldValidate: true });
      setValue("relation", hasSelfProfile ? "child" : "self", { shouldValidate: true });
      return;
    }

    setValue("mobile", "", { shouldValidate: false });
    setValue("relation", "self", { shouldValidate: false });
  }, [open, isExistingAccount, prefillMobile, hasSelfProfile, setValue]);

  // Extract error message following the priority-based algorithm from documentation
  const extractErrorMessage = (error: any): string => {
    const errorData = error?.response?.data || error?.errors || error;
    
    // Priority order: detail > message > error > non_field_errors > field errors
    if (errorData?.detail) {
      return errorData.detail;
    }
    if (errorData?.message) {
      return errorData.message;
    }
    if (errorData?.error) {
      return typeof errorData.error === 'string' 
        ? errorData.error 
        : JSON.stringify(errorData.error);
    }
    if (errorData?.non_field_errors && Array.isArray(errorData.non_field_errors)) {
      return errorData.non_field_errors[0];
    }
    if (error?.message) {
      return error.message;
    }
    
    // Field-specific errors
    if (errorData && typeof errorData === 'object') {
      const firstKey = Object.keys(errorData)[0];
      const firstError = errorData[firstKey];
      if (Array.isArray(firstError)) {
        return `${firstKey}: ${firstError[0]}`;
      }
      if (firstError) {
        return `${firstKey}: ${firstError}`;
      }
    }
    
    return "An error occurred. Please try again.";
  };

  const getAgeYearsFromDob = (dobString: string): number | null => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (Number.isNaN(dob.getTime())) return null;
    const today = new Date();
    let ageYears = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      ageYears -= 1;
    }
    return ageYears >= 0 ? ageYears : null;
  };

  const getDobFromAgeInputs = (yearsInput: string, monthsInput: string): string | null => {
    const years = Number(yearsInput);
    const months = monthsInput === "" ? 0 : Number(monthsInput);
    if (!Number.isFinite(years) || years < 0 || !Number.isFinite(months) || months < 0) {
      return null;
    }
    const today = new Date();
    const dob = new Date(today);
    dob.setFullYear(today.getFullYear() - years);
    dob.setMonth(today.getMonth() - months);
    return dob.toISOString().split("T")[0];
  };

  const getComputedAgeYears = (data: PatientFormData): number | null => {
    if (ageInputMode === "age") {
      if (!data.age_years) return null;
      const years = Number(data.age_years);
      return Number.isFinite(years) ? years : null;
    }
    return getAgeYearsFromDob(data.date_of_birth);
  };

  const isMinorSelfProfile = (data: PatientFormData): boolean => {
    if (data.relation !== "self") return false;
    const computedAgeYears = getComputedAgeYears(data);
    return computedAgeYears !== null && computedAgeYears < 18;
  };

  const submitPatientFlow = async (data: PatientFormData, isMinorOverride = false) => {
    setIsSubmitting(true);
    try {
      const normalizedMobile = data.mobile.replace(/\D/g, '');
      
      if (normalizedMobile.length !== 10) {
        toast.error("Mobile number must be exactly 10 digits");
        setIsSubmitting(false);
        return;
      }

      if (isExistingAccount) {
        if (!existingPatientAccountId) {
          toast.error("Could not resolve existing patient account");
          return;
        }
        await handleAddProfileToExistingAccount(data, normalizedMobile, existingPatientAccountId, isMinorOverride);
        return;
      }

      // Step 1: Check if patient exists
      const checkResponse = await axiosClient.post("/patients/check-mobile/", {
        mobile: normalizedMobile,
      });

      if (checkResponse.data.status === "success" && checkResponse.data.exists) {
        // Patient exists - show profiles for selection
        setCheckedMobile(normalizedMobile);
        setPatientAccountId(checkResponse.data.patient_account_id);
        setProfiles(checkResponse.data.profiles || []);
        
        if (checkResponse.data.profiles && checkResponse.data.profiles.length > 0) {
          // If only one profile, auto-select it
          if (checkResponse.data.profiles.length === 1) {
            await handleSelectProfile(checkResponse.data.profiles[0], normalizedMobile);
          } else {
            // Multiple profiles - show selection screen
            setStep("exists");
            toast.info("Patient already exists. Please select a profile.");
          }
        } else {
          // No profiles found - create new profile
          await handleCreatePatient(data, normalizedMobile, isMinorOverride);
        }
      } else {
        // Patient does not exist - create new patient
        await handleCreatePatient(data, normalizedMobile, isMinorOverride);
      }
    } catch (error: any) {
      console.error("Error in patient flow:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Main submit handler - checks if patient exists first, then creates or selects
  const onSubmit = async (data: PatientFormData) => {
    if (!data.gender) {
      setError("gender", { type: "manual", message: "Gender is required" });
      return;
    }

    if (isExistingAccount && !data.relation) {
      setError("relation", { type: "manual", message: "Relation is required" });
      return;
    }

    const hasDob = Boolean(data.date_of_birth);
    const hasAgeYears = data.age_years !== "" && data.age_years !== null;

    if ((hasDob && hasAgeYears) || (!hasDob && !hasAgeYears)) {
      if (ageInputMode === "age") {
        setError("age_years", { type: "manual", message: "Enter Age or DOB" });
      } else {
        setError("date_of_birth", { type: "manual", message: "Enter Age or DOB" });
      }
      return;
    }

    if (isMinorSelfProfile(data)) {
      setPendingSubmitData(data);
      setShowMinorWarning(true);
      return;
    }

    await submitPatientFlow(data, false);
  };

  // Select existing profile
  const handleSelectProfile = async (profile: PatientProfile, mobileNumber: string) => {
    setIsSubmitting(true);
    try {
      // Search for the patient to get full details
      const searchResponse = await axiosClient.get("/patients/search/", {
        params: { query: mobileNumber },
      });

      if (searchResponse.data && searchResponse.data.length > 0) {
        const selectedProfile = searchResponse.data.find(
          (p: any) => p.id === profile.profile_id
        ) || searchResponse.data[0];

        const patient: Patient = {
          id: selectedProfile.id,
          first_name: selectedProfile.first_name,
          last_name: selectedProfile.last_name || "",
          full_name: selectedProfile.full_name || profile.full_name,
          gender: selectedProfile.gender || profile.gender,
          date_of_birth: selectedProfile.date_of_birth || profile.date_of_birth || undefined,
          mobile: selectedProfile.mobile || mobileNumber,
        };

        setSelectedPatient(patient);
        onPatientAdded(patient);
        handleClose();
        toast.success("Patient selected successfully");
      } else {
        // Fallback: use profile data directly
        const patient: Patient = {
          id: profile.profile_id,
          first_name: profile.full_name.split(" ")[0] || "",
          last_name: profile.full_name.split(" ").slice(1).join(" ") || "",
          full_name: profile.full_name,
          gender: profile.gender,
          date_of_birth: profile.date_of_birth || undefined,
          mobile: mobileNumber,
        };

        setSelectedPatient(patient);
        onPatientAdded(patient);
        handleClose();
        toast.success("Patient selected successfully");
      }
    } catch (error: any) {
      console.error("Error selecting profile:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create new patient
  const handleCreatePatient = async (data: PatientFormData, normalizedMobile: string, isMinorOverride = false) => {
    try {
      // Prepare request body - backend requires all fields per CreatePatientSerializer
      const requestBody = {
        mobile: normalizedMobile,
        first_name: data.first_name,
        last_name: data.last_name || "",
        gender: data.gender.toLowerCase(),
        ...(isMinorOverride ? { is_minor_self_override: true } : {}),
        ...(ageInputMode === "dob"
          ? { date_of_birth: data.date_of_birth }
          : {
              age_years: Number(data.age_years),
              age_months: data.age_months === "" ? 0 : Number(data.age_months),
            }),
      };

      const response = await axiosClient.post("/patients/create/", requestBody);

      if (response.data.status === "success" && response.data.profile_id) {
        // Search for the created patient
        const searchResponse = await axiosClient.get("/patients/search/", {
          params: { query: normalizedMobile },
        });

        if (searchResponse.data && searchResponse.data.length > 0) {
          const createdProfile = searchResponse.data.find(
            (p: any) => p.id === response.data.profile_id
          ) || searchResponse.data[0];

          const newPatient: Patient = {
            id: createdProfile.id,
            first_name: createdProfile.first_name,
            last_name: createdProfile.last_name || "",
            full_name: createdProfile.full_name || `${data.first_name} ${data.last_name}`.trim(),
            gender: createdProfile.gender || data.gender,
            date_of_birth: createdProfile.date_of_birth || data.date_of_birth,
            mobile: createdProfile.mobile || normalizedMobile,
          };

          setSelectedPatient(newPatient);
          onPatientAdded(newPatient);
          handleClose();
          toast.success("Patient created and selected successfully");
        } else {
          // Fallback: create patient object from response
          const newPatient: Patient = {
            id: response.data.profile_id,
            first_name: data.first_name,
            last_name: data.last_name || "",
            full_name: `${data.first_name} ${data.last_name}`.trim(),
            gender: data.gender,
            date_of_birth: data.date_of_birth,
            mobile: normalizedMobile,
          };

          setSelectedPatient(newPatient);
          onPatientAdded(newPatient);
          handleClose();
          toast.success("Patient created and selected successfully");
        }
      } else {
        // Handle unexpected response structure
        const errorMessage = response.data?.message || response.data?.detail || "Failed to create patient";
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error creating patient:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
      throw error; // Re-throw to be handled by onSubmit
    }
  };

  const handleAddProfileToExistingAccount = async (
    data: PatientFormData,
    normalizedMobile: string,
    accountId: string,
    isMinorOverride = false
  ) => {
    const normalizeRelation = (value: string | null | undefined) => (value || "").trim().toLowerCase();
    const normalizeText = (value: string | null | undefined) => (value || "").trim().toLowerCase();

    const dateOfBirth =
      ageInputMode === "dob"
        ? data.date_of_birth
        : getDobFromAgeInputs(data.age_years, data.age_months);

    if (!dateOfBirth) {
      throw new Error("Enter valid Age or DOB");
    }

    const payload = {
      first_name: data.first_name,
      last_name: data.last_name || "",
      relation: data.relation,
      gender: data.gender.toLowerCase(),
      date_of_birth: dateOfBirth,
      ...(isMinorOverride ? { is_minor_self_override: true } : {}),
    };

    const response = await axiosClient.post(`/patients/${accountId}/profiles/`, payload);
    if (response.data?.status !== "success") {
      throw new Error(response.data?.message || "Failed to add profile");
    }

    const createdProfileId =
      response.data?.profile_id ??
      response.data?.id ??
      response.data?.data?.profile_id ??
      response.data?.data?.id ??
      null;
    const searchResponse = await axiosClient.get("/patients/search/", {
      params: { query: normalizedMobile },
    });

    let createdProfile: any | null = null;
    if (Array.isArray(searchResponse.data)) {
      if (createdProfileId) {
        createdProfile =
          searchResponse.data.find(
            (profile: any) => String(profile.id || profile.profile_id || "") === String(createdProfileId)
          ) || null;
      }
      if (!createdProfile) {
        const targetFirstName = normalizeText(data.first_name);
        const targetLastName = normalizeText(data.last_name || "");
        const targetRelation = normalizeRelation(data.relation);
        createdProfile =
          searchResponse.data.find(
            (profile: any) =>
              normalizeText(profile.first_name) === targetFirstName &&
              normalizeText(profile.last_name || "") === targetLastName &&
              normalizeRelation(profile.relation) === targetRelation
          ) || searchResponse.data[0] || null;
      }
    }

    if (!createdProfile) {
      throw new Error("Profile added but unable to fetch profile details");
    }

    const newPatient: Patient = {
      id: createdProfile.id,
      first_name: createdProfile.first_name,
      last_name: createdProfile.last_name || "",
      full_name: createdProfile.full_name || `${data.first_name} ${data.last_name}`.trim(),
      gender: createdProfile.gender || data.gender,
      date_of_birth: createdProfile.date_of_birth || dateOfBirth,
      mobile: createdProfile.mobile || normalizedMobile,
      relation: createdProfile.relation || data.relation,
    };

    setSelectedPatient(newPatient);
    onPatientAdded(newPatient);
    handleClose();
    toast.success("Profile added and selected successfully");
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setAgeInputMode("age");
      setShowMinorWarning(false);
      setPendingSubmitData(null);
      setValue("relation", "self", { shouldValidate: false });
      setStep("form");
      setPatientAccountId(null);
      setProfiles([]);
      setCheckedMobile("");
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    setStep("form");
    setPatientAccountId(null);
    setProfiles([]);
    setCheckedMobile("");
  };

  const handleMinorContinue = async () => {
    if (!pendingSubmitData) return;
    setShowMinorWarning(false);
    await submitPatientFlow(pendingSubmitData, true);
    setPendingSubmitData(null);
  };

  const handleMinorAddGuardian = () => {
    setShowMinorWarning(false);
    setPendingSubmitData(null);
    reset();
    setAgeInputMode("age");
    toast.info("Please add guardian details first.");
  };

  const switchInputMode = (nextMode: AgeInputMode) => {
    if (nextMode === ageInputMode) return;
    if (nextMode === "dob") {
      setValue("age_years", "", { shouldValidate: true });
      setValue("age_months", "", { shouldValidate: true });
      clearErrors("age_years");
    } else {
      setValue("date_of_birth", "", { shouldValidate: true });
      clearErrors("date_of_birth");
    }
    setAgeInputMode(nextMode);
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() || "P";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getRelationLabel = (relation: string) => {
    const labels: Record<string, string> = {
      self: "Self",
      spouse: "Spouse",
      father: "Father",
      mother: "Mother",
      child: "Child",
    };
    return labels[relation] || relation;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "form" && "Add Patient"}
            {step === "exists" && "Select Patient Profile"}
          </DialogTitle>
          <DialogDescription>
            {step === "form" && "Enter patient details. The system will check if the patient already exists."}
            {step === "exists" && "Patient already exists. Please select a profile to continue."}
          </DialogDescription>
        </DialogHeader>

        {/* Main Form */}
        {step === "form" && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mobile">
                Mobile Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mobile"
                type="tel"
                placeholder="9876543210"
                {...register("mobile", {
                  required: "Mobile number is required",
                  pattern: {
                    value: /^\d{10}$/,
                    message: "Mobile number must be exactly 10 digits",
                  },
                  onChange: (e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setValue("mobile", value, { shouldValidate: true });
                  },
                })}
                disabled={isSubmitting || isExistingAccount}
                maxLength={10}
              />
              {errors.mobile && <p className="text-xs text-destructive">{errors.mobile.message}</p>}
              {isExistingAccount && (
                <p className="text-xs text-muted-foreground">Adding new profile for this number</p>
              )}
            </div>

            {isExistingAccount && (
              <div className="space-y-1.5">
                <Label htmlFor="relation">
                  Relation <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={relation}
                  onValueChange={(value) => {
                    setValue("relation", value, { shouldValidate: true });
                    clearErrors("relation");
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="relation">
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self" disabled={hasSelfProfile}>
                      {hasSelfProfile ? "Self (already exists)" : "Self"}
                    </SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="spouse" disabled={hasSpouseProfile}>
                    {hasSpouseProfile ? "Spouse (already exists)" : "Spouse"}
                  </SelectItem>
                  <SelectItem value="father" disabled={hasFatherProfile}>
                    {hasFatherProfile ? "Father (already exists)" : "Father"}
                  </SelectItem>
                  <SelectItem value="mother" disabled={hasMotherProfile}>
                    {hasMotherProfile ? "Mother (already exists)" : "Mother"}
                  </SelectItem>
                  </SelectContent>
                </Select>
                {errors.relation && <p className="text-xs text-destructive">{errors.relation.message}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  {...register("first_name", { required: "First Name is required" })}
                  placeholder="John"
                  autoFocus
                  disabled={isSubmitting}
                />
                {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  {...register("last_name")}
                  placeholder="Doe"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Gender <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Male", value: "male" },
                  { label: "Female", value: "female" },
                  { label: "Other", value: "other" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-10 justify-center rounded-xl border-border/70 bg-background font-medium transition-all",
                      "hover:border-purple-300 hover:bg-purple-50/60 dark:hover:border-purple-700 dark:hover:bg-purple-900/20",
                      gender === option.value &&
                        "border-purple-600 bg-purple-50 text-purple-700 shadow-sm dark:bg-purple-900/30 dark:text-purple-300"
                    )}
                    onClick={() => {
                      setValue("gender", option.value, { shouldValidate: true });
                      clearErrors("gender");
                    }}
                    disabled={isSubmitting}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
            </div>

            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
              {ageInputMode === "age" ? (
                <>
                  <Label htmlFor="age_years">
                    Age <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Input
                        id="age_years"
                        type="number"
                        min={0}
                        placeholder="25"
                        {...register("age_years", {
                          onChange: (e) => {
                            const sanitized = e.target.value.replace(/\D/g, "").slice(0, 3);
                            setValue("age_years", sanitized, { shouldValidate: true });
                          },
                        })}
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">Years</p>
                    </div>
                    <div className="space-y-1">
                      <Input
                        id="age_months"
                        type="number"
                        min={0}
                        max={11}
                        placeholder="0"
                        {...register("age_months", {
                          onChange: (e) => {
                            const sanitized = e.target.value.replace(/\D/g, "").slice(0, 2);
                            setValue("age_months", sanitized, { shouldValidate: true });
                          },
                        })}
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">Months</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-fit rounded-md px-2 py-1 text-sm text-purple-700 hover:bg-purple-100/60 hover:text-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/30"
                    onClick={() => switchInputMode("dob")}
                    disabled={isSubmitting}
                  >
                    Switch to DOB
                  </Button>
                </>
              ) : (
                <>
                  <Label htmlFor="date_of_birth">
                    DOB <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    {...register("date_of_birth")}
                    max={new Date().toISOString().split("T")[0]}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-fit rounded-md px-2 py-1 text-sm text-purple-700 hover:bg-purple-100/60 hover:text-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/30"
                    onClick={() => switchInputMode("age")}
                    disabled={isSubmitting}
                  >
                    Switch to Age
                  </Button>
                </>
              )}
              {(errors.age_years?.message === "Enter Age or DOB" || errors.date_of_birth?.message === "Enter Age or DOB") && (
                <p className="text-xs text-destructive">Enter Age or DOB</p>
              )}
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Patient
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Patient Exists - Show Profiles */}
        {step === "exists" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Mobile: {checkedMobile}</p>
              <Button variant="ghost" size="sm" onClick={handleBack} disabled={isSubmitting}>
                Back to Form
              </Button>
            </div>

            {profiles.length > 0 ? (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {profiles.map((profile) => (
                    <button
                      key={profile.profile_id}
                      onClick={() => handleSelectProfile(profile, checkedMobile)}
                      disabled={isSubmitting}
                      className={cn(
                        "w-full rounded-lg border-2 p-4 text-left transition-all",
                        "hover:border-purple-300 dark:hover:border-purple-700",
                        "hover:bg-purple-50 dark:hover:bg-purple-900/20",
                        "border-purple-200 dark:border-purple-800",
                        isSubmitting && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                            {getInitials(profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{profile.full_name}</p>
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                              {getRelationLabel(profile.relation)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {profile.gender && <span>{profile.gender}</span>}
                            {profile.date_of_birth && (
                              <>
                                <span>•</span>
                                <span>{formatDate(profile.date_of_birth)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No profiles found for this patient
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <AlertDialog open={showMinorWarning} onOpenChange={setShowMinorWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Patient appears under 18</AlertDialogTitle>
            <AlertDialogDescription>
              This patient appears to be under 18 and is being added as self profile.
              It is recommended to add a guardian profile first. You can still continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleMinorAddGuardian}>
              Add Guardian
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleMinorContinue}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
