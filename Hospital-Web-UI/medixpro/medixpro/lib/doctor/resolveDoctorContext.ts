import axiosClient from "@/lib/axiosClient";
import { loadStaffClinicSelection } from "@/lib/doctorClinicsClient";

export type DoctorContext = {
  doctorId: string;
  clinicId: string;
  isReady: boolean;
};

function extractDoctorId(profileResponse: unknown): string | null {
  const data = profileResponse as Record<string, unknown>;
  const doctorProfile =
    (data?.doctor_profile as Record<string, unknown> | undefined) ?? data;
  const personalInfo = doctorProfile?.personal_info as Record<string, unknown> | undefined;
  const fromProfile =
    personalInfo?.id ?? doctorProfile?.id ?? doctorProfile?.doctor_id ?? data?.id;
  return fromProfile != null && String(fromProfile).trim() !== "" ? String(fromProfile) : null;
}

/**
 * Resolves doctor + clinic scope for dashboard tabs.
 * Shared by Schedule, Patients, Reports, and Practice Overview.
 */
export async function resolveDoctorContext(): Promise<DoctorContext> {
  let doctorId = "";
  let clinicId = "";

  try {
    const profileResponse = await axiosClient.get("/doctor/profile/");
    const resolved = extractDoctorId(profileResponse.data);
    if (resolved) {
      doctorId = resolved;
      if (typeof window !== "undefined") {
        localStorage.setItem("doctor_id", doctorId);
      }
    }
  } catch {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("doctor_id");
      if (stored) doctorId = stored;
    }
  }

  try {
    const { clinicId: resolvedClinic } = await loadStaffClinicSelection();
    if (resolvedClinic) clinicId = String(resolvedClinic);
  } catch {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("clinic_id");
      if (stored) clinicId = stored;
    }
  }

  return {
    doctorId,
    clinicId,
    isReady: Boolean(doctorId && clinicId),
  };
}
