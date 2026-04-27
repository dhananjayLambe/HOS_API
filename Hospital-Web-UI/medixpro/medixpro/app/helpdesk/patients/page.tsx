"use client";

import { AddPatientDialog } from "@/components/patient/add-patient-dialog";
import { HelpdeskPatientSearch, type HelpdeskSearchPatient } from "@/components/helpdesk/HelpdeskPatientSearch";
import { Button } from "@/components/ui/button";
import { useHelpdeskQueueStore } from "@/lib/helpdeskQueueStore";
import type { Patient } from "@/lib/patientContext";
import axiosClient from "@/lib/axiosClient";
import { helpdeskCheckInOnServer, HELPDESK_DUPLICATE_NO_SYNCED_ROW } from "@/lib/helpdeskCheckIn";
import { useIsMobile } from "@/components/ui/use-mobile";
import { UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useToastNotification } from "@/hooks/use-toast-notification";

export default function HelpdeskPatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const notify = useToastNotification();

  const addPatientFromSearch = useHelpdeskQueueStore((s) => s.addPatientFromSearch);
  const findEntryByPatient = useHelpdeskQueueStore((s) => s.findEntryByPatient);
  const setHighlightQueueEntryId = useHelpdeskQueueStore((s) => s.setHighlightQueueEntryId);
  const fetchTodayQueue = useHelpdeskQueueStore((s) => s.fetchTodayQueue);

  const [addOpen, setAddOpen] = useState(false);
  const [addDialogContext, setAddDialogContext] = useState<{
    prefillMobile?: string;
    isExistingAccount?: boolean;
    existingRelations?: string[];
    existingPatientAccountId?: string;
  }>({});

  const initialQuery = searchParams.get("q") ?? "";

  const goQueueWithHighlight = useCallback(
    (queueEntryId: string, message: "new" | "existing") => {
      if (message === "existing") {
        toast.message("Already in queue");
      } else {
        toast.success("Added to queue");
      }
      setHighlightQueueEntryId(queueEntryId);
      router.push("/helpdesk/queue");
    },
    [router, setHighlightQueueEntryId]
  );

  const handleSelectFromSearch = async (patient: HelpdeskSearchPatient) => {
    const existing = findEntryByPatient({ id: patient.id, mobile: patient.mobile });
    const hasSyncedEncounter = Boolean(existing?.visitId && existing?.clinicId);
    if (existing && hasSyncedEncounter) {
      goQueueWithHighlight(existing.id, "existing");
      return;
    }
    if (!patient.patient_account_id) {
      notify.error("Patient account is missing. Please re-search and try again.");
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
          goQueueWithHighlight(afterSync.id, "existing");
          return;
        }
        notify.info(`${checkIn.error}${HELPDESK_DUPLICATE_NO_SYNCED_ROW}`);
        router.push("/helpdesk/queue");
        return;
      }
      const localId = addPatientFromSearch(patient);
      setHighlightQueueEntryId(localId);
      notify.error(
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
      notify.info("Check-in saved. Refresh the queue if the list looks out of date.");
    }
    const synced = useHelpdeskQueueStore
      .getState()
      .findEntryByPatient({ id: patient.id, mobile: patient.mobile });
    goQueueWithHighlight(synced ? synced.id : addPatientFromSearch(patient), "new");
  };

  const handleAddProfile = async (patient: HelpdeskSearchPatient) => {
    if (!patient.mobile) return;
    const normalizedMobile = patient.mobile.replace(/\D/g, "").slice(-10);
    if (normalizedMobile.length !== 10) {
      notify.error("Invalid mobile number for selected patient.");
      return;
    }

    let existingPatientAccountId: string | undefined;
    let existingRelations: string[] = [];
    try {
      const checkResponse = await axiosClient.post("/patients/check-mobile/", {
        mobile: normalizedMobile,
      });
      if (checkResponse.data?.exists && checkResponse.data?.patient_account_id) {
        existingPatientAccountId = checkResponse.data.patient_account_id;
        existingRelations = Array.from(
          new Set(
            (checkResponse.data?.profiles || [])
              .map((profile: { relation?: string }) => profile?.relation?.toLowerCase())
              .filter((relation: string | undefined): relation is string => Boolean(relation))
          )
        );
      }
    } catch (e) {
      console.error(e);
    }

    if (!existingPatientAccountId) {
      notify.error("Could not load account for this mobile. Please try again.");
      return;
    }

    setAddDialogContext({
      prefillMobile: normalizedMobile,
      isExistingAccount: true,
      existingRelations,
      existingPatientAccountId,
    });
    setAddOpen(true);
  };

  const handlePatientAddedFromDialog = async (patient: Patient) => {
    const existing = findEntryByPatient({ id: patient.id, mobile: patient.mobile });
    const hasSyncedEncounter = Boolean(existing?.visitId && existing?.clinicId);
    if (existing && hasSyncedEncounter) {
      goQueueWithHighlight(existing.id, "existing");
      return;
    }
    try {
      const { data: checkResponse } = await axiosClient.post("/patients/check-mobile/", {
        mobile: (patient.mobile || "").replace(/\D/g, "").slice(-10),
      });
      const patientAccountId = checkResponse?.patient_account_id;
      if (!patientAccountId) {
        notify.error("Missing patient account. Please try again.");
        return;
      }
      const checkIn = await helpdeskCheckInOnServer(axiosClient, {
        patient_account_id: patientAccountId,
        patient_profile_id: patient.id,
      });
      if (!checkIn.ok) {
        if (checkIn.kind === "duplicate_queue") {
          await fetchTodayQueue().catch(() => undefined);
          const afterSync = useHelpdeskQueueStore
            .getState()
            .findEntryByPatient({ id: patient.id, mobile: patient.mobile });
          if (afterSync?.visitId && afterSync.clinicId) {
            goQueueWithHighlight(afterSync.id, "existing");
            return;
          }
          notify.info(`${checkIn.error}${HELPDESK_DUPLICATE_NO_SYNCED_ROW}`);
          router.push("/helpdesk/queue");
          return;
        }
        const localId = addPatientFromSearch(patient);
        setHighlightQueueEntryId(localId);
        notify.error(
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
        notify.info("Check-in saved. Refresh the queue if the list looks out of date.");
      }
      const synced = useHelpdeskQueueStore
        .getState()
        .findEntryByPatient({ id: patient.id, mobile: patient.mobile });
      goQueueWithHighlight(synced ? synced.id : addPatientFromSearch(patient), "new");
    } catch {
      const localId = addPatientFromSearch(patient);
      setHighlightQueueEntryId(localId);
      notify.error("Could not complete check-in. Added locally; retry check-in.");
      router.push("/helpdesk/queue");
    }
  };

  const openNewPatientDialog = () => {
    setAddDialogContext({});
    setAddOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Patients</h1>
        <p className="text-sm text-muted-foreground">Search or add — queue updates instantly</p>
      </div>

      <HelpdeskPatientSearch
        initialQuery={initialQuery}
        autoFocus
        onAddNew={openNewPatientDialog}
        onSelectPatient={handleSelectFromSearch}
        onAddProfile={handleAddProfile}
      />

      <Button type="button" variant="outline" className="w-full gap-2" onClick={openNewPatientDialog}>
        <UserPlus className="h-4 w-4" />
        + Add New Patient
      </Button>

      <AddPatientDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setAddDialogContext({});
        }}
        onPatientAdded={handlePatientAddedFromDialog}
        prefillMobile={addDialogContext.prefillMobile}
        isExistingAccount={addDialogContext.isExistingAccount}
        existingRelations={addDialogContext.existingRelations}
        existingPatientAccountId={addDialogContext.existingPatientAccountId}
        syncGlobalPatientContext={false}
        submitLabel="+ Add to Queue"
        presentation={isMobile ? "bottom-sheet" : "default"}
      />
    </div>
  );
}
