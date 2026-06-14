"use client";

import { isCancel } from "axios";
import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PatientClinicalOverview } from "@/components/patients/patient-summary/patient-clinical-overview";
import { PatientSummaryHeader } from "@/components/patients/patient-summary/patient-summary-header";
import { PatientSummarySidebar, type PatientSummarySection } from "@/components/patients/patient-summary/patient-summary-sidebar";
import { PatientSummarySkeleton } from "@/components/patients/patient-summary/patient-summary-skeleton";
import { PatientTimeline } from "@/components/patients/patient-summary/patient-timeline";
import { PatientConsultationCard } from "@/components/patients/patient-summary/patient-consultation-card";
import { PatientPrescriptionCard } from "@/components/patients/patient-summary/patient-prescription-card";
import { PatientLabCard } from "@/components/patients/patient-summary/patient-lab-card";
import { useMobile } from "@/hooks/use-mobile";
import { getPatientSummary } from "@/lib/api/patient-summary";
import type { PatientSummaryPayload } from "@/lib/mock/patient-summary";

type PageProps = {
  params: Promise<{ id: string }>;
};

function resolveSectionFromTab(tab: string | null): PatientSummarySection | null {
  if (!tab) return null;
  const normalized = tab.trim().toLowerCase();
  if (normalized === "visits" || normalized === "visit-history" || normalized === "timeline") {
    return "timeline";
  }
  if (normalized === "consultations") return "consultations";
  if (normalized === "prescriptions") return "prescriptions";
  if (normalized === "labs" || normalized === "lab-reports") return "labs";
  if (normalized === "overview") return "overview";
  return null;
}

export default function PatientSummaryPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useMobile();
  const [activeSection, setActiveSection] = useState<PatientSummarySection>("overview");
  const [payload, setPayload] = useState<PatientSummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const section = resolveSectionFromTab(searchParams.get("tab"));
    if (section) {
      setActiveSection(section);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPayload(null);

    getPatientSummary(id, controller.signal)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((err: unknown) => {
        if (cancelled || isCancel(err)) return;
        setError("Unable to load patient summary. Try refreshing the page.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id]);

  if (loading) {
    return <PatientSummarySkeleton />;
  }

  if (error || !payload) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">{error ?? "Unable to load patient summary. Try refreshing the page."}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/40">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col space-y-14 px-1 pb-16">
      <PatientSummaryHeader
        payload={payload}
        onStartConsultation={() => router.push("/consultations/start-consultation")}
        onViewPrescriptions={() => setActiveSection("prescriptions")}
        onViewLabs={() => setActiveSection("labs")}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[220px_1fr]">
        <PatientSummarySidebar active={activeSection} onChange={setActiveSection} isMobile={isMobile} />

        <main className="space-y-14">
          {activeSection === "overview" ? <PatientClinicalOverview payload={payload} /> : null}

          {activeSection === "consultations" ? (
            <section className="space-y-5">
              <p className="text-lg font-semibold tracking-tight text-slate-900">Consultations</p>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {payload.consultations.map((consultation, index) => (
                  <PatientConsultationCard key={consultation.id} consultation={consultation} isLatest={index === 0} />
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "prescriptions" ? (
            <section className="space-y-5">
              <p className="text-lg font-semibold tracking-tight text-slate-900">Prescriptions</p>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {payload.prescriptions.map((prescription) => (
                  <PatientPrescriptionCard
                    key={prescription.id}
                    prescription={prescription}
                    patientFullName={payload.patient.full_name}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "labs" ? (
            <section className="space-y-5">
              <p className="text-lg font-semibold tracking-tight text-slate-900">Lab Reports</p>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {payload.labs.map((lab) => (
                  <PatientLabCard key={lab.id} lab={lab} />
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "timeline" ? <PatientTimeline events={payload.timeline} /> : null}
        </main>
      </div>
      </div>
    </div>
  );
}
