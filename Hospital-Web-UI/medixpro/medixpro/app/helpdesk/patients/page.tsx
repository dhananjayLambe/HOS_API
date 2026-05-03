"use client";

import { useCallback } from "react";

import {
  HelpdeskPatientSearch,
  type HelpdeskSearchPatient,
} from "@/components/helpdesk/HelpdeskPatientSearch";
import { useHelpdeskAddPatientDialog } from "@/lib/helpdeskAddPatientContext";
import { runHelpdeskLivePatientSelect } from "@/lib/helpdeskLivePatientSelect";
import { useHelpdeskQueueStore } from "@/lib/helpdeskQueueStore";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";
import { useRouter } from "next/navigation";

function toPatientSearchRow(p: HelpdeskSearchPatient): PatientSearchRow {
  const full =
    p.full_name?.trim() ||
    `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
    "Unnamed";
  return {
    id: p.id,
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    full_name: full,
    gender: p.gender,
    date_of_birth: p.date_of_birth,
    mobile: p.mobile,
    patient_account_id: p.patient_account_id,
    relation: undefined,
  };
}

export default function HelpdeskPatientsPage() {
  const { openAddPatientDialog } = useHelpdeskAddPatientDialog();
  const router = useRouter();
  const addPatientFromSearch = useHelpdeskQueueStore((s) => s.addPatientFromSearch);
  const findEntryByPatient = useHelpdeskQueueStore((s) => s.findEntryByPatient);
  const setHighlightQueueEntryId = useHelpdeskQueueStore((s) => s.setHighlightQueueEntryId);
  const fetchTodayQueue = useHelpdeskQueueStore((s) => s.fetchTodayQueue);

  const handleSelectPatient = useCallback(
    async (patient: HelpdeskSearchPatient) => {
      await runHelpdeskLivePatientSelect(toPatientSearchRow(patient), {
        router,
        fetchTodayQueue,
        findEntryByPatient,
        addPatientFromSearch,
        setHighlightQueueEntryId,
      });
    },
    [
      router,
      fetchTodayQueue,
      findEntryByPatient,
      addPatientFromSearch,
      setHighlightQueueEntryId,
    ]
  );

  return (
    <div className="mx-auto max-w-lg space-y-4 px-3 py-3 pb-28 md:max-w-2xl md:px-4 md:py-4 md:pb-8">
      <header className="space-y-0.5">
        <h1 className="text-xl font-semibold tracking-tight">Patients</h1>
        <p className="text-sm text-muted-foreground">
          Search to check in and add someone to today&apos;s queue. Use + in the header or + Add New Patient
          in the results to register someone new.
        </p>
      </header>

      <HelpdeskPatientSearch
        onAddNew={openAddPatientDialog}
        onSelectPatient={handleSelectPatient}
        autoFocus
        resultsScrollMaxHeightClassName="max-h-[min(50vh,360px)]"
      />
    </div>
  );
}
