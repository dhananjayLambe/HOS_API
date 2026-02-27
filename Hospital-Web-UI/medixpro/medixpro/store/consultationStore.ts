"use client";

import { create } from "zustand";
import type {
  ConsultationState,
  ConsultationSymptom,
  ConsultationMedicine,
  ConsultationWorkflowType,
  SymptomDetail,
  ConsultationVitals,
  ConsultationSectionType,
  ConsultationSectionItem,
  SectionItemDetail,
} from "@/lib/consultation-types";
import type {
  SymptomsSectionSchema,
  SymptomItemSchema,
  FindingsSectionSchema,
  FindingItemSchema,
  DiagnosisSectionSchema,
  DiagnosisItemSchema,
  InstructionsSectionSchema,
  InstructionItemSchema,
  EncounterInstructionRow,
} from "@/lib/consultation-schema-types";
import { DEFAULT_CONSULTATION_STATE } from "@/lib/consultation-types";

type DraftStatus = {
  savedAt: Date | null;
  message: string | null;
};

/** Selected item for right-side detail panel (any section). follow_up has no itemId. */
export type SelectedDetailPayload = {
  section: ConsultationSectionType;
  itemId?: string;
} | null;

type ConsultationStore = ConsultationState & {
  draftStatus: DraftStatus;
  selectedSymptomId: string | null;
  /** Reusable section pattern: items per section (local, backend-agnostic). */
  sectionItems: Record<ConsultationSectionType, ConsultationSectionItem[]>;
  /** Backend-driven schema for symptoms (per consultation session). */
  symptomsSchema: SymptomsSectionSchema | null;
  /** Quick lookup of schema item by key. */
  symptomSchemaByKey: Record<string, SymptomItemSchema>;
  /** Backend-driven schema for findings. */
  findingsSchema: FindingsSectionSchema | null;
  findingSchemaByKey: Record<string, FindingItemSchema>;
  /** Backend-driven schema for diagnosis. */
  diagnosisSchema: DiagnosisSectionSchema | null;
  diagnosisSchemaByKey: Record<string, DiagnosisItemSchema>;
  /** Optional encounter id for instructions API (when in consultation context). */
  encounterId: string | null;
  /** Backend-driven schema for instructions (categories + templates). */
  instructionsSchema: InstructionsSectionSchema | null;
  /** Already-added encounter instructions from API. */
  instructionsList: EncounterInstructionRow[];
  /** When true, instruction add/edit/delete is disabled. */
  consultationFinalized: boolean;
  selectedDetail: SelectedDetailPayload;
  setSymptoms: (symptoms: ConsultationSymptom[]) => void;
  addSymptom: (symptom: ConsultationSymptom) => void;
  removeSymptom: (id: string) => void;
  updateSymptomDetail: (id: string, detail: Partial<SymptomDetail>) => void;
  setFindings: (value: string) => void;
  setDiagnosis: (value: string) => void;
  setMedicines: (medicines: ConsultationMedicine[]) => void;
  addMedicine: (medicine: Omit<ConsultationMedicine, "id">) => void;
  updateMedicine: (id: string, patch: Partial<ConsultationMedicine>) => void;
  removeMedicine: (id: string) => void;
  setInvestigations: (value: string) => void;
  setInstructions: (value: string) => void;
  setProcedures: (value: string) => void;
  setFollowUp: (patch: {
    follow_up_interval?: number;
    follow_up_unit?: "days" | "months";
    follow_up_date?: string;
    follow_up_reason?: string;
    follow_up_early_if_persist?: boolean;
  }) => void;
  setDraftStatus: (status: DraftStatus) => void;
  setSelectedSymptomId: (id: string | null) => void;
  setMedicalHistory: (value: string) => void;
  setVitals: (vitals: Partial<ConsultationVitals>) => void;
  setPrescriptionNotes: (value: string) => void;
  setDoctorNotes: (value: string) => void;
  setConsultationType: (type: ConsultationWorkflowType) => void;
  /** Schema setters */
  setSymptomsSchema: (schema: SymptomsSectionSchema) => void;
  getSymptomSchemaForLabel: (label: string) => SymptomItemSchema | undefined;
  setFindingsSchema: (schema: FindingsSectionSchema) => void;
  getFindingSchemaForLabel: (label: string) => FindingItemSchema | undefined;
  setDiagnosisSchema: (schema: DiagnosisSectionSchema) => void;
  getDiagnosisSchemaForLabel: (label: string) => DiagnosisItemSchema | undefined;
  setPrimaryDiagnosis: (id: string) => void;
  setEncounterId: (id: string | null) => void;
  setInstructionsSchema: (schema: InstructionsSectionSchema | null) => void;
  setInstructionsList: (list: EncounterInstructionRow[]) => void;
  setConsultationFinalized: (v: boolean) => void;
  getInstructionTemplateByKeyOrId: (keyOrId: string) => InstructionItemSchema | undefined;
  reset: () => void;
  // Section items (reusable pattern)
  getSectionItems: (section: ConsultationSectionType) => ConsultationSectionItem[];
  addSectionItem: (section: ConsultationSectionType, item: ConsultationSectionItem) => void;
  removeSectionItem: (section: ConsultationSectionType, id: string) => void;
  updateSectionItemDetail: (
    section: ConsultationSectionType,
    id: string,
    detail: Partial<SectionItemDetail>
  ) => void;
  setSelectedDetail: (payload: SelectedDetailPayload) => void;
};

