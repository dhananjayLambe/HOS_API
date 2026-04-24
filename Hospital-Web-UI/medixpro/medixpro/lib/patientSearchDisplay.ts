import type { Patient } from "@/lib/patientContext";

export type PatientSearchRow = Pick<
  Patient,
  "id" | "first_name" | "last_name" | "full_name" | "gender" | "date_of_birth" | "mobile" | "relation"
>;

/** Mask for search result rows (matches doctor header search). */
export function maskMobileForSearch(mobile?: string | null): string {
  if (!mobile) return "N/A";
  const digits = mobile.replace(/\D/g, "");
  if (digits.length < 4) return mobile;
  const last4 = digits.slice(-4);
  return `+91-XXXX${last4}`;
}

export function calculateAgeFromDob(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null;
  try {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

/** e.g. "Male • 34 yrs" for result subtitle */
export function formatAgeGenderLine(patient: PatientSearchRow): string {
  const g = patient.gender?.trim();
  const label =
    g?.toLowerCase() === "male"
      ? "Male"
      : g?.toLowerCase() === "female"
        ? "Female"
        : g?.toLowerCase() === "other"
          ? "Other"
          : g
            ? g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()
            : "";
  const age = calculateAgeFromDob(patient.date_of_birth);
  if (label && age != null) return `${label} • ${age} yrs`;
  if (label) return label;
  if (age != null) return `${age} yrs`;
  return "";
}

export function displayPatientName(patient: PatientSearchRow): string {
  return (patient.full_name || `${patient.first_name} ${patient.last_name}`.trim()).trim() || "Unnamed";
}
