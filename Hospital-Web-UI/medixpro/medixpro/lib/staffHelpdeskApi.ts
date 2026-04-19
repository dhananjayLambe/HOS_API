/**
 * Staff (Helpdesk) — UI-facing API: calls Next BFF only (`/api/doctor/helpdesk/clinic-staff`).
 */

export const MAX_STAFF_PER_CLINIC = 3

export type StaffRole = "helpdesk"

export interface StaffMember {
  id: string
  name: string
  /** Full mobile as stored (username); UI may mask for display */
  mobile: string
  role: StaffRole
  status: "active"
}

export interface CreateStaffInput {
  clinicId: string
  firstName: string
  lastName: string
  mobile: string
  role: StaffRole
}

export type StaffApiErrorCode =
  | "duplicate_mobile"
  | "limit_reached"
  | "not_found"
  | "api_error"

export class StaffApiError extends Error {
  constructor(
    message: string,
    public code: StaffApiErrorCode
  ) {
    super(message)
    this.name = "StaffApiError"
  }
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function parseBffError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: unknown }
  return typeof data.error === "string" && data.error ? data.error : "Something went wrong"
}

function inferStaffCode(message: string): StaffApiErrorCode {
  if (message.includes("Maximum staff limit reached")) return "limit_reached"
  if (message.includes("This mobile number is already registered")) return "duplicate_mobile"
  if (/not found/i.test(message)) return "not_found"
  return "api_error"
}

function throwStaffApiError(message: string): never {
  throw new StaffApiError(message, inferStaffCode(message))
}

type HelpdeskListRow = {
  id: string
  name: string
  mobile: string
  is_active?: boolean
}

/** List active helpdesk staff for a clinic (via BFF). */
export async function listStaff(params: { clinicId: string }): Promise<{ staff: StaffMember[] }> {
  const q = new URLSearchParams({ clinic_id: params.clinicId })
  const res = await fetch(`/api/doctor/helpdesk/clinic-staff/?${q}`, {
    method: "GET",
    headers: authHeaders(),
  })

  if (!res.ok) {
    const msg = await parseBffError(res)
    throwStaffApiError(msg)
  }

  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) {
    throw new StaffApiError("Something went wrong", "api_error")
  }

  const rows = data as HelpdeskListRow[]
  const staff: StaffMember[] = rows
    .filter((item) => item.is_active !== false)
    .map((item) => ({
      id: String(item.id),
      name: item.name,
      mobile: item.mobile,
      role: "helpdesk",
      status: "active",
    }))

  return { staff }
}

/** Create helpdesk staff (via BFF). */
export async function createStaff(input: CreateStaffInput): Promise<void> {
  const digits = normalizeMobileDigits(input.mobile)
  const body = {
    clinic_id: input.clinicId,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    mobile: digits,
  }

  const res = await fetch("/api/doctor/helpdesk/clinic-staff/", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const msg = await parseBffError(res)
    throwStaffApiError(msg)
  }
}

/** Remove helpdesk staff by HelpdeskClinicUser id (via BFF). Success does not depend on response body. */
export async function removeStaff(params: { staffId: string }): Promise<void> {
  const res = await fetch(
    `/api/doctor/helpdesk/clinic-staff/${encodeURIComponent(params.staffId)}/`,
    {
      method: "DELETE",
      headers: authHeaders(),
    }
  )

  if (!res.ok) {
    const msg = await parseBffError(res)
    throwStaffApiError(msg)
  }
}

export function normalizeMobileDigits(input: string): string {
  return input.replace(/\D/g, "").slice(0, 15)
}

/** Mask mobile for display e.g. +91 98XXXXXX12 */
export function formatMobileDisplay(mobileDigits: string): string {
  const d = normalizeMobileDigits(mobileDigits)
  if (d.length <= 4) return d
  const last2 = d.slice(-2)
  const prefix = d.slice(0, 2)
  return `${prefix}XXXXXX${last2}`
}
