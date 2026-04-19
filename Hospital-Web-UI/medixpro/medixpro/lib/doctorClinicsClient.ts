/**
 * Shared doctor clinic list fetch for Staff module (and similar).
 * Uses abort timeout so UI never hangs if /api/doctor/profile/clinics stalls.
 */

export type ClinicOption = { id: string; name: string }

const DEFAULT_TIMEOUT_MS = 10_000

const CLINIC_STORAGE_KEY = "clinic_id"

export function parseClinicRows(raw: unknown): ClinicOption[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((c: unknown) => {
      const row = c as Record<string, unknown>
      const id =
        (row.id as string) ||
        (row.clinic_id as string) ||
        (row.clinic as { id?: string })?.id ||
        ""
      const name =
        (row.name as string) ||
        (row.clinic_name as string) ||
        (row.clinic as { name?: string })?.name ||
        "Clinic"
      return id ? { id: String(id), name: String(name) } : null
    })
    .filter((x): x is ClinicOption => x !== null)
}

/** GET /api/doctor/profile/clinics with timeout; returns [] on failure/abort. */
export async function fetchDoctorClinicsFromApi(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ClinicOption[]> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch("/api/doctor/profile/clinics", {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    })
    if (!res.ok) return []
    const json = (await res.json()) as { data?: unknown; clinics?: unknown }
    const raw = json?.data ?? json?.clinics ?? []
    return parseClinicRows(raw)
  } catch {
    return []
  } finally {
    clearTimeout(t)
  }
}

/**
 * Single source for Staff flows: primary `localStorage` clinic_id when it matches
 * an API clinic; otherwise first clinic from API (persisted). If API returns nothing
 * but storage exists, keep a synthetic row so the user can retry.
 */
export async function loadStaffClinicSelection(
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ clinics: ClinicOption[]; clinicId: string }> {
  const stored =
    typeof window !== "undefined" ? localStorage.getItem(CLINIC_STORAGE_KEY) : null
  const list = await fetchDoctorClinicsFromApi(timeoutMs)

  if (list.length >= 1) {
    let clinicId: string
    if (stored && list.some((c) => c.id === stored)) {
      clinicId = stored
    } else {
      clinicId = list[0].id
      localStorage.setItem(CLINIC_STORAGE_KEY, clinicId)
    }
    return { clinics: list, clinicId }
  }

  if (stored) {
    return {
      clinics: [{ id: stored, name: "Clinic" }],
      clinicId: stored,
    }
  }

  return { clinics: [], clinicId: "" }
}

/** Resolves clinic id using the same rules as `loadStaffClinicSelection`. */
export async function resolveClinicIdForStaff(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  const { clinicId } = await loadStaffClinicSelection(timeoutMs)
  return clinicId
}
