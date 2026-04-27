import { isAxiosError } from "axios";
import type { AxiosInstance } from "axios";
import { getApiErrorDetail } from "./apiErrorMessage";

export type HelpdeskCheckInResult =
  | { ok: true }
  | { ok: false; error: string; kind: "duplicate_queue" | "other" };

/**
 * Shown when check-in says duplicate (400) but GET /queue/helpdesk/today/ does not return
 * a row (e.g. encounter hidden from the helpdesk list, clinic/doctor mismatch, stale client).
 * Avoids “added locally; retry” loops and duplicate ghost rows.
 */
export const HELPDESK_DUPLICATE_NO_SYNCED_ROW =
  " If you still do not see this patient, the helpdesk list may be hiding the visit. Check the doctor queue or refresh.";

/**
 * GET helpdesk context + POST queue/check-in. Does not fetch today's queue (call separately).
 */
export async function helpdeskCheckInOnServer(
  client: AxiosInstance,
  params: { patient_account_id: string; patient_profile_id: string }
): Promise<HelpdeskCheckInResult> {
  try {
    const { data: ctx } = await client.get<{ clinic_id: string; doctor_id: string }>("/queue/helpdesk/context/");
    await client.post("/queue/check-in/", {
      clinic_id: ctx.clinic_id,
      doctor_id: ctx.doctor_id,
      patient_account_id: params.patient_account_id,
      patient_profile_id: params.patient_profile_id,
    });
    return { ok: true };
  } catch (e) {
    const error = getApiErrorDetail(e);
    const status = isAxiosError(e) ? e.response?.status : undefined;
    const duplicate =
      status === 400 && /already checked in/i.test(error);
    return {
      ok: false,
      error,
      kind: duplicate ? "duplicate_queue" : "other",
    };
  }
}
