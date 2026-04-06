import { draftFindingsToEndConsultationPayload } from "@/lib/consultation-findings-helpers";
import { sectionItemsToEndConsultationDiagnosisPayload } from "@/lib/consultation-diagnosis-helpers";
import { useConsultationStore } from "@/store/consultationStore";

export function buildEndConsultationPayload(
  store: ReturnType<typeof useConsultationStore.getState>
) {
  const symptomsFromSection = store.sectionItems["symptoms"];
  const symptomsRaw =
    Array.isArray(symptomsFromSection) && symptomsFromSection.length > 0
      ? symptomsFromSection
      : store.symptoms ?? [];
  const symptoms = (Array.isArray(symptomsRaw) ? symptomsRaw : []).map((s: any) => ({
    id: s?.id,
    name: s?.name ?? s?.label ?? "",
    detail: s?.detail,
    is_custom: Boolean(s?.isCustom ?? s?.is_custom ?? false),
  }));

  const medicinesFromSection = store.sectionItems["medicines"];
  const medicines =
    Array.isArray(medicinesFromSection) && medicinesFromSection.length > 0
      ? medicinesFromSection
      : store.medicines ?? [];

  const investigationsFromSection = store.sectionItems["investigations"];
  const investigations =
    Array.isArray(investigationsFromSection) && investigationsFromSection.length > 0
      ? investigationsFromSection
      : store.investigations ?? [];

  const instructionsFromSection = store.sectionItems["instructions"];
  const instructions =
    Array.isArray(instructionsFromSection) && instructionsFromSection.length > 0
      ? instructionsFromSection
      : store.instructionsList ?? [];

  return {
    mode: "commit",
    store: {
      sectionItems: {
        symptoms,
        findings: draftFindingsToEndConsultationPayload(store.draftFindings ?? []),
        diagnosis: sectionItemsToEndConsultationDiagnosisPayload(
          store.sectionItems["diagnosis"] ?? []
        ),
        medicines,
        investigations,
        instructions,
      },
      meta: {
        consultation_type: store.consultationType ?? "FULL",
        follow_up: {
          date: store.follow_up_date ?? "",
          interval: store.follow_up_interval ?? 0,
          unit: store.follow_up_unit ?? "days",
          reason: store.follow_up_reason ?? "",
        },
      },
    },
  };
}
