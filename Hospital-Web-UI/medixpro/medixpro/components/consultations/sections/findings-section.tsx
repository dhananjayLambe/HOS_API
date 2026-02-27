"use client";

import { useEffect, useMemo } from "react";
import { Stethoscope } from "lucide-react";
import { ConsultationSection } from "@/components/consultations/consultation-section";
import type { ConsultationSectionConfig } from "@/lib/consultation-types";
import type { FindingsSectionSchema } from "@/lib/consultation-schema-types";
import { useConsultationStore } from "@/store/consultationStore";

export function FindingsSection() {
  const { findingsSchema, setFindingsSchema } = useConsultationStore();

  useEffect(() => {
    if (findingsSchema) return;

    const controller = new AbortController();

    async function loadSchema() {
      try {
        const res = await fetch(
          `/api/consultation/render-schema?specialty=physician&section=findings`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as FindingsSectionSchema;
        if (data.section === "findings" && Array.isArray(data.items)) {
          setFindingsSchema(data);
        }
      } catch {
        // ignore network errors
      }
    }

    void loadSchema();
    return () => controller.abort();
  }, [findingsSchema, setFindingsSchema]);

  const configOverride: ConsultationSectionConfig | undefined = useMemo(() => {
    if (!findingsSchema) return undefined;
    return {
      type: "findings",
      itemLabel: "Finding",
      searchPlaceholder: "Search findings",
      staticOptions: findingsSchema.items.map((item) => ({
        id: item.key,
        label: item.display_name,
      })),
      durationOptions: [
        "Few hours",
        "1 Day",
        "2 Days",
        "3 Days",
        "1 Week",
        "2 Weeks",
        "1 Month",
        "2 Months",
      ],
      attributeOptions: ["Left", "Right", "Bilateral", "Localized", "Generalized"],
    };
  }, [findingsSchema]);

  return (
    <ConsultationSection
      type="findings"
      title="Findings"
      icon={<Stethoscope className="text-muted-foreground" />}
      defaultOpen={false}
      configOverride={configOverride}
    />
  );
}
