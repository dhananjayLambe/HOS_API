"use client";

import { AddPatientDialog } from "@/components/patient/add-patient-dialog";
import { HelpdeskPatientSearch, type HelpdeskSearchPatient } from "@/components/helpdesk/HelpdeskPatientSearch";
import { Button } from "@/components/ui/button";
import { useHelpdeskQueueStore } from "@/lib/helpdeskQueueStore";
import type { Patient } from "@/lib/patientContext";
import axiosClient from "@/lib/axiosClient";
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
  const setPreConsultTargetId = useHelpdeskQueueStore((s) => s.setPreConsultTargetId);

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
      setPreConsultTargetId(queueEntryId);
      router.push("/helpdesk/queue");
    },
    [router, setPreConsultTargetId]
  );

  const handleSelectFromSearch = (patient: HelpdeskSearchPatient) => {
    const existing = findEntryByPatient({ id: patient.id, mobile: patient.mobile });
    const queueEntryId = existing ? existing.id : addPatientFromSearch(patient);
    goQueueWithHighlight(queueEntryId, existing ? "existing" : "new");
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

  const handlePatientAddedFromDialog = (patient: Patient) => {
    const existing = findEntryByPatient({ id: patient.id, mobile: patient.mobile });
    const queueEntryId = existing ? existing.id : addPatientFromSearch(patient);
    goQueueWithHighlight(queueEntryId, existing ? "existing" : "new");
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
