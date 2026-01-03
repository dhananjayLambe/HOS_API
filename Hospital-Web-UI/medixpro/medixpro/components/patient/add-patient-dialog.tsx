"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
}

interface PatientFormData {
  first_name: string;
  last_name: string;
  mobile: string;
  gender: string;
  date_of_birth: string;
}

interface PatientProfile {
  profile_id: string;
  full_name: string;
  relation: string;
  gender: string;
  date_of_birth: string | null;
}

type DialogStep = "form" | "exists";

export function AddPatientDialog({ open, onOpenChange, onPatientAdded }: AddPatientDialogProps) {
  const { setSelectedPatient } = usePatient();
  const toast = useToastNotification();
  const [step, setStep] = useState<DialogStep>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientAccountId, setPatientAccountId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [checkedMobile, setCheckedMobile] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PatientFormData>({
    defaultValues: {
      first_name: "",
      last_name: "",
      mobile: "",
      gender: "",
      date_of_birth: "",
    },
    mode: "onChange",
  });

  const gender = watch("gender");
  const mobile = watch("mobile");

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

  // Main submit handler - checks if patient exists first, then creates or selects
  const onSubmit = async (data: PatientFormData) => {
    if (!data.gender) {
      toast.error("Please select a gender");
      return;
    }
    
    if (!data.date_of_birth) {
      toast.error("Date of birth is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedMobile = data.mobile.replace(/\D/g, '');
      
      if (normalizedMobile.length !== 10) {
        toast.error("Mobile number must be exactly 10 digits");
        setIsSubmitting(false);
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
          await handleCreatePatient(data, normalizedMobile);
        }
      } else {
        // Patient does not exist - create new patient
        await handleCreatePatient(data, normalizedMobile);
      }
    } catch (error: any) {
      console.error("Error in patient flow:", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
  const handleCreatePatient = async (data: PatientFormData, normalizedMobile: string) => {
    try {
      // Prepare request body - backend requires all fields per CreatePatientSerializer
      const requestBody = {
        mobile: normalizedMobile,
        first_name: data.first_name,
        last_name: data.last_name || "",
        gender: data.gender.toLowerCase(),
        date_of_birth: data.date_of_birth,
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

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
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
      <DialogContent className="sm:max-w-[550px]">
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
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
                disabled={isSubmitting}
                maxLength={10}
              />
              {errors.mobile && <p className="text-xs text-destructive">{errors.mobile.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  {...register("first_name", { required: "First name is required" })}
                  placeholder="John"
                  disabled={isSubmitting}
                />
                {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  {...register("last_name")}
                  placeholder="Doe"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">
                  Gender <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={gender}
                  onValueChange={(value) => {
                    setValue("gender", value, { shouldValidate: true });
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">
                  Date of Birth <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...register("date_of_birth", { required: "Date of birth is required" })}
                  max={new Date().toISOString().split("T")[0]}
                  disabled={isSubmitting}
                />
                {errors.date_of_birth && <p className="text-xs text-destructive">{errors.date_of_birth.message}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
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
    </Dialog>
  );
}
