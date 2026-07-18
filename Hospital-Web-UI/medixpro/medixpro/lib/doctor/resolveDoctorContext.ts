import axiosClient from "@/lib/axiosClient";
import { loadStaffClinicSelection } from "@/lib/doctorClinicsClient";

export type DoctorContext = {
  doctorId: string;
  clinicId: string;
  isReady: boolean;
};

const CONTEXT_CACHE_TTL_MS = 30_000;

let inFlight: Promise<DoctorContext> | null = null;
let cached: { value: DoctorContext; at: number } | null = null;

function extractDoctorId(profileResponse: unknown): string | null {
  const data = profileResponse as Record<string, unknown>;
  const doctorProfile =
    (data?.doctor_profile as Record<string, unknown> | undefined) ??
    (data?.data as Record<string, unknown> | undefined) ??
    data;
  const personalInfo = doctorProfile?.personal_info as Record<string, unknown> | undefined;
  const fromProfile =
    personalInfo?.id ?? doctorProfile?.id ?? doctorProfile?.doctor_id ?? data?.id;
  return fromProfile != null && String(fromProfile).trim() !== "" ? String(fromProfile) : null;
}

async function loadDoctorContext(): Promise<DoctorContext> {
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

/** Clears in-flight + TTL cache (tests / logout). */
export function clearDoctorContextCache(): void {
  inFlight = null;
  cached = null;
}

/**
 * Resolves doctor + clinic scope for dashboard tabs.
 * Concurrent callers share one in-flight load; result is cached briefly to avoid duplicate profile/clinic fetches.
 * Matches SmartQueue: doctor_profile.personal_info.id + loadStaffClinicSelection().
 */
export async function resolveDoctorContext(): Promise<DoctorContext> {
  if (cached && Date.now() - cached.at < CONTEXT_CACHE_TTL_MS) {
    return cached.value;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = loadDoctorContext()
    .then((value) => {
      cached = { value, at: Date.now() };
      return value;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
