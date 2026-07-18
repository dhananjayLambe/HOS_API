"use client";

import { isCancel } from "axios";
import { useCallback, useEffect, useState } from "react";
import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PatientClinicalOverview } from "@/components/patients/patient-summary/patient-clinical-overview";
import { PatientSummaryHeader } from "@/components/patients/patient-summary/patient-summary-header";
import { PatientSummarySidebar, type PatientSummarySection } from "@/components/patients/patient-summary/patient-summary-sidebar";
import { PatientSummarySkeleton } from "@/components/patients/patient-summary/patient-summary-skeleton";
import { PatientTimeline } from "@/components/patients/patient-summary/patient-timeline";
import { PatientConsultationCard } from "@/components/patients/patient-summary/patient-consultation-card";
import { PatientPrescriptionCard } from "@/components/patients/patient-summary/patient-prescription-card";
import { PatientClinicalLabHistory } from "@/components/patients/patient-summary/clinical-lab-history";
import { useMobile } from "@/hooks/use-mobile";
import { getPatientSummary } from "@/lib/api/patient-summary";
import type { PatientSummaryPayload } from "@/lib/mock/patient-summary";
import { resolveDoctorContext } from "@/lib/doctor/resolveDoctorContext";

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
  if (normalized === "labs" || normalized === "lab-reports" || normalized === "lab-history") {
    return "labs";
  }
  if (normalized === "overview") return "overview";
  return null;
}

function sectionToTab(section: PatientSummarySection): string {
  return section === "labs" ? "labs" : section;
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
  const focusReportId = searchParams.get("reportId");

  const navigateSection = useCallback(
    (section: PatientSummarySection, extras?: { reportId?: string | null }) => {
      setActiveSection(section);
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", sectionToTab(section));
      if (extras?.reportId) {
        next.set("reportId", extras.reportId);
      } else if (section !== "labs") {
        next.delete("reportId");
      }
      router.replace(`/patients/${id}?${next.toString()}`, { scroll: false });
    },
    [id, router, searchParams]
  );

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

    void (async () => {
      try {
        let clinicId: string | undefined;
        try {
          const ctx = await resolveDoctorContext();
          if (ctx.clinicId) clinicId = ctx.clinicId;
        } catch {
          clinicId = undefined;
        }
        const data = await getPatientSummary(id, controller.signal, clinicId);
        if (!cancelled) setPayload(data);
      } catch (err: unknown) {
        if (cancelled || isCancel(err)) return;
        setError("Unable to load patient summary. Try refreshing the page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

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
        onViewPrescriptions={() => navigateSection("prescriptions")}
        onViewLabs={() => navigateSection("labs")}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[220px_1fr]">
        <PatientSummarySidebar
          active={activeSection}
          onChange={(section) => navigateSection(section)}
          isMobile={isMobile}
        />

        <main className="space-y-14">
          {activeSection === "overview" ? (
            <PatientClinicalOverview
              payload={payload}
              onViewLabs={() => navigateSection("labs")}
              onViewTimeline={() => navigateSection("timeline")}
            />
          ) : null}

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
            <PatientClinicalLabHistory
              patientId={String(payload.patient.id)}
              focusReportId={focusReportId}
            />
          ) : null}

          {activeSection === "timeline" ? (
            <PatientTimeline
              events={payload.timeline}
              onOpenLabHistory={() => navigateSection("labs")}
              onOpenLabReport={(reportId) => navigateSection("labs", { reportId })}
            />
          ) : null}
        </main>
      </div>
      </div>
    </div>
  );
}
