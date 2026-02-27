"use client";

import React, { useEffect, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { ConsultationSection } from "@/components/consultations/consultation-section";
import type { ConsultationSectionConfig } from "@/lib/consultation-types";
import type { DiagnosisSectionSchema } from "@/lib/consultation-schema-types";
import { useConsultationStore } from "@/store/consultationStore";

export function DiagnosisSection() {
  const { diagnosisSchema, setDiagnosisSchema } = useConsultationStore();

  useEffect(() => {
    if (diagnosisSchema) return;

    const controller = new AbortController();

    async function loadSchema() {
      try {
        const res = await fetch(
          `/api/consultation/render-schema?specialty=physician&section=diagnosis`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as DiagnosisSectionSchema;
        if (data.section === "diagnosis" && Array.isArray(data.items)) {
          setDiagnosisSchema(data);
        }
      } catch {
        // ignore network errors; do not block consultation.
      }
    }

    void loadSchema();
    return () => controller.abort();
  }, [diagnosisSchema, setDiagnosisSchema]);

  const configOverride: ConsultationSectionConfig | undefined = useMemo(() => {
    if (!diagnosisSchema) return undefined;
    return {
      type: "diagnosis",
      itemLabel: "Diagnosis",
      searchPlaceholder: "Search diagnosis",
      staticOptions: diagnosisSchema.items.map((item) => ({
        id: item.key,
        label: item.display_name,
      })),
      durationOptions: [],
      attributeOptions: [],
    };
  }, [diagnosisSchema]);

  return (
    <ConsultationSection
      type="diagnosis"
      title="Diagnosis"
      icon={<ClipboardList className="text-muted-foreground" />}
      defaultOpen={false}
      configOverride={configOverride}
    />
  );
}
