import { toast } from "sonner";

import axiosClient from "@/lib/axiosClient";
import { debugSessionLog } from "@/lib/debugSessionLog";
import { helpdeskCheckInOnServer, HELPDESK_DUPLICATE_NO_SYNCED_ROW } from "@/lib/helpdeskCheckIn";
import { useHelpdeskQueueStore, type QueueEntry } from "@/lib/helpdeskQueueStore";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";

export type HelpdeskLivePatientSelectDeps = {
  router: { push: (href: string) => void };
  fetchTodayQueue: () => Promise<unknown>;
  findEntryByPatient: (patient: { id: string; mobile?: string | null }) => QueueEntry | null;
  addPatientFromSearch: (patient: {
    id: string;
    full_name: string;
    mobile?: string | null;
  }) => string;
  setHighlightQueueEntryId: (id: string) => void;
};

/**
 * Check in / highlight queue for a patient chosen from helpdesk search (header or Patients page).
 */
export async function runHelpdeskLivePatientSelect(
  patient: PatientSearchRow,
  {
    router,
    fetchTodayQueue,
    findEntryByPatient,
    addPatientFromSearch,
    setHighlightQueueEntryId,
  }: HelpdeskLivePatientSelectDeps
): Promise<void> {
  try {
    await fetchTodayQueue();
  } catch {
    // Best-effort; duplicate check still uses current store
  }
  const existing = findEntryByPatient({ id: patient.id, mobile: patient.mobile });
  const hasSyncedEncounter = Boolean(existing?.visitId && existing?.clinicId);
  debugSessionLog({
    runId: "post-fix-verify",
    hypothesisId: "H3",
    location: "helpdeskLivePatientSelect.ts:runHelpdeskLivePatientSelect",
    message: "add-from-search after fetchTodayQueue",
    data: {
      hasExisting: Boolean(existing),
      hasSyncedEncounter,
      willShortCircuitAlready: Boolean(existing && hasSyncedEncounter),
    },
  });
  if (existing && hasSyncedEncounter) {
    setHighlightQueueEntryId(existing.id);
    toast.message(`Already in queue${existing.name ? ` (${existing.name})` : ""} — see highlighted row.`);
    router.push("/helpdesk/queue");
    return;
  }
  if (!patient.patient_account_id) {
    toast.error("Patient account is missing. Please reopen search and try again.");
    return;
  }
  const checkIn = await helpdeskCheckInOnServer(axiosClient, {
    patient_account_id: patient.patient_account_id,
    patient_profile_id: patient.id,
  });
  if (!checkIn.ok) {
    if (checkIn.kind === "duplicate_queue") {
      await fetchTodayQueue().catch(() => undefined);
      const afterSync = useHelpdeskQueueStore
        .getState()
        .findEntryByPatient({ id: patient.id, mobile: patient.mobile });
      if (afterSync?.visitId && afterSync.clinicId) {
        setHighlightQueueEntryId(afterSync.id);
        toast.message("Already in today’s queue");
        router.push("/helpdesk/queue");
        return;
      }
      toast.message(`${checkIn.error}${HELPDESK_DUPLICATE_NO_SYNCED_ROW}`);
      router.push("/helpdesk/queue");
      return;
    }
    const localId = addPatientFromSearch(patient);
    setHighlightQueueEntryId(localId);
    toast.error(
      checkIn.kind === "other"
        ? `${checkIn.error} (Added locally; you can retry after fixing the issue.)`
        : "Could not sync queue. Added locally; retry check-in."
    );
    router.push("/helpdesk/queue");
    return;
  }
  try {
    await fetchTodayQueue();
  } catch {
    toast.message("Check-in saved. Refresh the queue if the list looks out of date.");
  }
  const synced = useHelpdeskQueueStore.getState().findEntryByPatient({ id: patient.id, mobile: patient.mobile });
  const queueEntryId = synced ? synced.id : addPatientFromSearch(patient);
  toast.success("Added to queue");
  setHighlightQueueEntryId(queueEntryId);
  router.push("/helpdesk/queue");
}
