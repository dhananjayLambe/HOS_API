"use client";

import { useRouter } from "next/navigation";
import { PatientListCard } from "@/components/patients/patient-list-card";
import { PatientListEmpty } from "@/components/patients/patient-list-empty";
import { PatientListFilters } from "@/components/patients/patient-list-filters";
import { PatientListPagination } from "@/components/patients/patient-list-pagination";
import { PatientListRow } from "@/components/patients/patient-list-row";
import { PatientListSearch } from "@/components/patients/patient-list-search";
import { PatientListSkeletons } from "@/components/patients/patient-list-skeletons";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePatientList } from "@/hooks/use-patient-list";
import { useMobile } from "@/hooks/use-mobile";
import type { PatientListRow as PatientListRowType } from "@/lib/api/patients";
import { usePatient } from "@/lib/patientContext";

export default function PatientsPage() {
  const router = useRouter();
  const isMobile = useMobile();
  const { setSelectedPatient } = usePatient();
  const {
    qInput,
    setQInput,
    runImmediateSearch,
    data,
    isLoading,
    error,
    filter,
    page,
    setFilter,
    setPage,
    resetFilters,
  } = usePatientList(20);

  const rows = data?.results || [];

  const openSummary = (row: PatientListRowType) => {
    setSelectedPatient({
      id: row.patient_id,
      first_name: row.first_name,
      last_name: row.last_name,
      full_name: row.full_name,
      gender: row.gender,
      mobile: row.mobile || undefined,
      relation: "self",
    });
    router.push(`/patients/${row.patient_id}`);
  };

  const startConsultation = (row: PatientListRowType) => {
    setSelectedPatient({
      id: row.patient_id,
      first_name: row.first_name,
      last_name: row.last_name,
      full_name: row.full_name,
      gender: row.gender,
      mobile: row.mobile || undefined,
      relation: "self",
    });
    router.push("/consultations/start-consultation");
  };

  const openPrescriptions = (row: PatientListRowType) => {
    router.push(`/prescriptions?patientId=${row.patient_id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">My Patients</h1>
        <p className="text-muted-foreground">Search and access patient consultations, prescriptions, and records.</p>
      </div>

      <div className="sticky top-16 z-30 space-y-2 border-b bg-background/85 pb-3 backdrop-blur-md shadow-[0_4px_12px_-8px_rgba(15,23,42,0.18)]">
        <PatientListSearch value={qInput} onChange={setQInput} onEnter={runImmediateSearch} />
        <PatientListFilters filter={filter} onChange={setFilter} onReset={resetFilters} />
      </div>

      {isLoading && !data ? (
        <PatientListSkeletons />
      ) : error ? (
        <PatientListEmpty onResetFilters={resetFilters} />
      ) : rows.length === 0 ? (
        <PatientListEmpty onResetFilters={resetFilters} />
      ) : (
        <>
          {isMobile ? (
            <div className="space-y-3">
              {rows.map((row) => (
                <PatientListCard
                  key={row.patient_id}
                  row={row}
                  onOpenSummary={openSummary}
                  onOpenPrescriptions={openPrescriptions}
                  onStartConsultation={startConsultation}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b border-border/50 bg-muted/30">
                    <TableHead className="h-10 font-semibold text-foreground">Patient</TableHead>
                    <TableHead className="h-10 font-semibold text-foreground">Last Seen</TableHead>
                    <TableHead className="h-10 font-semibold text-foreground">Recent Diagnosis</TableHead>
                    <TableHead className="h-10 font-semibold text-foreground">Active RX</TableHead>
                    <TableHead className="h-10 font-semibold text-foreground">Visits</TableHead>
                    <TableHead className="h-10 text-right font-semibold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <PatientListRow
                      key={row.patient_id}
                      row={row}
                      onOpenSummary={openSummary}
                      onOpenPrescriptions={openPrescriptions}
                      onStartConsultation={startConsultation}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <PatientListPagination
            page={data?.page || page}
            pageSize={data?.page_size || 20}
            total={data?.total || 0}
            totalPages={data?.total_pages || 0}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
