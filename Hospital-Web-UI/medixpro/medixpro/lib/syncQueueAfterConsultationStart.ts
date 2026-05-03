import axiosClient from "@/lib/axiosClient";
import { loadStaffClinicSelection } from "@/lib/doctorClinicsClient";

/**
 * After clinical consultation starts, align the doctor queue row to in_consultation.
 * Idempotent: 409 (already started / wrong queue state) is ignored.
 */
export async function syncQueueAfterConsultationStart(encounterId: string): Promise<void> {
  if (!encounterId) return;
  try {
    const { clinicId } = await loadStaffClinicSelection();
    if (!clinicId) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("syncQueueAfterConsultationStart: no clinic_id resolved; skipping queue PATCH");
      }
      return;
    }
    await axiosClient.patch("/queue/start/", {
      clinic_id: clinicId,
      encounter_id: encounterId,
    });
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 409) return;
    if (process.env.NODE_ENV !== "production") {
      console.warn("syncQueueAfterConsultationStart: queue PATCH failed", e);
    }
  }
}
