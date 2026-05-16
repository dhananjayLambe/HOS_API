import axios from "axios";

export const LAB_PROFILE_MISSING_CODE = "lab_profile_missing";

export const LAB_REGISTRATION_PATH = "/auth/register/lab-registration/";

export function isLabProfileMissingError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  if (status === 404) return true;
  const data = error.response?.data;
  if (data && typeof data === "object" && "code" in data) {
    return (data as { code?: string }).code === LAB_PROFILE_MISSING_CODE;
  }
  return false;
}

export function isLabPermissionDeniedError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return error.response?.status === 403;
}