const SECTION_TYPES: ConsultationSectionType[] = [
  "symptoms",
  "findings",
  "diagnosis",
  "medicines",
  "investigations",
  "instructions",
];

const emptySectionItems = () =>
  SECTION_TYPES.reduce(
    (acc, t) => {
      acc[t] = [];
      return acc;
    },
    {} as Record<ConsultationSectionType, ConsultationSectionItem[]>
  );

export const useConsultationStore = create<ConsultationStore>((set, get) => ({
  ...DEFAULT_CONSULTATION_STATE,
  draftStatus: { savedAt: null, message: null },
  selectedSymptomId: null,
  sectionItems: emptySectionItems(),
  selectedDetail: null,
  symptomsSchema: null,
  symptomSchemaByKey: {},
  findingsSchema: null,
  findingSchemaByKey: {},
  diagnosisSchema: null,
  diagnosisSchemaByKey: {},
  encounterId: null,
  instructionsSchema: null,
  instructionsList: [],
  consultationFinalized: false,

  setSymptoms: (symptoms) => set({ symptoms }),
  addSymptom: (symptom) =>
    set((s) => ({ symptoms: [...s.symptoms, symptom] })),
  removeSymptom: (id) =>
    set((s) => ({
      symptoms: s.symptoms.filter((x) => x.id !== id),
      selectedSymptomId: s.selectedSymptomId === id ? null : s.selectedSymptomId,
    })),
  updateSymptomDetail: (id, detail) =>
    set((s) => ({
      symptoms: s.symptoms.map((x) =>
        x.id === id
          ? { ...x, detail: { ...(x.detail ?? {}), ...detail } }
          : x
      ),
    })),

  setFindings: (value) => set({ findings: value }),
  setDiagnosis: (value) => set({ diagnosis: value }),

  setMedicines: (medicines) => set({ medicines }),
  addMedicine: (medicine) =>
    set((s) => ({
      medicines: [
        ...s.medicines,
        { ...medicine, id: `med-${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ],
    })),
  updateMedicine: (id, patch) =>
    set((s) => ({
      medicines: s.medicines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  removeMedicine: (id) =>
    set((s) => ({ medicines: s.medicines.filter((m) => m.id !== id) })),

  setInvestigations: (value) => set({ investigations: value }),
  setInstructions: (value) => set({ instructions: value }),
  setProcedures: (value) => set({ procedures: value }),
  setFollowUp: (patch) =>
    set((s) => ({
      follow_up_interval: patch.follow_up_interval ?? s.follow_up_interval,
      follow_up_unit: patch.follow_up_unit ?? s.follow_up_unit,
      follow_up_date: patch.follow_up_date ?? s.follow_up_date,
      follow_up_reason: patch.follow_up_reason ?? s.follow_up_reason,
      follow_up_early_if_persist:
        patch.follow_up_early_if_persist ?? s.follow_up_early_if_persist,
    })),

  setDraftStatus: (draftStatus) => set({ draftStatus }),
  setSelectedSymptomId: (selectedSymptomId) => set({ selectedSymptomId }),
  setMedicalHistory: (medicalHistory) => set({ medicalHistory }),
  setVitals: (patch) =>
    set((s) => ({ vitals: { ...s.vitals, ...patch } })),
  setPrescriptionNotes: (prescriptionNotes) => set({ prescriptionNotes }),
  setDoctorNotes: (doctorNotes) => set({ doctorNotes }),
  setConsultationType: (consultationType) => set({ consultationType }),

  setSymptomsSchema: (schema) =>
    set(() => {
      const byKey: Record<string, SymptomItemSchema> = {};
      for (const item of schema.items) {
        byKey[item.key] = item;
      }
      return { symptomsSchema: schema, symptomSchemaByKey: byKey };
    }),

  getSymptomSchemaForLabel: (label) => {
    const { symptomsSchema } = get();
    if (!symptomsSchema) return undefined;
    const lower = label.trim().toLowerCase();
    return symptomsSchema.items.find(
      (item) =>
        item.display_name.toLowerCase() === lower ||
        item.key.toLowerCase() === lower
    );
  },

  setFindingsSchema: (schema) =>
    set(() => {
      const byKey: Record<string, FindingItemSchema> = {};
      for (const item of schema.items) {
        byKey[item.key] = item;
      }
      return { findingsSchema: schema, findingSchemaByKey: byKey };
    }),

  getFindingSchemaForLabel: (label) => {
    const { findingsSchema } = get();
    if (!findingsSchema) return undefined;
    const lower = label.trim().toLowerCase();
    return findingsSchema.items.find(
      (item) =>
        item.display_name.toLowerCase() === lower ||
        item.key.toLowerCase() === lower
    );
  },

  setDiagnosisSchema: (schema) =>
    set(() => {
      const byKey: Record<string, DiagnosisItemSchema> = {};
      for (const item of schema.items) {
        byKey[item.key] = item;
      }
      return { diagnosisSchema: schema, diagnosisSchemaByKey: byKey };
    }),

  getDiagnosisSchemaForLabel: (label) => {
    const { diagnosisSchema } = get();
    if (!diagnosisSchema) return undefined;
    const lower = label.trim().toLowerCase();
    return diagnosisSchema.items.find(
      (item) =>
        item.display_name.toLowerCase() === lower ||
        item.key.toLowerCase() === lower
    );
  },

  setPrimaryDiagnosis: (id) =>
    set((s) => {
      const items = s.sectionItems["diagnosis"] ?? [];
      const current = items.find((item) => item.id === id);
      const isCurrentlyPrimary = current?.detail?.primary === true;

      const updated = items.map((item) => ({
        ...item,
        detail: {
          ...(item.detail ?? {}),
          // If already primary, clicking again clears primary (all false).
          primary: isCurrentlyPrimary ? false : item.id === id,
        },
      }));

      return {
        sectionItems: {
          ...s.sectionItems,
          diagnosis: updated,
        },
      };
    }),

  setEncounterId: (id) => set({ encounterId: id }),
  setInstructionsSchema: (schema) => set({ instructionsSchema: schema }),
  setInstructionsList: (list) => set({ instructionsList: list }),
  setConsultationFinalized: (v) => set({ consultationFinalized: v }),
  getInstructionTemplateByKeyOrId: (keyOrId) => {
    const { instructionsSchema } = get();
    if (!instructionsSchema?.items) return undefined;
    return instructionsSchema.items.find(
      (item) => item.key === keyOrId || item.id === keyOrId
    );
  },

  getSectionItems: (section) => get().sectionItems[section] ?? [],
  addSectionItem: (section, item) =>
    set((s) => {
      const current = s.sectionItems[section] ?? [];
      if (current.some((i) => i.id === item.id)) return s;
      return {
        sectionItems: {
          ...s.sectionItems,
          [section]: [...current, item],
        },
      };
    }),
  removeSectionItem: (section, id) =>
    set((s) => {
      const next = (s.sectionItems[section] ?? []).filter((i) => i.id !== id);
      const selectedDetail =
        s.selectedDetail?.section === section && s.selectedDetail?.itemId === id
          ? null
          : s.selectedDetail;
      return {
        sectionItems: { ...s.sectionItems, [section]: next },
        selectedDetail,
      };
    }),
  updateSectionItemDetail: (section, id, detail) =>
    set((s) => ({
      sectionItems: {
        ...s.sectionItems,
        [section]: (s.sectionItems[section] ?? []).map((i) =>
          i.id === id
            ? { ...i, detail: { ...(i.detail ?? {}), ...detail } }
            : i
        ),
      },
    })),
  setSelectedDetail: (payload) => set({ selectedDetail: payload }),

  reset: () =>
    set({
      ...DEFAULT_CONSULTATION_STATE,
      draftStatus: { savedAt: null, message: null },
      selectedSymptomId: null,
      sectionItems: emptySectionItems(),
      selectedDetail: null,
      encounterId: null,
      instructionsSchema: null,
      instructionsList: [],
      consultationFinalized: false,
    }),
}));
